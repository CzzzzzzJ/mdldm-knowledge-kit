# 生产部署与第三方 Provider

本文是 README 部署章节的扩展说明。第一版唯一维护的线上路径是
[Agent + Vercel Serverless](../AGENT_SERVERLESS_DEPLOY.md)。Serverless 技术最低组合是：

```text
Vercel（Next.js）
  + MongoDB Atlas（业务数据、Session、Token、限流）
```

当前产品仍以视频课程为主，因此真正公开运营时使用 `Vercel + Atlas + OSS + SMTP +
Manual`；需要自动支付时才把 Manual 替换为 XorPay。阿里云 OSS、SMTP、XorPay 和 Signed Webhook 分别对应视频资料、用户邮件、自动支付和
外部告警，按运营目标启用。Manual Payment、结构化日志和后台失败队列不依赖这些外部
平台。先阅读[最低配置与能力矩阵](CAPABILITY_MATRIX.md)，再进入对应 Provider 章节。

> 当前验证边界：仓库适配和历史配置的 L0/L1 已有记录；全新隔离账号 L2/L3 与中国大陆
> 多网络访问仍待验收。不要把“支持 Adapter”或“构建成功”表述为“生产验证通过”。

## Agent 官方旅程

1. 本地运行 `pnpm check` 与 `pnpm check:serverless`；
2. 创建并隔离 Preview 的 Atlas、OSS、SMTP 与密钥；
3. 运行 L0/L1 后，由站长确认第一次外部变更，再部署 Preview；
4. 使用 `pnpm check:serverless --url https://preview.example.com/` 做只读健康检查；
5. 逐项确认并完成 L2/L3，再使用自定义域名做中国大陆多网络验收；
6. 站长第二次明确确认后才推广到 Production；
7. 创建管理员 1 号、轮换临时密码、完成 `/admin/setup`，最后记录回滚点。

Agent 不登录平台、不处理 MFA/实名/账单、不读取密钥值，也不静默创建付费资源。完整的
暂停条件和脱敏报告格式见 [`AGENT_SERVERLESS_DEPLOY.md`](../AGENT_SERVERLESS_DEPLOY.md)。

## 环境隔离

至少分开三组配置：

- Development：本地 MongoDB、Local Storage、Console Email、Manual；
- Preview：独立测试数据库；只有测试对应能力时才增加独立 OSS、测试发件人与 XorPay；
- Production：正式数据库；OSS、SMTP、XorPay 和 Webhook 根据实际启用能力配置；
- Payment：Manual 可直接用于小规模运营；Preview 的自动支付必须使用隔离商户配置。

不要让 Vercel Preview 连接生产数据库。环境变量修改只影响之后的新部署，修改密钥后需要重新部署。

## Vercel

1. 在 Vercel 导入 Git 仓库，Framework 保持 Next.js，Node.js 选择 22；
2. 仓库的 `vercel.json` 固定 `hkg1` 函数区域；它接近目标用户，但不是中国大陆基础设施；
3. 在 Project Settings → Environment Variables 分别配置 Preview 与 Production；
4. Production 的 `APP_URL` 使用正式 HTTPS 自定义域名；
5. 使用 `openssl rand -hex 32` 生成 `AUTH_SECRET`；
6. 先配置 Atlas；当前视频站公开运营还需要 OSS 与 SMTP；
7. 设置一次性 `INITIAL_SETUP_TOKEN`，部署后访问 `/admin`，两次确认自己的邮箱并激活
   管理员 1 号；
8. 在 `/admin/setup` 运行健康检查并完成开站任务，确认 MongoDB 为 `ok`；
9. 使用自定义域名从至少两个中国大陆网络点完成首页、登录、后台、学习页与媒体验收，
   没有证据时不要正式开站。

Vercel Functions 的请求与响应载荷限制不适合代理大视频。本项目在 OSS 模式下使用浏览器直传和鉴权后的短期签名读取，避免把视频字节穿过函数。

Vercel 官方说明其没有中国大陆基础设施，`.vercel.app` 域名在大陆可能缓慢或不可访问；
自定义域名可以改善情况，但不能保证可用性和性能。`hkg1` 只避免默认把函数放在更远区域，
不能替代真实大陆网络验收。若用户的稳定性或合规要求必须在中国大陆托管，需要另行设计
已备案域名与境内基础设施；这不属于公共第一版维护路径。

