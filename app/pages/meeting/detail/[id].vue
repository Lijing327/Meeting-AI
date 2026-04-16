<template>
  <n-space vertical :size="16">
    <n-page-header @back="goBack">
      <template #title>
        <n-space align="center" :size="12">
          <span>会议详情</span>
          <n-tag size="small" type="info" :bordered="false">ID：{{ meetingId }}</n-tag>
          <n-text v-if="detailRecord" depth="2">{{ detailRecord.name }}</n-text>
        </n-space>
      </template>
      <template #extra>
        <n-button quaternary @click="goBack">返回列表</n-button>
      </template>
    </n-page-header>

    <!-- 接口/数据异常：明确提示，避免白屏 -->
    <n-alert v-if="initError === 'not_found'" type="warning" title="记录不存在" show-icon>
      当前 ID 在详情数据中不存在，请从列表重新进入或检查链接。
    </n-alert>
    <n-alert v-else-if="initError === 'fetch_failed'" type="error" title="详情加载失败" show-icon>
      <n-space vertical :size="12">
        <span>网络异常或服务暂时不可用，请稍后重试。</span>
        <div>
          <n-button size="small" type="primary" :loading="initializing" @click="initializeDetail">重试加载</n-button>
        </div>
      </n-space>
    </n-alert>

    <n-spin v-else :show="initializing" style="min-height: 220px">
      <!-- 单一根容器：避免部分环境下 Vite 对插槽多根 HMR 不稳定 -->
      <div>
        <n-card v-if="detailRecord">
        <n-tabs type="line" animated>
          <n-tab-pane name="video" tab="视频管理">
            <n-space vertical :size="12">
              <n-alert type="info" title="说明">
                在此预览会议关联的媒体文件；若尚未上传或绑定，将显示暂无内容。
              </n-alert>
              <n-empty v-if="!detailRecord.fileUrl" description="暂无媒体文件" />
              <n-card v-else embedded size="small" title="媒体地址">
                <n-text code>{{ detailRecord.fileUrl }}</n-text>
              </n-card>
            </n-space>
          </n-tab-pane>

          <n-tab-pane name="asr" tab="语音转写">
            <n-space vertical :size="12">
              <n-space justify="space-between" align="center">
                <n-space align="center" :size="8">
                  <n-text depth="2">转写状态</n-text>
                  <n-tag :type="getProcessStatusTagType(transcriptStatus)" :bordered="false">
                    {{ getProcessStatusText(transcriptStatus) }}
                  </n-tag>
                </n-space>
                <n-space :size="8">
                  <n-button
                    type="primary"
                    :loading="transcriptStatus === 'processing' || transcriptParsing"
                    :disabled="transcriptStatus === 'processing' || transcriptParsing"
                    @click="startTranscript"
                  >
                    开始解析
                  </n-button>
                  <n-button
                    :disabled="transcriptStatus === 'processing' || transcriptParsing"
                    @click="retryTranscript"
                  >
                    重新解析
                  </n-button>
                </n-space>
              </n-space>

              <n-alert v-if="transcriptStatus === 'not_started'" type="default" title="尚未开始解析">
                请点击「开始解析」生成语音转写结果。
              </n-alert>
              <n-alert v-else-if="transcriptStatus === 'processing'" type="info" title="解析进行中">
                正在处理语音并生成文本，请稍候。
              </n-alert>
              <n-alert v-else-if="transcriptStatus === 'failed'" type="error" title="解析失败">
                本次解析未成功，可点击「重新解析」重试。
              </n-alert>
              <template v-else-if="transcriptStatus === 'success'">
                <n-empty v-if="transcript.length === 0" description="转写已完成，但内容为空" />
                <n-card v-else embedded title="转写结果" size="small">
                  <n-timeline>
                    <n-timeline-item
                      v-for="item in transcript"
                      :key="item.id"
                      :title="formatRange(item.startSec, item.endSec)"
                      type="info"
                      :content="`${item.speaker ?? '发言人'}：${item.text}`"
                    />
                  </n-timeline>
                </n-card>
              </template>
            </n-space>
          </n-tab-pane>

          <n-tab-pane name="summary" tab="AI 会议纪要">
            <n-space vertical :size="12">
              <n-space justify="space-between" align="center">
                <n-space align="center" :size="8">
                  <n-text depth="2">纪要状态</n-text>
                  <n-tag :type="getProcessStatusTagType(summaryStatus)" :bordered="false">
                    {{ getProcessStatusText(summaryStatus) }}
                  </n-tag>
                </n-space>
                <n-space :size="8">
                  <n-button
                    type="primary"
                    :loading="summaryStatus === 'processing'"
                    :disabled="!canGenerateSummary || summaryStatus === 'processing' || summaryParsing"
                    @click="startSummary"
                  >
                    生成纪要
                  </n-button>
                  <n-button
                    :disabled="!canGenerateSummary || summaryStatus === 'processing' || summaryParsing"
                    @click="retrySummary"
                  >
                    重新生成纪要
                  </n-button>
                </n-space>
              </n-space>

              <n-alert
                v-if="!canGenerateSummary && transcriptStatus !== 'processing'"
                type="warning"
                title="暂不可生成纪要"
              >
                请先完成转写解析并确保有可用转写内容。
              </n-alert>
              <n-alert v-else-if="summaryStatus === 'not_started'" type="default" title="尚未生成纪要">
                请点击「生成纪要」根据转写生成摘要与待办。
              </n-alert>
              <n-alert v-else-if="summaryStatus === 'processing'" type="info" title="纪要生成中">
                正在整理关键信息，请稍候。
              </n-alert>
              <n-alert v-else-if="summaryStatus === 'failed'" type="error" title="纪要生成失败">
                可点击「重新生成纪要」重试。
              </n-alert>
              <template v-else-if="summaryStatus === 'success'">
                <n-empty v-if="!summary.trim()" description="纪要状态为已完成，但正文为空" />
                <n-card v-else embedded title="纪要预览" size="small">
                  <pre class="summary-preview">{{ summary }}</pre>
                </n-card>
              </template>
            </n-space>
          </n-tab-pane>
        </n-tabs>
        </n-card>

        <n-empty v-else-if="!initializing" description="暂无详情数据" />
      </div>
    </n-spin>
  </n-space>
