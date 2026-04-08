/**
 * 会议相关 API
 * 约定：列表与详情返回同一结构 MeetingRecord（见 types/meeting）
 */
import { apiClient } from '~/api/client'
import type { MeetingListQuery, MeetingRecord, TranscriptSegment } from '~/types/meeting'
import type { ProcessStatus } from '~/constants/meeting'

/** mock 网络延迟（毫秒），用于观察 loading */
export const mockDelay = 800

/** mock 随机失败概率 0~1，用于压测错误态 UI */
export const mockFailRate = 0.1

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
    name: '示例：季度例会（点此详情验证路由）',
    fileUrl: 'file://sample-1/meeting.mp4',
    transcriptStatus: 'success',
    summaryStatus: 'processing',
    transcript: [
      { id: 'sample-1-1', speaker: '主持人', startSec: 0, endSec: 24, text: '大家好，我们开始季度例会。' },
      { id: 'sample-1-2', speaker: '产品', startSec: 25, endSec: 58, text: '本季度核心目标是交付会议 AI 助手 P0。' }
    ],
    summary: ''
  },
  'sample-2': {
    id: 'sample-2',
    name: '示例：项目复盘会',
    fileUrl: 'file://sample-2/meeting.mp4',
    transcriptStatus: 'failed',
    summaryStatus: 'not_started',
    transcript: [],
    summary: ''
  },
  'sample-3': {
    id: 'sample-3',
    name: '示例：研发周会',
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
 * 更新转写状态与内容（仅 mock 内存，用于前端联动演示）
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
