/**
 * 服务端会议内存库（开发/演示与 app/api/meeting.ts 中 mock 数据对齐）
 */
import { createError } from 'h3'

export type ProcessStatus = 'not_started' | 'processing' | 'success' | 'failed'

export interface TranscriptSegment {
  id: string
  speaker?: string
  startSec: number
  endSec: number
  text: string
}

export interface MeetingRecord {
  id: string
  name: string
  fileUrl: string
  transcriptStatus: ProcessStatus
  summaryStatus: ProcessStatus
  transcript: TranscriptSegment[]
  summary: string
}

function cloneRecord(record: MeetingRecord): MeetingRecord {
  return {
    ...record,
    transcript: record.transcript ? [...record.transcript] : [],
    summary: record.summary ?? ''
  }
}

const seed: Record<string, MeetingRecord> = {
  'sample-1': {
    id: 'sample-1',
    name: '季度经营例会',
    fileUrl: 'file://sample-1/meeting.mp4',
    transcriptStatus: 'success',
    summaryStatus: 'processing',
    transcript: [
      { id: 'sample-1-1', speaker: '主持人', startSec: 0, endSec: 24, text: '大家好，我们开始季度例会。' },
      { id: 'sample-1-2', speaker: '产品', startSec: 25, endSec: 58, text: '本季度核心目标是推进会议智能化与协作效率提升。' }
    ],
    summary: ''
  },
  'sample-2': {
    id: 'sample-2',
    name: '项目复盘会',
    fileUrl: 'file://sample-2/meeting.mp4',
    transcriptStatus: 'failed',
    summaryStatus: 'not_started',
    transcript: [],
    summary: ''
  },
  'sample-3': {
    id: 'sample-3',
    name: '研发周会',
    fileUrl: 'file://sample-3/meeting.mp4',
    transcriptStatus: 'not_started',
    summaryStatus: 'not_started',
    transcript: [],
    summary: ''
  }
}

const store: Record<string, MeetingRecord> = { ...seed }

export function listMeetings(): MeetingRecord[] {
  return Object.values(store).map((item) => cloneRecord(item))
}

export function getMeeting(id: string): MeetingRecord | undefined {
  const hit = store[id]
  return hit ? cloneRecord(hit) : undefined
}

export function putMeeting(record: MeetingRecord): void {
  store[record.id] = cloneRecord(record)
}

export function createUploadRecord(name: string, fileName: string): MeetingRecord {
  const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const record: MeetingRecord = {
    id,
    name: name.trim(),
    fileUrl: `upload://${id}/${encodeURIComponent(fileName)}`,
    transcriptStatus: 'not_started',
    summaryStatus: 'not_started',
    transcript: [],
    summary: ''
  }
  putMeeting(record)
  return cloneRecord(record)
}

export function buildMockTranscriptSegments(meetingId: string): TranscriptSegment[] {
  const prefix = meetingId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32)
  return [
    {
      id: `${prefix}-seg-1`,
      speaker: '主持人',
      startSec: 0,
      endSec: 18,
      text: '大家好，会议开始，今天我们同步本季度产品与研发进度。'
    },
    {
      id: `${prefix}-seg-2`,
      speaker: '产品',
      startSec: 19,
      endSec: 45,
      text: '当前已完成录制与上传能力，下一步重点是把转写与纪要链路打磨稳定。'
    },
    {
      id: `${prefix}-seg-3`,
      speaker: '研发',
      startSec: 46,
      endSec: 78,
      text: '转写与详情状态以后端为准，前端会按接口状态展示进度与结果。'
    }
  ]
}

const transcriptJobMs = 1500

/** 与前端 mock 一致：先 processing，再 success + 片段 */
export async function runTranscriptJob(meetingId: string): Promise<MeetingRecord> {
  const current = store[meetingId]
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Meeting not found' })
  }

  const processing: MeetingRecord = {
    ...current,
    summaryStatus: 'not_started',
    summary: '',
    transcriptStatus: 'processing',
    transcript: []
  }
  putMeeting(processing)

  await new Promise<void>((resolve) => setTimeout(resolve, transcriptJobMs))

  // 若并发修改过，仍以最新 store 为准合并
  const latest = store[meetingId]
  if (!latest) {
    throw createError({ statusCode: 404, statusMessage: 'Meeting not found' })
  }

  const done: MeetingRecord = {
    ...latest,
    transcriptStatus: 'success',
    transcript: buildMockTranscriptSegments(meetingId)
  }
  putMeeting(done)
  return cloneRecord(done)
}
