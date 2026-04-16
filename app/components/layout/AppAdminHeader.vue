<template>
  <div style="display: flex; align-items: center; justify-content: space-between; width: 100%">
    <div>
      <n-breadcrumb>
        <n-breadcrumb-item>首页</n-breadcrumb-item>
        <n-breadcrumb-item>{{ currentTitle }}</n-breadcrumb-item>
      </n-breadcrumb>
    </div>
    <n-space align="center" :size="12">
      <n-text depth="3" style="font-size: 13px">会议 AI 助手</n-text>
    </n-space>
  </div>
</template>

<script setup lang="ts">
/**
 * 顶栏：面包屑与右侧区域（可扩展用户、消息等）
 */
const route = useRoute()

// 根据路径生成简单面包屑末级标题
const currentTitle = computed(() => {
  const path = route.path
  if (path.startsWith('/meeting/list')) return '会议列表'
  if (path.startsWith('/meeting/record')) return '会议录制'
  if (path.startsWith('/meeting/detail')) return '会议详情'
  return '工作台'
})
</script>
