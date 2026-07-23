# 本地开发

## 环境要求

- Node.js 20 或更高版本，CI 使用 Node.js 22；
- npm 10 或更高版本；
- Docker Desktop，用于启动本地 MongoDB。

## 首次启动

```bash
npm install
cp .env.example .env.local
docker compose up -d mongodb
npm run check-config
npm run create-admin -- \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password"
npm run seed-demo
npm run dev
```

打开 `http://localhost:3000`。

`.env.local` 中的 `AUTH_SECRET` 必须替换为本机生成的随机值：

```bash
openssl rand -hex 32
```

## 创建或检查管理员

```bash
npm run create-admin -- \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password"
```

脚本不会静默把已有普通用户提升为管理员，也不会重置已有管理员密码。

## 健康检查

浅检查不连接数据库：

```bash
curl http://localhost:3000/api/health
```

深度检查会连接 MongoDB 并执行 `ping`：

```bash
curl "http://localhost:3000/api/health?deep=1"
```

健康检查不会返回 MongoDB URI、认证密钥或 Provider 凭据。

## 质量检查

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

首次运行浏览器测试前安装 Chromium：

```bash
npx playwright install chromium
npm run test:e2e
```

## 当前限制

- 首页、课程目录、管理员登录、本地 MP4、资料下载和学习进度已经可运行；
- Local Storage 已实现，Console、Mock 和 None 是当前默认配置基线；
- 普通用户注册、邮箱验证、完整权限矩阵、订单和支付回调在后续阶段实现；
- OSS、SMTP、XorPay、FFmpeg、MPS、Sentry 和 Webhook 目前只允许配置识别，不提供可工作的 Adapter。