</template>

<script setup lang="ts">
import { patchMeetingSummary } from '~/api/meeting'
import { getProcessStatusTagType, getProcessStatusText } from '~/constants/meeting'
import { useMeetingDetail } from '~/composables/useMeetingDetail'
import type { MeetingRecord } from '~/types/meeting'

definePageMeta({
  layout: 'default'
})

const route = useRoute()
const router = useRouter()
const message = useMessage()

const {
  initDetail,
  canGenerateSummary: canGenerateSummaryFn,
  beginTranscriptParse,
  runTranscriptParse,
  beginSummaryGenerate,
  completeSummaryGenerate,
  failSummaryGenerate,
  createDemoSummaryMarkdown
} = useMeetingDetail()

/** 路由参数中的会议 ID */
const meetingId = computed(() => String(route.params.id ?? ''))

/** 当前详情（单一数据源） */
const detailRecord = ref<MeetingRecord | null>(null)
/** 初始化异常：不存在 / 请求失败 */
const initError = ref<'not_found' | 'fetch_failed' | null>(null)
const initializing = ref(false)
/** 本地异步状态，避免重复点击 */
const transcriptParsing = ref(false)
const summaryParsing = ref(false)

const transcriptStatus = computed(() => detailRecord.value?.transcriptStatus ?? 'not_started')
const summaryStatus = computed(() => detailRecord.value?.summaryStatus ?? 'not_started')
const transcript = computed(() => detailRecord.value?.transcript ?? [])
const summary = computed(() => detailRecord.value?.summary ?? '')

