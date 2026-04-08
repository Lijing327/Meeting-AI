/**
 * 浏览器录制相关错误码（与 useMeetingRecorder 配合）
 */

export type RecorderErrorCode =
  | 'UNSUPPORTED_BROWSER'
  | 'PERMISSION_DENIED'
  | 'DEVICE_NOT_FOUND'
  | 'STREAM_INIT_FAILED'
  | 'RECORDER_INIT_FAILED'
  | 'RECORDING_FAILED'
  | 'EMPTY_RECORDING'

/** 错误码 → 默认中文说明（页面可结合 useMessage / Alert 展示） */
export const recorderErrorMessageMap: Record<RecorderErrorCode, string> = {
  UNSUPPORTED_BROWSER: '当前浏览器不支持摄像头/麦克风采集或 MediaRecorder，请使用最新版 Chrome / Edge。',
  PERMISSION_DENIED: '已拒绝摄像头或麦克风权限，请在浏览器设置中允许后刷新页面重试。',
  DEVICE_NOT_FOUND: '未找到可用的摄像头或麦克风设备，请连接设备后重试。',
  STREAM_INIT_FAILED: '音视频流初始化失败，请检查设备是否被其他应用占用。',
  RECORDER_INIT_FAILED: '录制器创建失败，可能与浏览器编码格式支持有关，请刷新后重试。',
  RECORDING_FAILED: '录制过程异常中断，请重试。',
  EMPTY_RECORDING: '未采集到有效录制数据，录制时间可能过短，请重新录制。'
}
