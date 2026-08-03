# 本地开发

## 环境要求

- Node.js 20 或更高版本，CI 使用 Node.js 22；
- pnpm 10.14.0（由 `packageManager` 固定）；
- Docker Desktop，用于启动本地 MongoDB；
- ffmpeg（可选），只在生成完全合成的 Demo MP4 时使用，不是站点启动依赖。

应用构建只使用 pnpm。`vercel.json` 已显式固定冻结安装和生产构建命令；当前
`docker-compose.yml` 只启动本地 MongoDB，不负责构建或部署应用。
线上只维护 [`Agent + Vercel Serverless`](../AGENT_SERVERLESS_DEPLOY.md) 路径。

## 首次启动

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
docker compose up -d mongodb
pnpm check-config
pnpm dev
```

打开 `http://localhost:3000/admin`，两次输入并确认自己的邮箱。这个邮箱会成为
“管理员 1 号”的登录账号；系统会生成只展示一次的随机临时密码并自动登录。保存临时
密码后设置正式密码，才能进入 `/admin/setup`。需要虚构示例课程时再运行
`pnpm seed-demo`。

`.env.local` 中的 `AUTH_SECRET` 必须替换为本机生成的随机值：

```bash
openssl rand -hex 32
```

默认 `EMAIL_PROVIDER=console`、`PAYMENT_PROVIDER=manual`。开发环境的验证和找回密码
链接会打印在运行服务器的终端；Manual Payment 不连接外部支付平台。

## 管理员脚本回退

```bash
pnpm create-admin \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password-2026"
```

默认应从 `/admin` 创建首个管理员。脚本只用于本地自动化和故障恢复，不会静默把
已有普通用户提升为管理员，也不会默认重置已有管理员密码。只有明确恢复同一个管理员
时，才允许显式增加 `--reset-existing`；执行后所有旧会话会失效：

```bash
pnpm create-admin \
  --email "admin@example.com" \
  --password "replace-with-a-new-strong-password-2026" \
  --reset-existing
```

## 创建邀请码

```bash
pnpm create-invitation \
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

Agent 在修改或排障前可以读取脱敏生命周期和能力状态：

```bash
pnpm agent:status
```

该命令不输出 APP_URL、APP_NAME、邮箱、URI、Token、Bucket、环境变量值或业务数据；
生命周期为 `unknown` 时应先修复配置或数据库连接。任务级 Prompt 见
[`AGENT_TASKS.md`](../AGENT_TASKS.md)。

需要生成可分享的脱敏诊断时运行：

```bash
pnpm run doctor
pnpm run doctor --issue
```

第二条命令只在 `.mdldm/` 写入本地 Issue 草稿，不会访问 GitHub。人工检查并确认不含
URI、Token、邮箱、Bucket、域名和真实数据后，才可以由用户本人提交 Agent Report；
安全漏洞继续通过 Private Security Advisory 私密报告。

## 质量检查

```bash
pnpm check
pnpm release:audit
```

`pnpm check` 会依次执行 Lint、类型检查、L1-L3 分层测试与生产构建。构建步骤使用隔离的
HTTPS、Manual Payment 测试配置，避免把本地 Demo 的 HTTP 与 Mock Payment 误当成生产
配置；真实部署变量仍必须单独通过 `pnpm check-config`。分层定义和按改动选择命令见
[测试分层](TESTING.md)。

## Agent 修改数据查询时的边界

- 页面、Route Handler 和 Client Component 不直接导入 `providers/database/mongodb/models`；
- 课程、用户、学习和商品查询优先扩展现有 `*-query-service.ts`；
- 需要新查询时，先在 `modules/*/queries.ts` 定义安全 DTO 与 Port，再在
  `providers/database/mongodb/repositories/` 实现 MongoDB 映射；
- 价格只从服务端 Product 读取，权限只由 Entitlement 规则判断；
- 运行 `pnpm test` 时的架构测试会阻止 Model 重新渗透到 Web 入口。

首次运行浏览器测试前安装 Chromium：

```bash
pnpm exec playwright install chromium
pnpm test:l4
```

`test:l4` 顺序执行 Mock 自动支付和 Manual 人工确认两套隔离数据库；可用
`pnpm test:l4:auto` 或 `pnpm test:l4:manual` 单独定位。上线前还必须完成人工
[L5 发布验收](L5_RELEASE_ACCEPTANCE.md)。

## 当前限制

- 注册验证、密码恢复、邀请码权益、图文/视频课程交付和视频学习进度已经可运行；
- Local / OSS Storage 与 Console / SMTP Email 已实现；
- Vercel、MongoDB Atlas、阿里云 OSS 和邮件推送配置见 `docs/DEPLOYMENT.md`；
- Product、订单、支付回调、Manual/Mock/XorPay 与签名 Webhook 已实现；
- 公共配置只暴露已实现的 Local/OSS、Console/SMTP、Manual/Mock/XorPay、
  Console/Webhook；转码固定为 None；
- S3、FFmpeg/MPS 转码与 Sentry 不作为公共第一版配置值；
- 未完成的 OSS 直传任务会保留 `pending` MediaAsset，当前需要管理员核查或清理。

完整能力关闭行为与环境组合见 [最低配置与能力矩阵](CAPABILITY_MATRIX.md)。
