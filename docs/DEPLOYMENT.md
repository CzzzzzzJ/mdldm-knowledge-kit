# 生产部署与第三方 Provider

本文是 README 部署章节的扩展说明。当前推荐组合是：

```text
Vercel（Next.js）
  + MongoDB Atlas（业务数据、Session、Token、限流）
  + 阿里云 OSS 私有 Bucket（视频与资料）
  + SMTP / 阿里云邮件推送（验证与找回邮件）
  + XorPay 或 Manual Payment（订单与权益）
  + Signed Webhook（主要故障告警）
```

## 环境隔离

至少分开三组配置：

- Development：本地 MongoDB、Local Storage、Console Email；
- Preview：独立测试数据库、独立 OSS 前缀或 Bucket、测试发信地址；
- Production：正式数据库、正式私有 Bucket、正式发信域名。
- Payment：Preview 使用 Manual 或隔离的 XorPay 配置，Production 使用正式 XorPay 配置。

不要让 Vercel Preview 连接生产数据库。环境变量修改只影响之后的新部署，修改密钥后需要重新部署。

## Vercel

1. 在 Vercel 导入 Git 仓库，Framework 保持 Next.js，Node.js 选择 22；
2. 在 Project Settings → Environment Variables 分别配置 Preview 与 Production；
3. Production 的 `APP_URL` 使用正式 HTTPS 域名；
4. 使用 `openssl rand -hex 32` 生成 `AUTH_SECRET`；
5. 配置 Atlas、OSS 与 SMTP 变量；
6. 部署后运行 `/api/health?deep=1`，确认 MongoDB 为 `ok`，且 Provider 显示 `configured`；
7. 使用生产环境变量从受控终端创建首个管理员。

Vercel Functions 的请求与响应载荷限制不适合代理大视频。本项目在 OSS 模式下使用浏览器直传和鉴权后的短期签名读取，避免把视频字节穿过函数。

官方参考：

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Project Settings](https://vercel.com/docs/project-configuration/project-settings)
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)

## MongoDB Atlas

1. 创建 Atlas Project 与 Cluster；
2. 创建专用 Database User，不使用个人 Atlas 登录凭据；
3. 在 Network Access 配置来源；
4. 从 Connect → Drivers 复制 SRV URI，并写入 `MONGODB_URI`；
5. URI 中的用户名和密码如包含特殊字符，需要进行 URL 编码；
6. 为 Preview 与 Production 使用不同数据库，最好使用不同 Database User；
7. 开启备份、监控和成本告警。

Vercel 使用动态出口 IP。MongoDB 的 Vercel 集成可能配置 `0.0.0.0/0`；如果采用这一方式，必须使用强随机数据库密码、最小数据库权限、TLS 和独立账号。更高安全级别应使用支持固定出口或私网连接的部署方案。

官方参考：

