<template>
  <n-space vertical :size="16">
    <n-card title="会议列表" segmented>
      <template #header-extra>
        <n-space>
          <n-button type="primary" @click="goRecord">开始录制</n-button>
        </n-space>
      </template>

      <n-data-table
        :columns="columns"
        :data="displayData"
        :bordered="false"
        :loading="loading"
        :row-props="rowProps"
        size="small"
      />
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { MeetingRecord } from '~/types/meeting'
import { getProcessStatusText } from '~/constants/meeting'
import { fetchMeetingList } from '~/api/meeting'
import { useMeetingDetail } from '~/composables/useMeetingDetail'

definePageMeta({
  layout: 'default'
})

const router = useRouter()
const message = useMessage()
const { setSnapshot } = useMeetingDetail()

const loading = ref(false)
const tableData = ref<MeetingRecord[]>([])

/** 表格行视图：附加展示用文案字段 */
type MeetingRowView = MeetingRecord & {
  transcriptLabel: string
  summaryLabel: string
  actionText: string
}

const columns: DataTableColumns<MeetingRowView> = [
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  { title: '文件', key: 'fileUrl', ellipsis: { tooltip: true }, width: 220 },
  { title: '解析状态', key: 'transcriptLabel', width: 120 },
  { title: '纪要状态', key: 'summaryLabel', width: 120 },
  { title: '操作', key: 'actionText', width: 160 }
]

const displayData = computed<MeetingRowView[]>(() =>
  tableData.value.map((item) => ({
    ...item,
    transcriptLabel: getProcessStatusText(item.transcriptStatus),
    summaryLabel: getProcessStatusText(item.summaryStatus),
    actionText: '点击行查看详情'
  }))
)

function goDetail(id: string) {
  const hit = tableData.value.find((item) => item.id === id)
  if (hit) {
    setSnapshot({
      id: hit.id,
      transcriptStatus: hit.transcriptStatus,
      summaryStatus: hit.summaryStatus
    })
  }
  router.push(`/meeting/detail/${id}`)
}

function rowProps(row: MeetingRowView): Record<string, unknown> {
  return {
    style: 'cursor: pointer',
    onClick: () => goDetail(row.id)
  }
}

function goRecord() {
  router.push('/meeting/record')
}

onMounted(async () => {
  loading.value = true
  try {
    tableData.value = await fetchMeetingList()
  } catch (error: unknown) {
    message.error('加载会议列表失败，可能是 mock 随机失败，请重试')
    console.error('fetchMeetingList', error)
  } finally {
    loading.value = false
  }
})
</script>
