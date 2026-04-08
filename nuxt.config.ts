// https://nuxt.com/docs/api/configuration/nuxt-config
// 会议 AI 助手前端：Nuxt + Vue3 + TypeScript + Naive UI
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Naive UI 集成模块（含 SSR 样式、组件自动导入）
  modules: ['@bg-dev/nuxt-naiveui'],

  /**
   * Naive UI：全局主题与企业后台轻量风格
   * - light-only：后台固定浅色，避免多端暗色变量干扰
   * - themeConfig：在模块默认主题上覆盖主色与背景
   */
  naiveui: {
    colorModePreference: 'light-only',
    themeConfig: {
      shared: {
        common: {
          // 更易读的系统字体栈
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
          // 企业蓝主色
          primaryColor: '#2563eb',
          primaryColorHover: '#1d4ed8',
          primaryColorPressed: '#1e40af',
          borderRadius: '6px'
        }
      },
      light: {
        common: {
          // 页面浅灰底、内容区白底
          bodyColor: '#f0f2f5',
          cardColor: '#ffffff',
          textColor1: '#1f2937',
          textColor2: '#4b5563',
          borderColor: '#e5e7eb'
        },
        Layout: {
          color: '#f0f2f5',
          siderColor: '#ffffff',
          headerColor: '#ffffff'
        }
      }
    }
  },

  runtimeConfig: {
    public: {
      // 后端 API 基地址（可通过环境变量 NUXT_PUBLIC_API_BASE 覆盖）
      apiBase: '/api'
    }
  },

  app: {
    head: {
      title: '会议AI助手',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '会议录制、视频管理、语音转写与 AI 会议纪要' }
      ]
    }
  },

  css: ['~/assets/styles/global.css']
})