官方参考：

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Project Settings](https://vercel.com/docs/project-configuration/project-settings)
- [Vercel Regions](https://vercel.com/docs/regions)
- [Vercel 中国大陆访问说明](https://vercel.com/kb/guide/accessing-vercel-hosted-sites-from-mainland-china)
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

验证和找回链接会输出到服务端终端，仅用于开发。生产环境若继续使用 Console Email，
站点可以启动且已有账号可以登录，但自助注册、重发验证和找回密码会明确停用。需要这些
用户入口时再配置：

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
pnpm sync-products
```

同步只改变之后的新订单。每笔订单都会把标题、单价、币种与权益范围写入 `OrderItem` 快照，历史订单不会随商品配置变化。单课商品使用 `targetSlug` 时，目标课程必须已经存在，否则同步会停用该商品并在终端提示。

不要新增接受 `price`、`amount`、`durationDays` 或权益目标的公开下单参数。当前 `/api/checkout` 使用严格校验，只接受 `productId` 和 `paymentMethod`。

## Payment Provider

### Mock（只用于显式测试）

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
6. 重新部署并运行 `pnpm check-config`；
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

公共第一版不接受 `OBSERVABILITY_PROVIDER=sentry`，也不会静默降级成 Console。
Sentry 接入需要单独实现 Adapter、脱敏规则、健康状态和自动化测试后才能加入配置白名单。

## 后台、健康检查与数据导出

- `/api/health`：公开浅检查，不连接数据库；
- `/api/health?deep=1`：连接 MongoDB 的深度检查，适合 Vercel/外部监控；
- `/admin`：管理员查看用户、课程、订单、权益、媒体、学习指标和统一失败队列；
- `/api/admin/export`：管理员下载限量 JSON 快照，不包含密码、Session 与身份令牌。

深度健康检查返回的配置名称不含密钥，但仍建议只在监控系统中保存必要字段。管理员导出包含邮箱和订单等个人数据，应加密保存并按用途删除。

完整备份、恢复目标与演练步骤见 [数据备份与恢复](BACKUP_AND_RECOVERY.md)。

## 首个管理员与邀请码

生产环境先生成一次性初始化口令，并写入 Vercel Production Environment Variables：

```bash
openssl rand -hex 24
```

将结果保存为 `INITIAL_SETUP_TOKEN`，不要放进仓库或聊天记录。重新部署后打开
`https://your-domain.example/admin`，两次输入自己的邮箱，并填写一次性初始化口令。
系统会把该邮箱作为管理员 1 号，生成当前部署独有、只展示一次的临时密码并自动登录。

立即复制临时密码，然后进入 `/admin/activate` 两次输入自己的正式密码。激活完成后，
临时密码失效，旧会话被撤销，系统才会进入 `/admin/setup`。不要把临时密码或正式密码
发给 Agent、写进 Issue、截图或提交到仓库。确认正式密码可以登录后，可从 Vercel 删除
`INITIAL_SETUP_TOKEN` 并重新部署，减少长期保留一次性口令的风险。

受控终端脚本只作为自动化和故障恢复回退：

```bash
vercel env run -e production -- pnpm create-admin \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password-2026"
```

创建一年期单人会员邀请码：

```bash
pnpm create-invitation \
  --type membership \
  --duration-days 365 \
  --max-redemptions 1 \
  --admin-email "admin@example.com"
```

单课或系列邀请码还需要 `--target-id`。明文邀请码只显示一次，数据库只保存摘要。

如果误关了临时密码页面但已经复制临时密码，使用管理员邮箱和临时密码正常登录，系统会
强制回到 `/admin/activate`。如果临时密码也丢失，优先使用“找回密码”；邮件 Provider
不可用时，才在受控终端中重置同一个管理员：

```bash
vercel env run -e production -- pnpm create-admin \
  --email "admin@example.com" \
  --password "replace-with-a-new-strong-password-2026" \
  --reset-existing
```

该命令不会提权普通用户、不会创建第二个管理员，并会撤销原管理员的全部会话。命令行
参数可能保留在 Shell 历史中，执行后应按组织策略清理本机历史并妥善保管正式密码。

## 上线检查

```bash
pnpm check-config
pnpm check:serverless --url https://your-production-domain.example/
pnpm check
pnpm test:e2e
```

同时人工确认：

- `APP_URL` 与最终 HTTPS 域名完全一致；
- Preview 不连接生产数据；
- Preview 部署与 Production 推广分别取得站长确认；
- 自定义域名已从至少两个中国大陆网络点完成首页、登录、后台、学习页和媒体验收；
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
