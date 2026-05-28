# gpt-auto-register

**⚠️ 重要警告**：本项目**仅供本地个人学习和技术研究使用**。
自动化注册 OpenAI 账号可能违反 OpenAI 服务条款，请严格遵守法律法规。
作者不承担任何法律责任。**严禁用于商业或大规模注册**。

## 项目特点
- 本地账号任务管理与状态追踪
- 支持代理字段、接码邮箱配置和队列状态观察
- 不再依赖外部指纹浏览器或 token 导出流程
- Docker Compose 一键部署

## 快速启动

1. `cp .env.example .env`
2. 按需配置代理池和接码邮箱参数
3. `docker compose up -d --build`
4. 打开 http://localhost:3100

**详细文档见下方文件**
