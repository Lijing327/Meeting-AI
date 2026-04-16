import type { MeetingRecord, MeetingStatusSnapshot } from '~/types/meeting'
import type { ProcessStatus } from '~/constants/meeting'
import { fetchMeetingDetail, startMeetingTranscript } from '~/api/meeting'

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
      '- 本次会议围绕产品与研发进度同步',
      '',
      '## 关键结论',
      '- 语音转写结果已就绪，可作为纪要生成依据',
      '- 后续可将纪要导出或同步至协作工具',
      '',
      '## 待办',
      '1. 确认下一版需求范围与排期',
      '2. 跟进转写与纪要的接口联调',
      '3. 收集试用反馈并迭代体验'
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

  /**
   * 执行转写任务（开始解析 / 重新解析均调用同一后端语义）
   * 返回归一化后的 MeetingRecord，便于详情页覆盖 detailRecord
   */
  async function runTranscriptParse(meetingId: string): Promise<MeetingRecord> {
    const raw = await startMeetingTranscript(meetingId)
    return normalizeState(raw)
  }

  return {
    setSnapshot,
    getSnapshot,
    initDetail,
    normalizeState,
    canGenerateSummary,
    beginTranscriptParse,
    runTranscriptParse,
    beginSummaryGenerate,
    completeSummaryGenerate,
    failSummaryGenerate,
    createDemoSummaryMarkdown
  }
}