- [MongoDB Atlas 与 Vercel 集成](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)
- [连接 Atlas Cluster](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/)
- [Atlas Cluster 安全配置](https://www.mongodb.com/docs/atlas/setup-cluster-security/)

## 阿里云 OSS

1. 创建与主要用户区域接近的 Bucket；
2. Bucket ACL 设为私有，并开启 Block Public Access；
3. 创建专用 RAM 用户或角色，不使用阿里云主账号 AccessKey；
4. 只给目标 Bucket 对象前缀授予 `GetObject`、`PutObject`、`DeleteObject` 所需权限；
5. 配置以下环境变量：

```dotenv
STORAGE_PROVIDER=oss
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=replace-with-private-bucket
OSS_ENDPOINT=
OSS_ACCESS_KEY_ID=replace-with-ram-or-sts-key
OSS_ACCESS_KEY_SECRET=replace-with-secret
OSS_SESSION_TOKEN=
```

`OSS_ENDPOINT` 使用默认地域域名时可以留空。若使用 STS 临时凭据，需要同时配置 `OSS_SESSION_TOKEN`，并在过期前轮换部署环境变量。

管理员后台使用浏览器 PUT 直传，因此 OSS CORS 至少允许：

```text
Allowed Origins: https://你的正式域名
Allowed Methods: PUT, GET, HEAD
Allowed Headers: Content-Type
Expose Headers: ETag, Content-Length
```

Preview 域名也要单独列入，不建议使用 `*`。Bucket 仍保持私有，GET 与 PUT 都依赖短期签名。

官方参考：

- [OSS Node.js SDK](https://help.aliyun.com/zh/oss/developer-reference/nodejs-sdk/)
- [OSS 权限与访问控制](https://help.aliyun.com/zh/oss/user-guide/permissions-and-access-control-overview)
- [OSS RAM 最小权限](https://help.aliyun.com/en/oss/user-guide/ram-policy/)

## SMTP 与阿里云邮件推送

本地默认：

```dotenv
EMAIL_PROVIDER=console
```

验证和找回链接会输出到服务端终端，仅用于开发。生产配置：

```dotenv
EMAIL_PROVIDER=smtp
EMAIL_FROM=Knowledge Kit <sender@example.com>
SMTP_HOST=smtpdm.aliyun.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=sender@example.com
SMTP_PASSWORD=replace-with-smtp-password
```

阿里云邮件推送中，SMTP 用户名必须与已配置的发信地址一致，密码是发信地址的 SMTP 密码，不是阿里云账号密码。上线前完成发信域名、DNS、发信地址和额度验证。

官方参考：

- [阿里云 SMTP 发送邮件](https://help.aliyun.com/en/direct-mail/user-guide/send-emails-using-smtp)
- [阿里云邮件推送发送方式](https://help.aliyun.com/zh/direct-mail/getting-started/three-mail-sending-methods)

## 商品与服务端定价

内置商品位于 `config/products.config.ts`。每个商品必须定义：

- 不可变 SKU；
- 以分为单位的整数金额和 CNY 币种；
- `membership / course / series` 权益；
- 目标课程或系列；
- 固定天数或永久有效期。

修改后执行：

```bash
npm run sync-products
```

同步只改变之后的新订单。每笔订单都会把标题、单价、币种与权益范围写入 `OrderItem` 快照，历史订单不会随商品配置变化。单课商品使用 `targetSlug` 时，目标课程必须已经存在，否则同步会停用该商品并在终端提示。

不要新增接受 `price`、`amount`、`durationDays` 或权益目标的公开下单参数。当前 `/api/checkout` 使用严格校验，只接受 `productId` 和 `paymentMethod`。

## Payment Provider

### Mock

```dotenv
PAYMENT_PROVIDER=mock
```

Mock 会让当前登录用户确认自己的测试订单，不会请求外部平台，也不会扣款。生产环境配置校验会拒绝 Mock，避免公开站点被用户自行确认支付。

### Manual

```dotenv
PAYMENT_PROVIDER=manual
MANUAL_PAYMENT_INSTRUCTIONS=请转账后联系管理员，并提供订单号。
```

用户下单后看到说明，管理员在 `/admin` 核对线下到账并点击“确认到账”。确认动作也会写入 PaymentEvent，并复用与 XorPay 相同的幂等权益发放流程。不要在说明中放长期密钥、后台口令或个人敏感证件信息。

### XorPay

XorPay Provider 当前支持：

- `alipay`：支付宝当面付链接与二维码；
- `native`：微信 Native 扫码内容；
- `application/x-www-form-urlencoded` 回调；
- 官方字段顺序的 MD5 协议签名；
- 精确到分的服务端金额核对；
- 重复回调幂等和授权失败重试。

配置流程：

1. 注册并在 XorPay 后台完成需要的支付宝或微信通道配置；
2. 从后台取得 AID 和 App Secret；
3. 在 Vercel Project Settings → Environment Variables 中只为服务端配置：

```dotenv
PAYMENT_PROVIDER=xorpay
XORPAY_AID=replace-with-aid
XORPAY_APP_SECRET=replace-with-app-secret
XORPAY_NOTIFY_URL=https://your-domain.example/api/payments/webhooks/xorpay
```

4. `XORPAY_NOTIFY_URL` 可以留空，此时由 `APP_URL` 自动拼接；生产环境建议显式填写，便于核对域名；
5. 回调必须是公网 HTTPS，不能要求浏览器 Cookie、CSRF Header 或登录；
6. 重新部署并运行 `npm run check-config`；
7. 在 Preview 的独立数据库和测试商品上创建低金额订单；
8. 完成支付后检查用户订单和后台，订单应从 `pending` 进入 `fulfilled`，并且对应 Entitlement 只有一条；
9. 在 XorPay 后台重发同一通知，确认不会重复发放；
10. 测试通过后再把相同代码部署到 Production，并使用正式商品配置。

安全建议：

- `XORPAY_APP_SECRET` 绝不能使用 `NEXT_PUBLIC_` 前缀或写入 Git；
- Preview 与 Production 使用不同数据库，能分开账号或密钥时也应分开；
- 不要把 XorPay 回调原文、App Secret、完整买家信息写入日志；
- 回调只有在验签、金额核对、PaymentEvent 和权益发放成功后返回 `200 success`；
- 非 200 会触发 XorPay 重试，后台的失败订单也可以人工重试授权；
- 切换 Provider 时，先等待旧订单过期并保留旧回调凭据，不要立即删除；
- 正式开售前在 XorPay 后台确认已签约通道、手续费、结算规则与风控限制。

官方参考：

- [XorPay API 接口](https://xorpay.com/doc/api.html)
- [XorPay 签名算法](https://xorpay.com/doc/sign.html)
- [支付宝当面付](https://xorpay.com/doc/alipay.html)
- [微信 Native 扫码支付](https://xorpay.com/doc/native.html)
- [回调通知与重试](https://xorpay.com/doc/notify.html)
- [订单状态查询](https://xorpay.com/doc/query.html)

## Observability 与通用 Webhook

本地默认使用结构化 Console：

```dotenv
OBSERVABILITY_PROVIDER=console
```

每条主要故障是单行 JSON，错误信息会先移除邮箱、Bearer Token、MongoDB URI 凭据以及名称含 `password`、`secret`、`token`、`cookie`、`accessKey` 的上下文字段。

生产环境使用通用 Webhook：

```dotenv
OBSERVABILITY_PROVIDER=webhook
OBSERVABILITY_WEBHOOK_URL=https://alerts.example.com/hooks/mdldm
OBSERVABILITY_WEBHOOK_SECRET=replace-with-at-least-32-random-characters
```

配置流程：

1. 创建只负责接收告警的 HTTPS Endpoint；可部署为独立 Vercel Function；
2. 使用 `openssl rand -hex 32` 生成独立 Secret，不与 `AUTH_SECRET` 或支付密钥复用；
3. 在 Endpoint 和知识站的 Production 环境中配置相同 Secret；
4. Endpoint 读取原始 Body 和 `X-MDLDm-Timestamp`；
5. 拒绝与当前时间相差超过 5 分钟的请求；
6. 计算 `HMAC-SHA256(secret, timestamp + "." + rawBody)`，与 `X-MDLDm-Signature` 中 `sha256=` 后的十六进制摘要做常量时间比较；
7. 验签通过后再转换为飞书、Slack、Teams、短信或其他平台消息；
8. 制造一条隔离测试故障，确认 `/admin` 出现记录且告警到达；
9. 在后台写下处理说明，确认相同故障再次发生时会自动重新打开。

告警 Body 结构：

```json
{
  "type": "mdldm.operation_failure",
  "version": "1",
  "event": {
    "fingerprint": "sha256-hex",
    "category": "payment",
    "severity": "critical",
    "code": "ORDER_FULFILLMENT_FAILED",
    "message": "支付成功但权益发放失败：...",
    "provider": "xorpay",
    "sourceType": "order",
    "sourceId": "object-id",
    "occurredAt": "2026-07-24T00:00:00.000Z",
    "occurrenceCount": 1
  }
}
```

Webhook 返回非 2xx 或 5 秒内未响应时，应用会降级记录 `ERROR_REPORTER_FAILED` 结构化日志，但不会回滚原订单或覆盖原业务错误。接收方应快速返回 2xx，把耗时通知放入自己的队列。

Sentry Adapter 尚未实现。`OBSERVABILITY_PROVIDER=sentry` 只会给出明确配置提示并降级为 Console，不应作为生产告警已经可用的信号。

## 后台、健康检查与数据导出

- `/api/health`：公开浅检查，不连接数据库；
- `/api/health?deep=1`：连接 MongoDB 的深度检查，适合 Vercel/外部监控；
- `/admin`：管理员查看用户、课程、订单、权益、媒体、学习指标和统一失败队列；
- `/api/admin/export`：管理员下载限量 JSON 快照，不包含密码、Session 与身份令牌。

深度健康检查返回的配置名称不含密钥，但仍建议只在监控系统中保存必要字段。管理员导出包含邮箱和订单等个人数据，应加密保存并按用途删除。

完整备份、恢复目标与演练步骤见 [数据备份与恢复](BACKUP_AND_RECOVERY.md)。

## 首个管理员与邀请码

管理员只能从受控终端创建：

```bash
npm run create-admin -- \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password-2026"
```

Vercel 项目链接后，可以让命令临时读取 Production 环境变量：

```bash
vercel env run -e production -- npm run create-admin -- \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password-2026"
```

创建一年期单人会员邀请码：

```bash
npm run create-invitation -- \
  --type membership \
  --duration-days 365 \
  --max-redemptions 1 \
  --admin-email "admin@example.com"
```

单课或系列邀请码还需要 `--target-id`。明文邀请码只显示一次，数据库只保存摘要。

## 上线检查

```bash
npm run check-config
npm run check
npm run test:e2e
```

同时人工确认：

- `APP_URL` 与最终 HTTPS 域名完全一致；
- Preview 不连接生产数据；
- OSS Bucket 不可匿名读取；
- 未授权媒体请求返回 403；
- SMTP 能收到验证和重置邮件；
- 生产环境不使用 Mock Payment；
- XorPay 回调地址公网可达，签名错误与金额不符会被拒绝；
- 重复回调不会重复发放权益；
- `paid + failed` 订单能在后台重试授权；
- `/admin` 可看到运营指标和未处理失败；
- Webhook 接收端能校验时间戳与签名；
- 管理员数据导出不会出现 `passwordHash` 或 `tokenHash`；
- Atlas 有备份与告警；
- OSS 已开启版本控制或等价备份，并完成一次隔离恢复演练；
- `.env*`、AccessKey、SMTP 密码未进入 Git。
