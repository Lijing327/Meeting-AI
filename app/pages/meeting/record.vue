<template>
  <n-space vertical :size="16">
    <n-card title="会议录制" segmented>
      <template #header-extra>
        <n-space align="center" :size="8">
          <n-tag v-if="isRecording" type="error" :bordered="false">录制中 {{ recordSeconds }}s</n-tag>
          <n-tag v-else-if="isRequestingPermission" type="warning" :bordered="false">权限申请中…</n-tag>
          <n-tag v-else-if="recordedFile" type="success" :bordered="false">已生成待上传文件</n-tag>
          <n-tag v-else type="info" :bordered="false">录制与上传 · P0-6</n-tag>
        </n-space>
      </template>

      <n-alert v-if="!isSupported" type="error" title="当前环境无法录制" show-icon style="margin-bottom: 16px">
        请使用支持 MediaRecorder 的桌面浏览器（推荐 Chrome / Edge），并确保通过 HTTPS 或 localhost 访问。
      </n-alert>

      <n-alert
        v-if="errorCode"
        type="error"
        :title="`录制异常（${errorCode}）`"
        show-icon
        closable
        style="margin-bottom: 16px"
        @close="clearError"
      >
        {{ errorMessage }}
      </n-alert>

      <n-alert v-if="uploadError" type="error" title="上传失败" show-icon closable style="margin-bottom: 16px" @close="uploadError = ''">
        {{ uploadError }}
      </n-alert>

      <n-grid :cols="1" responsive="screen" :x-gap="16" :y-gap="16">
        <n-gi>
          <n-card title="会议名称" embedded size="small">
            <n-form label-placement="top">
              <n-form-item label="会议名称（必填，用于生成文件名）" :show-feedback="false">
                <n-input
                  v-model:value="meetingName"
                  placeholder="请输入本次会议名称"
                  :disabled="isRecording || isRequestingPermission"
                  maxlength="80"
                  show-count
                />
              </n-form-item>
            </n-form>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card title="画面预览" embedded size="small">
            <n-space vertical :size="12">
              <n-text v-if="!isPreviewing && !recordedPreviewUrl" depth="2">
                开启预览后，将显示摄像头实时画面；停止录制后将在此区域回放本次录制内容。
              </n-text>

              <div class="video-wrap">
                <video
                  v-show="isPreviewing && !recordedPreviewUrl"
                  ref="liveVideoRef"
                  class="video-el"
                  playsinline
                  muted
                  autoplay
                />
                <video
                  v-show="Boolean(recordedPreviewUrl)"
                  ref="playbackVideoRef"
                  class="video-el"
                  playsinline
                  controls
                  :src="recordedPreviewUrl || undefined"
                />
              </div>
            </n-space>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card title="操作" embedded size="small">
            <n-space vertical :size="12">
              <n-space :size="10" wrap>
                <n-button
                  type="primary"
                  :loading="isRequestingPermission"
                  :disabled="!isSupported || isRecording || Boolean(recordedFile)"
                  @click="onStartPreview"
                >
                  开启预览（申请权限）
                </n-button>
                <n-button type="error" :disabled="!canStartRecording" @click="onStartRecording">开始录制</n-button>
                <n-button :disabled="!isRecording" @click="onStopRecording">停止录制</n-button>
                <n-button
                  v-if="hasRecordingResult"
                  :disabled="isRecording || isRequestingPermission"
                  @click="onRerecord"
                >
                  重新录制
                </n-button>
              </n-space>

              <n-alert v-if="!meetingName.trim() && isSupported" type="warning" title="请填写会议名称">
                未填写会议名称时无法开始录制。
              </n-alert>

              <n-divider style="margin: 8px 0" />

              <n-descriptions
                v-if="recordedFile"
                label-placement="left"
                :column="1"
                bordered
                size="small"
                title="待上传文件信息"
              >
                <n-descriptions-item label="文件名">
                  <n-text code>{{ recordedFile.name }}</n-text>
                </n-descriptions-item>
                <n-descriptions-item label="大小">
                  {{ formatFileSize(recordedFile.size) }}
                </n-descriptions-item>
                <n-descriptions-item label="MIME">
                  {{ recordedFile.type || '未知' }}
                </n-descriptions-item>
              </n-descriptions>

              <n-button
                type="primary"
                block
                :loading="isUploading"
                :disabled="!recordedFile || isUploading || isRecording || isRequestingPermission"
                @click="onUploadRecording"
              >
                上传视频
              </n-button>
              <n-text depth="3" style="font-size: 12px">
                使用 FormData 提交 file + name；成功后跳转会议详情。失败可保留录制结果并重试。
              </n-text>
            </n-space>
          </n-card>
        </n-gi>
      </n-grid>

      <n-divider />

      <n-space>
        <n-button tertiary @click="goList">返回会议列表</n-button>
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import { uploadMeetingRecord } from '~/api/meeting'
import { useMeetingRecorder } from '~/composables/useMeetingRecorder'

