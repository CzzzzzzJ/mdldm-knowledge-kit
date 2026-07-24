# 本地开发

## 环境要求

- Node.js 20 或更高版本，CI 使用 Node.js 22；
- npm 10 或更高版本；
- Docker Desktop，用于启动本地 MongoDB；
- ffmpeg，用于生成完全合成的 Demo MP4。

## 首次启动

```bash
npm ci
cp .env.example .env.local
docker compose up -d mongodb
npm run check-config
npm run create-admin -- \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password-2026"
npm run seed-demo
npm run dev
```

打开 `http://localhost:3000`。

`.env.local` 中的 `AUTH_SECRET` 必须替换为本机生成的随机值：

```bash
openssl rand -hex 32
```

默认 `EMAIL_PROVIDER=console`。注册、验证和找回密码邮件不会真的发出，操作链接会打印在运行开发服务器的终端。

## 创建或检查管理员

```bash
npm run create-admin -- \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password-2026"
```

脚本不会静默把已有普通用户提升为管理员，也不会重置已有管理员密码。

## 创建邀请码

```bash
npm run create-invitation -- \
  --type membership \
  --duration-days 365 \
  --max-redemptions 1 \
  --admin-email "admin@example.com"
```

类型为 `course` 或 `series` 时还必须传入 `--target-id`。数据库只保存邀请码摘要。

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
npm run check
npm run release:audit
```

`npm run check` 会依次执行 Lint、类型检查、单测与生产构建。构建步骤使用隔离的 HTTPS、Manual Payment 测试配置，避免把本地 Demo 的 HTTP 与 Mock Payment 误当成生产配置；真实部署变量仍必须单独通过 `npm run check-config`。

首次运行浏览器测试前安装 Chromium：

```bash
npx playwright install chromium
npm run test:e2e
```

## 当前限制

- 注册验证、密码恢复、邀请码权益、课程交付和学习进度已经可运行；
- Local / OSS Storage 与 Console / SMTP Email 已实现；
- Vercel、MongoDB Atlas、阿里云 OSS 和邮件推送配置见 `docs/DEPLOYMENT.md`；
- Product、订单、支付回调、Manual/Mock/XorPay 与签名 Webhook 已实现；
- 转码 Provider、S3 Adapter 与 Sentry Adapter 尚未实现；
- 未完成的 OSS 直传任务会保留 `pending` MediaAsset，当前需要管理员核查或清理。
