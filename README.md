# 会议 AI 助手（前端）

基于 [Nuxt](https://nuxt.com/) 的会议列表、录制上传、详情转写与纪要演示界面。

## 本地开发

安装依赖后启动开发服务（默认 `http://localhost:3000`）：

```bash
npm install
npm run dev
```

## 生产构建与预览

```bash
npm run build
npm run preview
```

构建产物默认位于 `.output`，可按 [Nuxt 部署文档](https://nuxt.com/docs/getting-started/deployment) 选择 Node 服务、静态托管或容器部署。若后端 API 与前端不同源，请在部署环境中配置反向代理，将 `/api` 转发到实际后端地址。

## 说明

- 列表与详情在无可用后端时会使用内存示例数据，便于联调前演示。
- 更多 Nuxt 用法见官方文档：[Getting Started](https://nuxt.com/docs/getting-started/introduction)。
