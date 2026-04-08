import type { Ref } from 'vue'
import type { RecorderErrorCode } from '~/constants/recorder'
import { recorderErrorMessageMap } from '~/constants/recorder'

/**
 * 会议本地录制（摄像头 + 麦克风）
 * - 封装 getUserMedia / MediaRecorder
 * - 统一资源释放与错误码，供 record.vue 只做 UI 绑定
 */
export function useMeetingRecorder() {
  /** 当前浏览器是否具备基础能力（仅客户端有效） */
  const isSupported = ref(false)
  /** 正在请求摄像头/麦克风权限 */
  const isRequestingPermission = ref(false)
  /** 是否已将实时流用于预览（Live） */
  const isPreviewing = ref(false)
  /** 是否正在录制 */
  const isRecording = ref(false)
  /** 录制时长（秒，录制过程中递增） */
  const recordSeconds = ref(0)
  /** 实时预览用的 MediaStream（停止录制或释放后会置空） */
  const previewStream = shallowRef<MediaStream | null>(null)
  /** 停止录制后得到的 Blob */
  const recordedBlob = shallowRef<Blob | null>(null)
  /** 待上传 File（由 Blob + 会议名生成） */
  const recordedFile = shallowRef<File | null>(null)
  /** 本地录制回放地址（object URL，须在适当时 revoke） */
  const recordedPreviewUrl = ref('')
  /** 最后一类错误码 */
  const errorCode = ref<RecorderErrorCode | null>(null)
  /** 人类可读错误说明（可与错误码同时展示） */
  const errorMessage = ref('')

  let mediaRecorder: MediaRecorder | null = null
  let mediaChunks: Blob[] = []
  /** 实际采用的 MIME，用于合成 Blob */
  let activeMimeType = 'video/webm'
  let recordTick: ReturnType<typeof setInterval> | null = null

  /** 检测 MediaRecorder 支持的 mime（优先 webm） */
  function pickRecorderMimeType(): string {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
      return ''
    }
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm'
    ]
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime
      }
    }
    return ''
  }

  /** 停止流上所有轨道，释放摄像头/麦克风占用 */
  function stopAllTracks(stream: MediaStream | null): void {
    stream?.getTracks().forEach((track) => {
      track.stop()
    })
  }

  /** 释放 object URL，避免泄漏 */
  function revokeRecordedPreviewUrl(): void {
    if (recordedPreviewUrl.value) {
      URL.revokeObjectURL(recordedPreviewUrl.value)
      recordedPreviewUrl.value = ''
    }
  }

  /** 清除计时器 */
  function clearRecordTimer(): void {
    if (recordTick !== null) {
      clearInterval(recordTick)
      recordTick = null
    }
  }

  function setError(code: RecorderErrorCode, detail?: string): void {
    errorCode.value = code
    errorMessage.value = detail?.trim() ? `${recorderErrorMessageMap[code]}（${detail}）` : recorderErrorMessageMap[code]
  }

  function clearError(): void {
    errorCode.value = null
    errorMessage.value = ''
  }

  /** 映射 getUserMedia / 一般异常到错误码 */
  function mapStreamError(err: unknown): void {
    if (err && typeof err === 'object' && 'name' in err) {
      const name = String((err as DOMException).name)
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('PERMISSION_DENIED')
        return
      }
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('DEVICE_NOT_FOUND')
        return
      }
      if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError('STREAM_INIT_FAILED')
        return
      }
    }
    setError('STREAM_INIT_FAILED', err instanceof Error ? err.message : '')
  }

  /** 清理录制器引用（不处理已生成的 Blob） */
  function resetMediaRecorderState(): void {
    mediaRecorder = null
    mediaChunks = []
    activeMimeType = 'video/webm'
  }

  /**
   * 全量释放：计时器、MediaRecorder、轨道、object URL、中间态
   * 用于：页面卸载、初始化失败、重新录制前
   */
  function releaseAllResources(): void {
    clearRecordTimer()
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
    } catch {
      /* 忽略 stop 异常，后续仍会清空引用 */
    }
    resetMediaRecorderState()
    stopAllTracks(previewStream.value)
    previewStream.value = null
    isPreviewing.value = false
    isRecording.value = false
    recordSeconds.value = 0
    revokeRecordedPreviewUrl()
    recordedBlob.value = null
    recordedFile.value = null
  }

  /** 重新检测浏览器支持（建议在客户端 setup 调用一次） */
  function refreshSupport(): void {
    if (import.meta.server) {
      isSupported.value = false
      return
    }
    isSupported.value = Boolean(
      navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
    )
  }

  /**
   * 申请摄像头+麦克风并开始实时预览
   */
  async function startPreview(): Promise<void> {
    refreshSupport()
    if (!isSupported.value) {
      setError('UNSUPPORTED_BROWSER')
      return
    }
    clearError()
    revokeRecordedPreviewUrl()
    recordedBlob.value = null
    recordedFile.value = null
    isRequestingPermission.value = true
    stopAllTracks(previewStream.value)
    previewStream.value = null
    isPreviewing.value = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: true
      })
      previewStream.value = stream
      isPreviewing.value = true
    } catch (err) {
      mapStreamError(err)
      stopAllTracks(previewStream.value)
      previewStream.value = null
      isPreviewing.value = false
    } finally {
      isRequestingPermission.value = false
    }
  }

  /**
   * 在已有预览流的前提下开始录制
   */
  function startRecording(): void {
    if (import.meta.server) return
    if (!previewStream.value || isRecording.value) {
      return
    }
    clearError()
    try {
      const mime = pickRecorderMimeType()
      mediaRecorder =
        mime && MediaRecorder.isTypeSupported(mime)
          ? new MediaRecorder(previewStream.value, { mimeType: mime })
          : new MediaRecorder(previewStream.value)
      activeMimeType = mediaRecorder.mimeType || mime || 'video/webm'
      mediaChunks = []
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          mediaChunks.push(event.data)
        }
      }
      mediaRecorder.onerror = () => {
        setError('RECORDING_FAILED')
        clearRecordTimer()
        isRecording.value = false
      }
      mediaRecorder.start(1000)
      isRecording.value = true
      recordSeconds.value = 0
      clearRecordTimer()
      recordTick = setInterval(() => {
        recordSeconds.value += 1
      }, 1000)
    } catch (err) {
      resetMediaRecorderState()
      isRecording.value = false
      clearRecordTimer()
      setError('RECORDER_INIT_FAILED', err instanceof Error ? err.message : '')
    }
  }

  /** 根据 Blob 类型推断文件扩展名 */
  function extFromBlobType(blob: Blob): string {
    const t = blob.type || activeMimeType
    if (t.includes('mp4')) return 'mp4'
    return 'webm'
  }

  /** 文件名安全化 */
  function sanitizeBaseName(name: string): string {
    const trimmed = name.trim() || 'meeting'
    return trimmed.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
  }

  /**
   * 停止录制：合成 Blob、生成预览 URL 与 File、释放摄像头
   * @param meetingName 用于生成 File 名（与页面「会议名称」一致）
   */
  async function stopRecording(meetingName: string): Promise<void> {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      return
    }
    const recorder = mediaRecorder
    await new Promise<void>((resolve) => {
      const onStop = (): void => {
        recorder.removeEventListener('stop', onStop)
        resolve()
      }
      recorder.addEventListener('stop', onStop)
      try {
        recorder.stop()
      } catch (err) {
        recorder.removeEventListener('stop', onStop)
        clearRecordTimer()
        isRecording.value = false
        setError('RECORDING_FAILED', err instanceof Error ? err.message : '')
        resolve()
      }
    })

    clearRecordTimer()
    isRecording.value = false

    try {
      const blob = new Blob(mediaChunks, {
        type: mediaChunks[0]?.type || activeMimeType || 'video/webm'
      })
      if (!blob.size) {
        setError('EMPTY_RECORDING')
        resetMediaRecorderState()
        stopAllTracks(previewStream.value)
        previewStream.value = null
        isPreviewing.value = false
        return
      }
      revokeRecordedPreviewUrl()
      recordedBlob.value = blob
      recordedPreviewUrl.value = URL.createObjectURL(blob)
      const ext = extFromBlobType(blob)
      const base = sanitizeBaseName(meetingName)
      recordedFile.value = new File([blob], `${base}.${ext}`, {
        type: blob.type || activeMimeType,
        lastModified: Date.now()
      })
    } catch (err) {
      setError('RECORDING_FAILED', err instanceof Error ? err.message : '')
    } finally {
      resetMediaRecorderState()
      stopAllTracks(previewStream.value)
      previewStream.value = null
      isPreviewing.value = false
    }
  }

  /**
   * 重新录制：清空成品与预览 URL，并释放残余轨道；需再次调用 startPreview
   */
  async function resetForRerecord(): Promise<void> {
    clearError()
    clearRecordTimer()
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
    } catch {
      /* noop */
    }
    resetMediaRecorderState()
    isRecording.value = false
    recordSeconds.value = 0
    revokeRecordedPreviewUrl()
    recordedBlob.value = null
    recordedFile.value = null
    stopAllTracks(previewStream.value)
    previewStream.value = null
    isPreviewing.value = false
  }

  /**
   * 将预览流绑定到 video 元素（需在组件内传入 ref）
   */
  function bindPreviewToVideo(videoRef: Ref<HTMLVideoElement | null>): void {
    watch(
      () => [previewStream.value, videoRef.value] as const,
      ([stream, el]) => {
        if (!el) return
        if (stream) {
          el.srcObject = stream
          void el.play().catch(() => {
            setError('STREAM_INIT_FAILED', '视频预览播放失败')
          })
        } else {
          el.srcObject = null
        }
      },
      { immediate: true }
    )
  }

  refreshSupport()

  onBeforeUnmount(() => {
    releaseAllResources()
  })

  return {
    isSupported,
    isRequestingPermission,
    isPreviewing,
    isRecording,
    recordSeconds,
    previewStream,
    recordedBlob,
    recordedFile,
    recordedPreviewUrl,
    errorCode,
    errorMessage,
    refreshSupport,
    startPreview,
    startRecording,
    stopRecording,
    resetForRerecord,
    releaseAllResources,
    bindPreviewToVideo,
    clearError
  }
}
