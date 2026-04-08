<template>
  <n-space vertical :size="16">
    <n-card title="会议录制" segmented>
      <template #header-extra>
        <n-tag type="warning" :bordered="false">骨架页面 · 无真实采集</n-tag>
      </template>

      <n-grid :cols="2" :x-gap="16" responsive="screen">
        <n-gi span="2 m:1">
          <n-card title="录制控制" embedded size="small">
            <n-space vertical :size="12">
              <n-text depth="2">后续将对接浏览器录制（如 MediaRecorder）或推流 SDK，此处仅占位。</n-text>
              <n-space>
                <n-button type="error" disabled>开始录制（待实现）</n-button>
                <n-button disabled>暂停</n-button>
                <n-button disabled>结束并保存</n-button>
              </n-space>
            </n-space>
          </n-card>
        </n-gi>
        <n-gi span="2 m:1">
          <n-card title="会话信息" embedded size="small">
            <n-form label-placement="left" label-width="88">
              <n-form-item label="会议标题">
                <n-input placeholder="请输入会议标题（骨架）" disabled />
              </n-form-item>
              <n-form-item label="备注">
                <n-input type="textarea" placeholder="可选（骨架）" disabled />
              </n-form-item>
            </n-form>
          </n-card>
        </n-gi>
      </n-grid>

      <n-divider />

      <n-space>
        <n-button tertiary @click="goList">返回会议列表</n-button>
      </n-space>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default'
})

const router = useRouter()

function goList() {
  router.push('/meeting/list')
}
</script>
