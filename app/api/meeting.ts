/**
 * 会议相关 API
 * 约定：列表与详情返回同一结构 MeetingRecord（见 types/meeting）
 */
import { apiClient } from '~/api/client'
import type { MeetingListQuery, MeetingRecord, TranscriptSegment } from '~/types/meeting'
import type { ProcessStatus } from '~/constants/meeting'

/** mock 网络延迟（毫秒），用于观察 loading */
export const mockDelay = 800

/** 随机失败概率 0~1（开发环境用于压测错误态；生产构建为 0） */
export const mockFailRate = import.meta.dev ? 0.1 : 0

/** mock 转写任务阶段二耗时（processing → 结束） */
const transcriptMockJobMs = 1500

function meetingsPath(subPath: string = ''): string {
  if (!subPath) {
    return '/meetings'
  }
  const normalized = subPath.replace(/^\//, '')
  return `/meetings/${normalized}`
}

/** 统一延迟，模拟请求耗时 */
async function sleepMock(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, mockDelay))
}

/** 随机抛出失败，用于测试失败/重试 UI */
function maybeThrowMockFailure(): void {
  if (Math.random() < mockFailRate) {
    throw new Error('MOCK_RANDOM_FAILURE')
  }
}

/**
 * 统一 mock 数据：列表与详情同源，字段严格对齐 MeetingRecord
 */
const mockStore: Record<string, MeetingRecord> = {
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

function cloneRecord(record: MeetingRecord): MeetingRecord {
  return {
    ...record,
    transcript: record.transcript ? [...record.transcript] : [],
    summary: record.summary ?? ''
  }
}

function listFromMockStore(): MeetingRecord[] {
  return Object.values(mockStore).map((item) => cloneRecord(item))
}

/** 生成上传入库后的唯一 ID（mock） */
function createUploadRecordId(): string {
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * mock：上传成功后写入 mockStore，列表/详情与真实入库一致可读
 */
function mockUploadMeetingRecord(payload: { file: File; name: string }): MeetingRecord {
  const id = createUploadRecordId()
  const displayName = payload.name.trim()
  const record: MeetingRecord = {
    id,
    name: displayName,
    fileUrl: `upload://${id}/${encodeURIComponent(payload.file.name)}`,
    transcriptStatus: 'not_started',
    summaryStatus: 'not_started',
    transcript: [],
    summary: ''
  }
  mockStore[id] = record
  return cloneRecord(record)
}

/**
 * 上传录制文件并创建会议记录（FormData: file + name）
 * - 优先请求真实接口 POST /api/meetings/upload
 * - 失败或非 mock 环境则走 mock：写入 mockStore 并返回 MeetingRecord
 */
export async function uploadMeetingRecord(payload: { file: File; name: string }): Promise<MeetingRecord> {
  await sleepMock()
  const formData = new FormData()
  formData.append('file', payload.file)
  formData.append('name', payload.name.trim())

  try {
    maybeThrowMockFailure()
    const created = await apiClient<MeetingRecord>(`${meetingsPath()}/upload`, {
      method: 'POST',
      body: formData
    })
    const normalized: MeetingRecord = {
      id: created.id,
      name: created.name.trim(),
      fileUrl: created.fileUrl ?? '',
      transcriptStatus: created.transcriptStatus ?? 'not_started',
      summaryStatus: created.summaryStatus ?? 'not_started',
      transcript: Array.isArray(created.transcript) ? [...created.transcript] : [],
      summary: created.summary ?? ''
    }
    mockStore[normalized.id] = cloneRecord(normalized)
    return cloneRecord(normalized)
  } catch {
    maybeThrowMockFailure()
    return mockUploadMeetingRecord(payload)
  }
}

/**
 * 获取会议列表
 */
export async function fetchMeetingList(_query?: MeetingListQuery): Promise<MeetingRecord[]> {
  await sleepMock()
  try {
    const data = await apiClient<MeetingRecord[]>(meetingsPath())
    maybeThrowMockFailure()
    return data
  } catch {
    maybeThrowMockFailure()
    return listFromMockStore()
  }
}

/**
 * 获取会议详情
 */
export async function fetchMeetingDetail(id: string): Promise<MeetingRecord | null> {
  await sleepMock()
  try {
    const data = await apiClient<MeetingRecord>(meetingsPath(id))
    maybeThrowMockFailure()
    return data
  } catch {
    maybeThrowMockFailure()
    const hit = mockStore[id]
    return hit ? cloneRecord(hit) : null
  }
}

/**
 * 创建会话占位（后续录制接入）
 */
export async function createMeetingSession(_payload: { title?: string }): Promise<{ id: string } | null> {
  await sleepMock()
  try {
    const data = await apiClient<{ id: string }>(meetingsPath('sessions'), { method: 'POST', body: _payload })
    maybeThrowMockFailure()
    return data
  } catch {
    return null
  }
}

/**
 * 生成 mock 转写片段（4～5 段，便于演示时间轴）
 */
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
    },
    {
      id: `${prefix}-seg-4`,
      speaker: '',
      startSec: 79,
      endSec: 105,
      text: '未标注发言人时，界面会统一显示为「发言人」。'
    },
    {
      id: `${prefix}-seg-5`,
      speaker: '项目经理',
      startSec: 106,
      endSec: 140,
      text: '请大家确认排期与联调窗口，散会前我会在群里发会议纪要草案。'
    }
  ]
}

