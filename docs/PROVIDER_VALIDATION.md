# 第三方 Provider 配置提取与验证

## 1. 目的

本文件记录从本机私有原项目中提取的第三方平台配置结构，以及开源版的验证进度。

只记录：

- 环境变量名称；
- Provider 类型；
- 调用方式；
- 是否完成脱敏验证；
- 风险与迁移结论。

不得记录真实值、域名、Bucket、AccessKey、Token、Chat ID、Webhook、项目 ID、
用户邮箱或数据库名称。

公共第一版只验证 MongoDB、Local/OSS、Console/SMTP、Manual/Mock/XorPay 与
Console/Webhook。S3、转码和 Sentry 不进入可选配置，完整边界见
[最低配置与能力矩阵](CAPABILITY_MATRIX.md)。

## 2. 原项目配置映射

| 能力 | 原项目配置键 | 开源版配置键 | 处理 |
| --- | --- | --- | --- |
| 应用地址 | `NEXT_PUBLIC_BASE_URL` | `APP_URL` | 只映射结构，部署者填写自己的 HTTPS 域名 |
| MongoDB | `MONGODB_URI` | `MONGODB_URI` | 保留 Provider，禁止复制 URI |
| 会话密钥 | `JWT_SECRET` | `AUTH_SECRET` | 迁移时必须重新生成，不复用原值 |
| OSS Region | `OSS_REGION` | `OSS_REGION` | 保留 |
| OSS Bucket | `OSS_BUCKET` | `OSS_BUCKET` | 只验证能力，不记录名称 |
| OSS 凭据 | `OSS_ACCESS_KEY_ID/SECRET` | 同名 | 部署者创建最小权限 RAM 身份 |
| CDN 鉴权 | `OSS_CDN_DOMAIN`、`CDN_AUTH_KEY` | 后续 Media/CDN Provider | v0.2 不作为上线阻断项 |
| SMTP 主机 | `DIRECTMAIL_SMTP_HOST` | `SMTP_HOST` | 改为通用 SMTP 命名 |
| SMTP 端口 | `DIRECTMAIL_SMTP_PORT` | `SMTP_PORT` | 保留 |
| SMTP 用户 | `DIRECTMAIL_USER` | `SMTP_USER` | 禁止记录账号 |
| SMTP 密码 | `DIRECTMAIL_PASS` | `SMTP_PASSWORD` | 禁止复制或记录 |
| 发件人 | `DIRECTMAIL_FROM` | `EMAIL_FROM` | 后台可显示，环境变量保存已验证地址 |
| XorPay 商户 | `XORPAY_AID` | `XORPAY_AID` | 保留 |
| XorPay 密钥 | `XORPAY_APP_SECRET` | `XORPAY_APP_SECRET` | 保留，永不输出 |
| 支付回调 | `PAY_CALLBACK_URL` | `XORPAY_NOTIFY_URL` | 必须使用开源版新路由重新生成 |
| MPS | `MPS_REGION/PIPELINE_ID/TEMPLATE_*` | 后续 Transcode Provider | 原站存在硬编码默认值，禁止迁移 |
| Vercel Cron | `CRON_SECRET` 与 `vercel.json` | 后续 Job Provider | 只抽取通用任务需求 |
| 飞书、微信、AI | 多组私有变量 | 无 | 不进入公共核心 |

## 3. 验证等级

| 等级 | 含义 | 是否产生外部状态 |
| --- | --- | --- |
| L0 | 变量完整性、格式、Provider 选择和降级检查 | 否 |
| L1 | MongoDB Ping、OSS 鉴权 HEAD、SMTP Verify 等只读连接检查 | 否 |
| L2 | 在隔离环境写入并删除临时 OSS 对象、发送测试邮件、制造告警 | 是 |
| L3 | 注册、真实低价支付、回调、权益、播放、备份恢复全链路 | 是 |

仓库提供：

```bash
pnpm check-config
pnpm validate:providers
pnpm validate:providers --live
```

`--live` 只执行 L1 检查。它不会发送邮件、创建支付订单、写入 OSS 或触发告警。

L2/L3 必须使用独立 Preview 数据库、独立 OSS 前缀或 Bucket、测试发件人和低价测试
商品，并在验证记录中写清清理结果。

## 4. 第一轮原项目提取结论

### 可进入公共验证链路

- MongoDB/Mongoose 连接缓存和 Atlas 使用事实；
- 阿里云 OSS 私有对象存储；
- 阿里云 DirectMail SMTP；
- XorPay 支付与回调；
- Vercel 部署与定时任务形态；
- MPS/HLS 只作为未来扩展需求的调研输入，不作为公共 Provider。

### 不进入公共链路

- 飞书 Wiki、群邀请、Webhook 和 Base；
- 微信登录、小程序和二维码绑定；
- 麦当 AI、模型网关和额度；
- 返佣、提现和个人营销自动化；
- 原项目真实域名、Bucket、模板 ID、管道 ID和凭据。

