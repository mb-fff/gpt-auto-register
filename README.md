# gpt-auto-register

**⚠️ 重要警告**：本项目**仅供本地个人学习和技术研究使用**。
自动化注册 OpenAI 账号可能违反 OpenAI 服务条款，请严格遵守法律法规。
作者不承担任何法律责任。**严禁用于商业或大规模注册**。

## 项目特点
- 使用 Dolphin Anty (优先) / GoLogin 指纹浏览器 API
- 全自动 OpenAI OAuth PKCE 流程
- 获取 refresh_token 供 Codex / 第三方客户端使用
- Docker Compose 一键部署

## 快速启动

1. 宿主机安装并运行 **Dolphin Anty** (Local API 端口 3001)
2. `cp .env.example .env`
3. `docker compose up -d --build`
4. 打开 http://localhost:3000

**详细文档见下方文件**