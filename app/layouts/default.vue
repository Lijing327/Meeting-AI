<template>
  <n-layout has-sider position="absolute" style="height: 100vh">
    <!-- 左侧：品牌 + 导航 -->
    <n-layout-sider
      bordered
      show-trigger
      collapse-mode="width"
      :collapsed-width="64"
      :width="240"
      :native-scrollbar="false"
      content-style="display: flex; flex-direction: column;"
    >
      <AppAdminSidebar />
    </n-layout-sider>

    <n-layout embedded>
      <!-- 顶栏：标题与简略操作区 -->
      <n-layout-header bordered style="height: 56px; padding: 0 20px; display: flex; align-items: center">
        <AppAdminHeader />
      </n-layout-header>

      <!-- 主内容 -->
      <n-layout-content
        embedded
        content-style="padding: 24px; background: var(--n-color)"
        :native-scrollbar="false"
      >
        <div class="admin-page-content">
          <slot />
        </div>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
/**
 * 默认后台布局：左侧可折叠侧栏 + 顶栏面包屑 + 主内容区。
 * 各业务页通过 NuxtPage 注入到本布局的内容插槽。
 */
import AppAdminHeader from '~/components/layout/AppAdminHeader.vue'
import AppAdminSidebar from '~/components/layout/AppAdminSidebar.vue'
</script>