const canGenerateSummary = computed(() =>
  detailRecord.value ? canGenerateSummaryFn(detailRecord.value) : false
)

function formatRange(startSec: number, endSec: number): string {
  return `${formatSec(startSec)} - ${formatSec(endSec)}`
}

function formatSec(sec: number): string {
  const mm = String(Math.floor(sec / 60)).padStart(2, '0')
  const ss = String(sec % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/** 首次/重试：拉取详情并写入 detailRecord */
async function initializeDetail(): Promise<void> {
  initializing.value = true
  initError.value = null
  detailRecord.value = null
  try {
    const result = await initDetail(meetingId.value)
    if (!result.ok) {
      initError.value = result.reason
      detailRecord.value = null
      if (result.reason === 'not_found') {
        message.warning('未找到该会议记录')
      } else {
        message.error('详情加载失败，请重试')
      }
      return
    }
    detailRecord.value = result.data
  } catch (error: unknown) {
    initError.value = 'fetch_failed'
    detailRecord.value = null
    message.error('详情初始化异常')
    console.error('initializeDetail', error)
  } finally {
    initializing.value = false
  }
}

/**
 * 开始解析 / 重新解析：调用接口后刷新详情状态
 */
async function startTranscript(): Promise<void> {
  if (!detailRecord.value) return
  if (transcriptStatus.value === 'processing') return
  transcriptParsing.value = true
  detailRecord.value = beginTranscriptParse(detailRecord.value)
  try {
    const next = await runTranscriptParse(meetingId.value)
    detailRecord.value = next
    if (next.transcriptStatus === 'success') {
      message.success('转写完成')
    } else if (next.transcriptStatus === 'failed') {
      message.error('转写失败，请点击「重新解析」重试')
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : ''
    if (errMsg === 'MEETING_NOT_FOUND') {
      message.warning('会议不存在，请返回列表')
    } else {
      message.error(errMsg.includes('MOCK_RANDOM_FAILURE') ? '转写暂时失败，请重试' : '转写任务失败，请重试')
    }
    await initializeDetail()
    console.error('startTranscript', error)
  } finally {
    transcriptParsing.value = false
  }
}

async function retryTranscript(): Promise<void> {
  await startTranscript()
}

async function startSummary(): Promise<void> {
  if (!detailRecord.value || !canGenerateSummary.value) {
    message.warning('请先完成转写解析')
    return
  }
  if (summaryStatus.value === 'processing') return
  summaryParsing.value = true
  detailRecord.value = beginSummaryGenerate(detailRecord.value)
  patchMeetingSummary({
    id: meetingId.value,
    summaryStatus: 'processing',
    summary: ''
  })
  try {
    await wait(900)
    const text = createDemoSummaryMarkdown()
    detailRecord.value = completeSummaryGenerate(detailRecord.value!, text)
    patchMeetingSummary({
      id: meetingId.value,
      summaryStatus: detailRecord.value.summaryStatus,
      summary: detailRecord.value.summary
    })
    message.success('纪要生成完成')
  } catch (error: unknown) {
    detailRecord.value = failSummaryGenerate(detailRecord.value!)
    patchMeetingSummary({
      id: meetingId.value,
      summaryStatus: 'failed',
      summary: ''
    })
    message.error('纪要生成失败')
    console.error('startSummary', error)
  } finally {
    summaryParsing.value = false
  }
}

async function retrySummary(): Promise<void> {
  await startSummary()
}

function goBack(): void {
  router.push('/meeting/list')
}

onMounted(async () => {
  await initializeDetail()
})

watch(
  () => route.params.id,
  async () => {
    await initializeDetail()
  }
)
</script>

<style scoped>
.summary-preview {
  margin: 0;
  font-family: inherit;
  white-space: pre-wrap;
  color: var(--n-text-color-2);
  font-size: 13px;
  line-height: 1.6;
}
</style>