### 从原实现得到的风险

1. 支付日志不得记录签名原文、完整请求参数或回调原文；
2. XorPay 回调地址不能复用原项目旧路由；
3. MPS Pipeline 和 Template ID 不允许硬编码默认值；
4. OSS RAM 权限应限制到指定 Bucket 前缀；
5. SMTP Verify 与真实发信要分开验收；
6. Provider 代码存在不等于账号、额度、CORS、DNS 和回调已经可用；
7. 原项目生产配置不得直接成为开源版 Demo 或测试配置。

## 5. 验证记录

验证日期：2026-07-27

| 对象 | L0 | L1 | L2 | L3 | 当前结论 |
| --- | --- | --- | --- | --- | --- |
| Vercel | WARN | PASS | 待验证 | 待验证 | 本机登录和关联项目可读，但项目环境变量为空 |
| MongoDB | PASS | PASS | 不适用 | 待验证 | 使用原项目本机配置完成只读 Ping |
| OSS | PASS | PASS | 待验证 | 待验证 | 随机不存在对象的鉴权 HEAD 成功，未写入 |
| SMTP | PASS | PASS | 待验证 | 待验证 | `verify()` 成功，未发送邮件 |
| XorPay | PASS | 不适用 | 待验证 | 待验证 | 配置与签名逻辑有效，未创建订单 |
| Webhook | SKIP | 不执行 | 待验证 | 待验证 | 原站地址属于私有配置，不迁移 |
| MPS/CDN | WARN | SKIP | 待验证 | 待验证 | 原项目本地缺少完整 MPS 配置，开源版尚未实现 |

每次验证后只更新状态、日期、错误分类和修复建议，不记录外部标识和值。

### 2026-07-27 第一轮结果

执行范围：

- 读取本机私有原项目 `.env` / `.env.local`，只在当前进程内映射变量；
- 未把原值复制到开源仓库或新建 `.env.local`；
- 未输出 URI、域名、Bucket、账号、密钥、项目 ID 或邮件地址；
- 未写数据库、未上传或删除 OSS 对象、未发送邮件、未创建支付订单；
- 使用 Vercel CLI 只读检查登录态、关联项目和环境变量列表。

结果：

1. 原项目配置直接映射到开源版生产校验时失败：
   - 原会话密钥不满足开源版生产环境至少 32 位要求；
   - 原本地应用地址不是生产 HTTPS；
2. 切换为只读连通性检查后：
   - MongoDB Ping 成功；
   - OSS 对随机不存在对象的鉴权 HEAD 成功；
   - SMTP 连接与认证成功；
   - XorPay 必填字段和签名逻辑有效；
3. 原项目当前关联的 Vercel Project 可以访问，但 Environment Variables 数量为 0；
4. 原项目本地文件没有完整 MPS Pipeline/Template 配置，原代码中的硬编码默认值不
   作为迁移来源；
5. 新站必须重新生成 `AUTH_SECRET`、使用自己的 HTTPS `APP_URL`，并按新的
   `/api/payments/webhooks/xorpay` 路由重建支付回调。

第一轮说明了“账号和本地配置仍能连接”，没有说明新开源站已经具备生产环境。下一轮
必须新建隔离 Preview 配置，再执行 L2/L3。

### 2026-08-03 AF-05 Serverless 路径结论

当前已经确认：

- 第一版唯一维护的 Web 路径是 Agent + Vercel Serverless；
- `vercel.json` 固定 pnpm 冻结安装、生产构建和 `hkg1` 函数区域；
- Preview 必须先于 Production，二者的数据库、密钥和外部资源需要隔离；
- `pnpm check:serverless` 可以检查仓库契约，并在显式提供 HTTPS 根地址后只读探测浅层与
  深度健康接口；
- Docker Compose 只提供本地 MongoDB，不是生产部署方案；
- 当前视频知识站公开运营组合是 Atlas + OSS + SMTP + Manual，XorPay 和 Webhook 按需。

当前仍未确认：

- 没有使用全新隔离 Vercel、Atlas、OSS、SMTP 和支付账号完成 L2/L3；
- 没有从至少两个中国大陆网络点完成自定义域名的页面、API 与媒体验收；
- 没有形成可公开复用的成本、配额、账单、回滚和账号清理证据。

Vercel 官方说明其没有中国大陆基础设施，`.vercel.app` 域名可能在大陆缓慢或不可访问，
自定义域名也不能保证可用性和性能。因此 `hkg1` 只作为国内用户优先的默认函数区域，
不能把它记录成“中国大陆可用性验证通过”。AF-05 在真实账号与大陆网络证据补齐前保持
`IN PROGRESS`。

官方参考：

- [Vercel 中国大陆访问说明](https://vercel.com/kb/guide/accessing-vercel-hosted-sites-from-mainland-china)
- [Vercel Regions](https://vercel.com/docs/regions)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [MongoDB Atlas 与 Vercel 集成](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)