/**
 * mock：启动转写 — 重置纪要 → processing → 延迟 → success / failed（写回 mockStore）
 */
async function mockStartMeetingTranscript(meetingId: string): Promise<MeetingRecord> {
  const target = mockStore[meetingId]
  if (!target) {
    throw new Error('MEETING_NOT_FOUND')
  }

  patchMeetingSummary({
    id: meetingId,
    summaryStatus: 'not_started',
    summary: ''
  })
  patchMeetingTranscript({
    id: meetingId,
    transcriptStatus: 'processing',
    transcript: []
  })

  await new Promise<void>((resolve) => setTimeout(resolve, transcriptMockJobMs))

  try {
    maybeThrowMockFailure()
    patchMeetingTranscript({
      id: meetingId,
      transcriptStatus: 'success',
      transcript: buildMockTranscriptSegments(meetingId)
    })
  } catch {
    patchMeetingTranscript({
      id: meetingId,
      transcriptStatus: 'failed',
      transcript: []
    })
  }

  return cloneRecord(mockStore[meetingId])
}

/**
 * 启动转写（含重新解析：与后端约定同一语义，重新解析时重置纪要由服务端或 mock 侧完成）
 * POST /api/meetings/:id/transcript/start
 * 失败则走 mockStartMeetingTranscript
 */
export async function startMeetingTranscript(meetingId: string): Promise<MeetingRecord> {
  try {
    await sleepMock()
    maybeThrowMockFailure()
    const data = await apiClient<MeetingRecord>(`${meetingsPath(meetingId)}/transcript/start`, {
      method: 'POST'
    })
    const normalized: MeetingRecord = {
      id: meetingId,
      name: data.name?.trim() ?? mockStore[meetingId]?.name ?? '',
      fileUrl: data.fileUrl ?? mockStore[meetingId]?.fileUrl ?? '',
      transcriptStatus: data.transcriptStatus ?? 'not_started',
      summaryStatus: data.summaryStatus ?? 'not_started',
      transcript: Array.isArray(data.transcript) ? [...data.transcript] : [],
      summary: data.summary ?? ''
    }
    mockStore[meetingId] = cloneRecord(normalized)
    return cloneRecord(normalized)
  } catch {
    maybeThrowMockFailure()
    return await mockStartMeetingTranscript(meetingId)
  }
}

/**
 * 重新解析：与 start 共用同一入口（若后端拆分 endpoint，可在此替换为独立请求）
 */
export async function retryMeetingTranscript(meetingId: string): Promise<MeetingRecord> {
  return startMeetingTranscript(meetingId)
}

/**
 * 查询当前转写结果与状态（无轮询场景下可用于手动刷新）
 * GET /api/meetings/:id/transcript
 */
export async function fetchMeetingTranscript(meetingId: string): Promise<MeetingRecord | null> {
  await sleepMock()
  try {
    maybeThrowMockFailure()
    return await apiClient<MeetingRecord>(`${meetingsPath(meetingId)}/transcript`)
  } catch {
    maybeThrowMockFailure()
    const hit = mockStore[meetingId]
    return hit ? cloneRecord(hit) : null
  }
}

/**
 * 更新转写状态与内容（mockStore；供其它模块或扩展使用）
 */
export function patchMeetingTranscript(payload: {
  id: string
  transcriptStatus: ProcessStatus
  transcript?: TranscriptSegment[]
}): void {
  const target = mockStore[payload.id]
  if (!target) return
  target.transcriptStatus = payload.transcriptStatus
  target.transcript = payload.transcript ?? []
}

/**
 * 更新纪要状态与正文（仅 mock 内存）
 */
export function patchMeetingSummary(payload: {
  id: string
  summaryStatus: ProcessStatus
  summary?: string
}): void {
  const target = mockStore[payload.id]
  if (!target) return
  target.summaryStatus = payload.summaryStatus
  target.summary = payload.summary ?? ''
}
