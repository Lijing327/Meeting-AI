<template>
  <div />
</template>

<script setup lang="ts">
/**
 * 首页：进入系统后默认跳到会议列表
 */
await navigateTo('/meeting/list', { replace: true })
</script>
