# mdldm Knowledge Kit

[![CI](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/actions/workflows/ci.yml)
[![CodeQL](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/actions/workflows/codeql.yml/badge.svg)](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/actions/workflows/codeql.yml)
[![Release](https://img.shields.io/github/v/release/CzzzzzzJ/mdldm-knowledge-kit)](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/releases/latest)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

一套面向个人创作者的、自托管的知识产品交付与会员运营底座。

项目由麦当 mdldm 发起，来自一个已经稳定运行的真实知识站实践。这里不会公开复制原站，而是重新提炼其中可复用的课程交付闭环，并将个人 IP、真实业务数据和私有服务隔离在公共核心之外。

> 当前版本：`v0.1.0 / Phase 6 public release`
>
> 课程交付、身份权益、全站会员与单课购买、运营总览、统一失败队列、签名告警、本地/OSS 存储与 Console/SMTP 邮件已经可运行。

![虚构 Demo 首页](docs/assets/home.png)

所有截图、账号、商品和课程内容均为虚构数据。完整演示路径见 [Demo 指南](docs/DEMO.md)。

## 要解决的问题

帮助已经拥有内容或知识产品的创作者，搭建一个支持以下能力的独立知识站：

- 邮箱注册、登录、验证与找回密码；
- 系列、课时、视频、资料和发布管理；
- 免费、登录可看、会员、单课等通用权益；
- 邀请码、订单、支付回调和幂等授权；
- 安全播放、资料下载、断点续播和学习进度；
- 课程、用户、权益、订单、媒体与系统状态后台；
- 可替换的支付、存储、邮件、转码和监控 Provider。

## v0.1 边界

第一版只聚焦“创作者发布知识产品，用户获得权益并完成学习”的核心闭环。

第一版明确不包含：

- 麦当个人页面、真实用户数据和个人营销素材；
- 麦子、AI 网关和 sub2api；
- 返佣、提现和复杂营销自动化；
- 固定飞书知识库、VIP 群和个人 Webhook；
- 微信小程序、MDTI、M-Agent；
- 多租户 SaaS。

## 核心原则

1. 新仓白名单开发，不复制私有仓库历史。
2. 领域模块决定业务规则，Provider 只调用外部服务。
3. 没有第三方服务配置时，Demo 站仍应可运行。
4. 商品价格只能由服务端 SKU 决定。
5. 权限统一由 Entitlement 判定。
6. 所有媒体统一进入 MediaAsset。
7. 公共仓库只使用虚构 Demo 数据。

## 文档入口

- [项目定义](PROJECT.md)
- [开发任务](TASKS.md)
- [架构总览](ARCHITECTURE.md)
- [完整现状分析与目标拓扑](docs/analysis/知识站开源版-现状分析与目标拓扑-2026-07-23.md)
- [原项目 Phase 1 参考审视](docs/analysis/原项目Phase1参考审视-2026-07-24.md)
- [开发路线图](docs/ROADMAP.md)
- [本地开发](docs/DEVELOPMENT.md)
- [生产部署与第三方 Provider](docs/DEPLOYMENT.md)
- [虚构 Demo 与验收路径](docs/DEMO.md)
- [数据备份与恢复](docs/BACKUP_AND_RECOVERY.md)
- [升级与回滚](docs/UPGRADING.md)
- [Release 流程](docs/RELEASE.md)
- [更新日志](CHANGELOG.md)
- [第三方许可证说明](THIRD_PARTY_NOTICES.md)
- [安全基线](docs/SECURITY_BASELINE.md)
- [架构决策](docs/decisions/README.md)
- [贡献指南](CONTRIBUTING.md)

## 技术基线

- Next.js 15.5
- React 19.2
- TypeScript 5.9
- MongoDB / Mongoose 8
- Tailwind CSS 4
- 单仓模块化架构
- Local / 阿里云 OSS Storage
- Console / SMTP Email
- Manual / Mock / XorPay Payment
- Structured Console / signed Webhook Observability

当前可以运行“注册验证 → 会员或单课下单 → Mock 支付 → 幂等获得权益 → 观看受控课程 → 后台查看指标与故障”的完整 Demo。`v0.1.0` 是首个公开版本，升级前请同时阅读 [已知限制](CHANGELOG.md#已知限制)。

## 快速启动

```bash
git clone https://github.com/CzzzzzzJ/mdldm-knowledge-kit.git
cd mdldm-knowledge-kit
npm ci
cp .env.example .env.local
openssl rand -hex 32
docker compose up -d mongodb
npm run check-config
npm run create-admin -- \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password-2026"
npm run seed-demo
npm run dev
```

把 `openssl` 输出写入 `.env.local` 的 `AUTH_SECRET`，再打开 `http://localhost:3000`。Console Email 会把验证与找回链接打印在运行 `npm run dev` 的服务端终端。

`seed-demo` 会同步两个虚构商品：一年期全站会员和一门永久单课。打开 `/pricing`，在非生产环境中可用 Mock Payment 完整测试下单与权益发放，不会产生真实扣款。修改 `config/products.config.ts` 后运行：

```bash
npm run sync-products
```

浏览器只提交 `productId` 和支付方式；价格、币种、权益类型、目标与期限全部从服务端商品生成，并保存到 `OrderItem` 快照。

创建一年期单人会员邀请码：

```bash
npm run create-invitation -- \
  --type membership \
  --duration-days 365 \
  --max-redemptions 1 \
  --admin-email "admin@example.com"
```

单课或系列邀请码使用 `--type course|series --target-id <ObjectId>`。明文邀请码只显示一次。

## 生产部署与第三方平台

推荐生产组合：

| 能力 | 本地开发 | Vercel 推荐 |
| --- | --- | --- |
| Web | `npm run dev` | Vercel Next.js / Node.js 22 |
| 数据库 | Docker MongoDB | MongoDB Atlas |
| 媒体 | Local Storage | 阿里云 OSS 私有 Bucket |
| 邮件 | Console Email | SMTP / 阿里云邮件推送 |
| 支付 | Mock / Manual | XorPay 或 Manual |
| 监控 | Structured Console | 签名 Webhook |

### 1. Vercel

1. 从 Git 仓库导入项目，Framework 使用 Next.js，Node.js 选择 22；
2. 在 Project Settings → Environment Variables 分别配置 Preview 与 Production；
3. Production 的 `APP_URL` 必须是最终 HTTPS 域名；
4. 配置下面的 Atlas、OSS、SMTP 变量后重新部署；
5. 部署后访问 `/api/health?deep=1`，确认 MongoDB 为 `ok`。

Vercel Functions 存在请求和响应体限制，不能使用 Local Storage 持久保存课程视频。本项目在 OSS 模式下使用浏览器直传和鉴权后的 5 分钟签名读取，媒体字节不会穿过 Vercel Function。

### 2. MongoDB Atlas

1. 创建 Cluster 和专用 Database User；
2. 在 Network Access 配置应用来源；
3. 从 Connect → Drivers 复制 SRV URI 到 `MONGODB_URI`；
4. Preview 与 Production 使用不同数据库和账号；
5. 开启备份、成本告警并使用强随机密码。

Vercel 使用动态出口 IP。Atlas 的 Vercel 集成可能使用 `0.0.0.0/0`；采用时务必依赖 TLS、最小数据库权限和独立强密码，不能把 Atlas 登录账号当作数据库账号。

### 3. 阿里云 OSS

Bucket 必须设为私有并开启 Block Public Access。使用专用 RAM 身份，只授予目标 Bucket 前缀所需的 `GetObject`、`PutObject` 和 `DeleteObject` 权限：

```dotenv
STORAGE_PROVIDER=oss
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=replace-with-private-bucket
OSS_ENDPOINT=
OSS_ACCESS_KEY_ID=replace-with-ram-or-sts-key
OSS_ACCESS_KEY_SECRET=replace-with-secret
OSS_SESSION_TOKEN=
```

后台直传需要为正式域名配置 OSS CORS：

```text
Origins: https://你的正式域名
Methods: PUT, GET, HEAD
Allowed Headers: Content-Type
Expose Headers: ETag, Content-Length
```

Preview 域名应单独加入，不建议使用 `*`。从 Local 切换 OSS 不会自动迁移已有媒体，生产上传前先冻结 Provider 选择。

### 4. SMTP / 阿里云邮件推送

```dotenv
EMAIL_PROVIDER=smtp
EMAIL_FROM=Knowledge Kit <sender@example.com>
SMTP_HOST=smtpdm.aliyun.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=sender@example.com
SMTP_PASSWORD=replace-with-smtp-password
```

阿里云 SMTP 用户名必须与已配置发信地址一致；SMTP 密码不是阿里云账号密码。上线前完成发信域名、DNS 和发信地址验证。

### 5. Manual、Mock 与 XorPay

本地默认使用 Mock：

```dotenv
PAYMENT_PROVIDER=mock
```

Mock 只用于开发，生产配置校验会直接拒绝。暂时不接第三方平台时可以使用 Manual，由管理员在订单后台核对并确认：

```dotenv
PAYMENT_PROVIDER=manual
MANUAL_PAYMENT_INSTRUCTIONS=请转账后联系管理员，并提供订单号。
```

接入 XorPay：

```dotenv
PAYMENT_PROVIDER=xorpay
XORPAY_AID=replace-with-xorpay-aid
XORPAY_APP_SECRET=replace-with-xorpay-app-secret
# 留空时自动使用 APP_URL/api/payments/webhooks/xorpay
XORPAY_NOTIFY_URL=https://your-domain.example/api/payments/webhooks/xorpay
```

1. 在 XorPay 后台取得 AID 与 App Secret；
2. 在 Vercel Production 环境配置以上变量，不能添加 `NEXT_PUBLIC_` 前缀；
3. 确保回调地址是公网 HTTPS，并允许 XorPay 无登录 POST；
4. 重新部署后运行 `npm run check-config`；
5. 用隔离的低价测试商品完成一次支付宝或微信 Native 支付；
6. 在 `/admin` 确认订单为 `fulfilled / fulfilled`，再恢复正式商品价格并重新同步。

XorPay 回调会先验签，再核对订单 Provider、服务端金额和币种。`PaymentEvent` 以 Provider 事件 ID 幂等留痕；重复通知不会重复创建 Entitlement。授权失败会保留支付成功事实，并在后台提供重试入口。

切换支付 Provider 前应先处理完旧 Provider 的待支付订单，并保留旧回调密钥一段时间。Preview 应使用独立 XorPay 测试配置或 Manual，不要与 Production 共用订单和数据库。

### 6. 结构化日志与通用 Webhook 告警

默认配置会向服务端输出单行 JSON 结构化日志：

```dotenv
OBSERVABILITY_PROVIDER=console
```

生产环境建议把主要故障同步到自建 Vercel Function、自动化平台或告警中继：

```dotenv
OBSERVABILITY_PROVIDER=webhook
OBSERVABILITY_WEBHOOK_URL=https://alerts.example.com/hooks/mdldm
OBSERVABILITY_WEBHOOK_SECRET=replace-with-at-least-32-random-characters
```

Webhook 请求包含 `X-MDLDm-Timestamp` 与 `X-MDLDm-Signature`。接收方应使用原始请求体计算 `HMAC-SHA256(secret, timestamp + "." + rawBody)`，并拒绝超过 5 分钟的时间戳。不要把 Secret 放进 URL 或 `NEXT_PUBLIC_` 变量。

Slack、飞书、Teams 等平台通常有自己的消息格式和签名协议，不建议把平台机器人地址直接填入本项目。用一层 Vercel Function/Serverless 中继先校验本项目签名，再转换为目标平台格式；这样可以轮换目标平台 Webhook 而不改业务站配置。

支付、邮件和存储错误会聚合到 `/admin` 的统一失败队列；未来转码 Provider 也使用同一类别。Sentry 目前只保留配置枚举，选择后会明确降级为 Console，不视为已接入。

### 7. 必填生产变量

```dotenv
NODE_ENV=production
APP_URL=https://your-domain.example
APP_NAME=mdldm Knowledge Kit
MONGODB_URI=mongodb+srv://...
AUTH_SECRET=replace-with-at-least-32-random-characters
STORAGE_PROVIDER=oss
EMAIL_PROVIDER=smtp
PAYMENT_PROVIDER=xorpay
XORPAY_AID=...
XORPAY_APP_SECRET=...
```

运行 `npm run check-config` 会拒绝生产环境中的 Mock Payment、HTTP `APP_URL`、不完整 OSS/SMTP/XorPay/Webhook 配置和弱 `AUTH_SECRET`；MongoDB 指向本机时会提示该组合不能用于 Vercel。完整步骤、安全建议、Vercel 初始化管理员命令与官方文档链接见 [生产部署与第三方 Provider](docs/DEPLOYMENT.md)。

生产上线前同时配置 Atlas 与 OSS 备份，并实际做一次隔离恢复演练；管理员 JSON 导出不包含凭据，也不能替代完整备份。操作步骤见 [数据备份与恢复](docs/BACKUP_AND_RECOVERY.md)。

## 质量检查

```bash
npm run check
npm run release:audit
npm run test:e2e
```

`release:audit` 会检查公开仓库必需文件、本机绝对路径、疑似密钥、非示例邮箱、带凭据的 MongoDB URI、误提交运行数据与依赖许可证。CI 还会执行 `npm audit`，GitHub 仓库启用了 Dependabot、Secret Scanning、Push Protection、CodeQL 与私密漏洞报告。

`npm run check` 的生产构建使用隔离的 HTTPS 与 Manual Payment 测试配置；正式部署仍须用真实环境变量单独运行 `npm run check-config`。

## 开发准备

开始实现前先阅读：

1. `PROJECT.md`
2. `ARCHITECTURE.md`
3. `TASKS.md`
4. `docs/SECURITY_BASELINE.md`
5. `AGENTS.md`

## License

本项目公共核心采用 [Apache License 2.0](LICENSE)。该许可证不授予 `mdldm`、麦当相关名称、Logo 或其他商标的额外使用权。
