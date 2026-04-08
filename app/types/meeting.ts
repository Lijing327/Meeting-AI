/**
 * 会议域类型：与后端接口契约对齐（P0）
 */
import type { ProcessStatus } from '~/constants/meeting'

export type { ProcessStatus } from '~/constants/meeting'

/** 语音转写单行（嵌套在 transcript 数组中） */
export interface TranscriptSegment {
  id: string
  /** 说话人标识 */
  speaker?: string
  /** 开始时间（秒） */
  startSec: number
  /** 结束时间（秒） */
  endSec: number
  /** 文本 */
  text: string
}

/**
 * 会议记录：列表与详情共用同一结构
 * 字段与接口约定一致，禁止 list/detail 各写一套
 */
export interface MeetingRecord {
  id: string
  /** 会议名称 */
  name: string
  /** 关联媒体文件地址（占位，录制接入后写入） */
  fileUrl: string
  transcriptStatus: ProcessStatus
  summaryStatus: ProcessStatus
  /** 转写内容：时间轴片段列表 */
  transcript: TranscriptSegment[]
  /** 纪要正文（如 Markdown） */
  summary: string
}

/** 列表点击进入详情时的轻量快照（仅兜底，query 不传大对象） */
export interface MeetingStatusSnapshot {
  id: string
  transcriptStatus?: ProcessStatus
  summaryStatus?: ProcessStatus
}

/** 分页查询参数（列表接口备用） */
export interface MeetingListQuery {
  page?: number
  pageSize?: number
  keyword?: string
}
