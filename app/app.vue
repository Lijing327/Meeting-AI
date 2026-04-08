<template>
  <!-- Naive UI 全局配置容器（主题、字体等由 nuxt.config 的 naiveui 注入） -->
  <NaiveConfig>
    <!-- 全局 Provider：统一支持 message / dialog / notification / loadingBar -->
    <n-loading-bar-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-message-provider>
            <NuxtLayout>
              <NuxtPage />
            </NuxtLayout>
          </n-message-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-loading-bar-provider>
  </NaiveConfig>
</template>

<script setup lang="ts">
// 根组件：仅负责挂载布局与页面出口
</script>
