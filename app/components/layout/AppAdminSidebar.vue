<template>
  <div style="padding: 16px 12px; border-bottom: 1px solid var(--n-border-color)">
    <n-text strong style="font-size: 15px; letter-spacing: 0.02em">会议AI助手</n-text>
    <n-text depth="3" style="display: block; font-size: 12px; margin-top: 4px">智能会议管理</n-text>
  </div>
  <div style="flex: 1; padding: 12px 8px">
    <!-- 模块自带菜单：使用 NuxtLink 与 Iconify 图标名 -->
    <NaiveMenuLink :routes="menuRoutes" />
  </div>
</template>

<script setup lang="ts">
/**
 * 侧栏：主导航（会议列表、开始录制）
 * 图标使用 Iconify 命名：集合:图标
 */
const menuRoutes = [
  { label: '会议列表', to: '/meeting/list', icon: 'mdi:format-list-bulleted' },
  { label: '会议录制', to: '/meeting/record', icon: 'mdi:microphone' }
]
</script>
