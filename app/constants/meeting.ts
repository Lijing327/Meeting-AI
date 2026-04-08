/**
 * 会议异步任务状态（转写 / 纪要）
 * 与接口字段 transcriptStatus、summaryStatus 对齐
 */
export type ProcessStatus = 'not_started' | 'processing' | 'success' | 'failed'

/** 状态 → 展示文案（列表与详情统一使用，禁止页面内再写死映射） */
export const statusTextMap: Record<ProcessStatus, string> = {
  not_started: '未开始',
  processing: '处理中',
  success: '已完成',
  failed: '失败'
}

/** 状态 → Naive UI NTag 类型（统一从 map 取，避免页面分支散落） */
export const statusTagTypeMap: Record<
  ProcessStatus,
  'default' | 'info' | 'success' | 'warning' | 'error'
> = {
  not_started: 'default',
  processing: 'info',
  success: 'success',
  failed: 'error'
}

/** 取展示文案，缺省时视为未开始 */
export function getProcessStatusText(status: ProcessStatus | undefined): string {
  if (!status) return statusTextMap.not_started
  return statusTextMap[status]
}

/** 取标签类型 */
export function getProcessStatusTagType(status: ProcessStatus | undefined) {
  if (!status) return statusTagTypeMap.not_started
  return statusTagTypeMap[status]
}
