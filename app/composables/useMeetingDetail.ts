import type { MeetingRecord, MeetingStatusSnapshot, TranscriptSegment } from '~/types/meeting'
import type { ProcessStatus } from '~/constants/meeting'
import { fetchMeetingDetail } from '~/api/meeting'

/** 详情初始化结果：区分不存在与请求失败，便于详情页展示 Alert */
export type MeetingDetailInitResult =
  | { ok: true; data: MeetingRecord }
  | { ok: false; reason: 'not_found' | 'fetch_failed' }

/**
 * 会议详情：列表快照兜底 + 状态归一化 + 业务规则集中
 * 规则：
 * - 转写未成功时，纪要不允许为 success
 * - 转写标记 success 但 transcript 为空时，视为 not_started，避免假成功
 * - 重新解析转写时，应同步清空纪要（见 beginTranscriptParse）
 */
export function useMeetingDetail() {
  const snapshotMap = useState<Record<string, MeetingStatusSnapshot>>('meeting-status-snapshot-map', () => ({}))

  function setSnapshot(snapshot: MeetingStatusSnapshot): void {
    snapshotMap.value[snapshot.id] = snapshot
  }

  function getSnapshot(id: string): MeetingStatusSnapshot | null {
    return snapshotMap.value[id] ?? null
  }

  /** 冲突修正与缺省填充 */
  function normalizeState(record: MeetingRecord): MeetingRecord {
    const transcriptStatus = record.transcriptStatus ?? 'not_started'
    let summaryStatus = record.summaryStatus ?? 'not_started'
    const transcript = record.transcript ?? []
    let summary = record.summary ?? ''

    if (transcriptStatus !== 'success' && summaryStatus === 'success') {
      summaryStatus = 'not_started'
      summary = ''
    }

    const normalizedTranscriptStatus: ProcessStatus =
      transcriptStatus === 'success' && transcript.length === 0 ? 'not_started' : transcriptStatus

    return {
      ...record,
      transcriptStatus: normalizedTranscriptStatus,
      summaryStatus,
      transcript,
      summary
    }
  }

  /** 是否允许生成纪要：转写成功且有条目 */
  function canGenerateSummary(record: MeetingRecord): boolean {
    const normalized = normalizeState(record)
    return normalized.transcriptStatus === 'success' && normalized.transcript.length > 0
  }

  /** 演示用转写片段（不接真实 ASR） */
  function createDemoTranscriptSegments(id: string): TranscriptSegment[] {
    return [
      { id: `${id}-1`, speaker: '主持人', startSec: 0, endSec: 26, text: '大家好，我们开始今天的项目周会。' },
      { id: `${id}-2`, speaker: '产品', startSec: 27, endSec: 58, text: '本周重点是会议 AI 助手 P0 页面链路。' },
      { id: `${id}-3`, speaker: '研发', startSec: 59, endSec: 92, text: '列表、详情与纪要展示已经进入联调阶段。' }
    ]
  }

  /** 开始转写解析：进入 processing，清空转写结果并重置纪要 */
  function beginTranscriptParse(record: MeetingRecord): MeetingRecord {
    return normalizeState({
      ...record,
      transcriptStatus: 'processing',
      transcript: [],
      summaryStatus: 'not_started',
      summary: ''
    })
  }

  /** 转写成功 */
  function completeTranscriptParse(record: MeetingRecord, segments: TranscriptSegment[]): MeetingRecord {
    return normalizeState({
      ...record,
      transcriptStatus: 'success',
      transcript: segments
    })
  }

  /** 转写失败 */
  function failTranscriptParse(record: MeetingRecord): MeetingRecord {
    return normalizeState({
      ...record,
      transcriptStatus: 'failed',
      transcript: []
    })
  }

  /** 开始生成纪要 */
  function beginSummaryGenerate(record: MeetingRecord): MeetingRecord {
    return normalizeState({
      ...record,
      summaryStatus: 'processing',
      summary: ''
    })
  }

  /** 纪要成功 */
  function completeSummaryGenerate(record: MeetingRecord, text: string): MeetingRecord {
    return normalizeState({
      ...record,
      summaryStatus: 'success',
      summary: text
    })
  }

  /** 纪要失败 */
  function failSummaryGenerate(record: MeetingRecord): MeetingRecord {
    return normalizeState({
      ...record,
      summaryStatus: 'failed',
      summary: ''
    })
  }

  /** 演示用纪要正文 */
  function createDemoSummaryMarkdown(): string {
    return [
      '## 会议主题',
      '- 会议 AI 助手 P0 演示链路推进',
      '',
      '## 关键结论',
      '- 先打通列表 -> 详情 -> 转写 -> 纪要闭环',
      '- 录制能力后置，先保证状态机和展示稳定',
      '',
      '## 待办',
      '1. 完成详情页状态驱动交互',
      '2. 列表补充解析/纪要状态字段',
      '3. 对接真实后端接口替换 mock'
    ].join('\n')
  }

  async function initDetail(id: string): Promise<MeetingDetailInitResult> {
    try {
      const detail = await fetchMeetingDetail(id)
      if (detail) {
        return { ok: true, data: normalizeState(detail) }
      }

      const snapshot = getSnapshot(id)
      if (!snapshot) {
        return { ok: false, reason: 'not_found' }
      }

      const fallback: MeetingRecord = {
        id,
        name: `会议 ${id}`,
        fileUrl: '',
        transcriptStatus: snapshot.transcriptStatus ?? 'not_started',
        summaryStatus: snapshot.summaryStatus ?? 'not_started',
        transcript: [],
        summary: ''
      }
      return { ok: true, data: normalizeState(fallback) }
    } catch {
      return { ok: false, reason: 'fetch_failed' }
    }
  }

  return {
    setSnapshot,
    getSnapshot,
    initDetail,
    normalizeState,
    canGenerateSummary,
    beginTranscriptParse,
    completeTranscriptParse,
    failTranscriptParse,
    beginSummaryGenerate,
    completeSummaryGenerate,
    failSummaryGenerate,
    createDemoTranscriptSegments,
    createDemoSummaryMarkdown
  }
}
