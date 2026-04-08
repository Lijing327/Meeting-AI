/**
 * 全局 API 客户端
 * - 统一 baseURL 与超时配置
 * - 页面层不直接出现裸 /api 路径，降低误用为路由跳转的风险
 */
export const apiClient = $fetch.create({
  baseURL: '/api',
  timeout: 15_000
})