definePageMeta({
  layout: 'default'
})

const router = useRouter()
const message = useMessage()

/** 上传失败说明（保留 recordedFile，允许重试） */
const uploadError = ref('')
const isUploading = ref(false)

const meetingName = ref('')
const liveVideoRef = ref<HTMLVideoElement | null>(null)
const playbackVideoRef = ref<HTMLVideoElement | null>(null)

const {
  isSupported,
  isRequestingPermission,
  isPreviewing,
  isRecording,
  recordSeconds,
  recordedFile,
  recordedPreviewUrl,
  errorCode,
  errorMessage,
  startPreview,
  startRecording,
  stopRecording,
  resetForRerecord,
  bindPreviewToVideo,
  clearError
} = useMeetingRecorder()

bindPreviewToVideo(liveVideoRef)

/** 未填名称、未预览、权限中、已录制中 → 不可点「开始录制」 */
const canStartRecording = computed(
  () =>
    isSupported.value &&
    Boolean(meetingName.value.trim()) &&
    isPreviewing.value &&
    !isRecording.value &&
    !isRequestingPermission.value &&
    !recordedPreviewUrl.value
)

/** 仅在有成品时展示「重新录制」 */
const hasRecordingResult = computed(() => Boolean(recordedFile.value))

async function onStartPreview(): Promise<void> {
  clearError()
  await startPreview()
  if (errorCode.value) {
    message.error(errorMessage.value)
    return
  }
  message.success('预览已开启，请点击「开始录制」')
}

function onStartRecording(): void {
  if (!meetingName.value.trim()) {
    message.warning('请先填写会议名称')
    return
  }
  clearError()
  startRecording()
  if (errorCode.value) {
    message.error(errorMessage.value)
    return
  }
  message.info('录制中，结束时请点击「停止录制」')
}

async function onStopRecording(): Promise<void> {
  if (!meetingName.value.trim()) {
    message.warning('请先填写会议名称')
    return
  }
  clearError()
  await stopRecording(meetingName.value)
  if (errorCode.value) {
    message.error(errorMessage.value)
    return
  }
  message.success('已停止录制，可预览下方视频并查看文件信息')
  await nextTick()
  playbackVideoRef.value?.load()
}

async function onRerecord(): Promise<void> {
  await resetForRerecord()
  clearError()
  uploadError.value = ''
  message.info('已清空本次录制，请重新「开启预览」后开始新的录制')
}

/**
 * 上传录制文件：成功后写入后端或 mockStore，并跳转详情形成闭环
 */
async function onUploadRecording(): Promise<void> {
  const file = recordedFile.value
  if (!file) {
    message.warning('请先完成录制')
    return
  }
  const name = meetingName.value.trim()
  if (!name) {
    message.warning('请填写会议名称')
    return
  }
  uploadError.value = ''
  isUploading.value = true
  try {
    const record = await uploadMeetingRecord({ file, name })
    message.success('上传成功，正在进入会议详情')
    await router.push(`/meeting/detail/${record.id}`)
  } catch (error: unknown) {
    const text =
      error instanceof Error
        ? error.message.includes('MOCK_RANDOM_FAILURE')
          ? '上传失败（mock 随机失败），请重试'
          : error.message
        : '上传失败，请稍后重试'
    uploadError.value = text
    message.error(text)
    console.error('uploadMeetingRecord', error)
  } finally {
    isUploading.value = false
  }
}

function goList(): void {
  router.push('/meeting/list')
}

/** 字节 → 可读大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

</script>

<style scoped>
.video-wrap {
  width: 100%;
  max-width: 720px;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-el {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
</style>
