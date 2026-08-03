# 最低配置与能力矩阵

这份文档回答三个问题：知识站最少需要什么、每项外部能力何时才需要、关闭后会发生什么。
它是 `.env.example`、`pnpm check-config`、`/api/health` 与后台“系统”页的共同产品契约。

## 最低核心

新部署先准备四项：

```dotenv
APP_URL=https://your-site.example
MONGODB_URI=mongodb+srv://...
AUTH_SECRET=至少-32-位-随机值
INITIAL_SETUP_TOKEN=一次性初始化口令
```

- `APP_URL`：生成会话、邮件链接和支付回调时使用的站点地址；生产必须是 HTTPS；
- `MONGODB_URI`：用户、课程、订单、权益和学习记录的事实源；
- `AUTH_SECRET`：身份与会话签名密钥，不能使用仓库占位值；
- `INITIAL_SETUP_TOKEN`：保护公网首次管理员创建，完成初始化后可从部署平台移除并重新部署。

其他变量都有安全默认值，或只在选择对应能力时校验。

## 按需能力

| 运营目标 | 默认状态 | 选择值 | 额外必填变量 | 未启用时的真实行为 |
| --- | --- | --- | --- | --- |
| 基础站点与内容数据 | 可用 | MongoDB | 仅最低核心 | 站点不能脱离 MongoDB 运行 |
| 视频和下载资料 | 本地有限模式 | `STORAGE_PROVIDER=oss` | `OSS_REGION`、`OSS_BUCKET`、`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET` | Local 可供本地/单机使用；Serverless 不承诺文件持久化；不使用媒体时无需 OSS |
| 账号验证与找回 | 开发有限模式 | `EMAIL_PROVIDER=smtp` | `EMAIL_FROM`、`SMTP_HOST`、`SMTP_USER`、`SMTP_PASSWORD` | 开发环境把链接写入终端；生产环境停用自助注册、重发验证和找回密码，已有账号可登录 |
| 人工收款 | 默认可用 | `PAYMENT_PROVIDER=manual` | 无 | 管理员核对到账后确认订单 |
| 测试支付 | 显式测试 | `PAYMENT_PROVIDER=mock` | 无 | 不产生扣款；生产环境禁止使用 |
| 自动收款 | 按需 | `PAYMENT_PROVIDER=xorpay` | `XORPAY_AID`、`XORPAY_APP_SECRET` | 不影响 Manual Payment |
| 结构化日志与失败队列 | 默认可用 | `OBSERVABILITY_PROVIDER=console` | 无 | 不主动向外部平台发告警 |
| 外部故障通知 | 按需 | `OBSERVABILITY_PROVIDER=webhook` | `OBSERVABILITY_WEBHOOK_URL`、`OBSERVABILITY_WEBHOOK_SECRET` | 后台失败队列和服务端日志继续可用 |
| 视频转码 | 未启用 | `TRANSCODE_PROVIDER=none` | 无 | 上传前准备浏览器可直接播放的文件 |

当前配置层允许“无需媒体存储的站点”不配置 OSS。图文付费正文的编辑、发布与阅读模型
属于后续内容能力，不应把这条配置事实误读为当前已经完成图文课程功能。

## 不在公共第一版的能力

以下值不进入 `.env.example` 的可选清单，配置时会直接失败：

```text
STORAGE_PROVIDER=s3
TRANSCODE_PROVIDER=ffmpeg
TRANSCODE_PROVIDER=aliyun-mps
OBSERVABILITY_PROVIDER=sentry
```

这样做不是认定这些能力没有价值，而是公共仓库暂未提供经过测试的 Adapter、状态检查和
运营验收。需要它们的自定义版本应先补齐 ADR、实现、配置校验、健康检查和测试。

## Development、Preview、Production

| 环境 | 推荐最低组合 | 可以延后 | 不能接受 |
| --- | --- | --- | --- |
| Development | 本地 MongoDB + Local + Console Email + Manual | OSS、SMTP、XorPay、Webhook | 把本地密钥或 Demo 数据提交到 Git |
| Demo/E2E | 隔离 MongoDB + Local + Console Email + 显式 Mock | 所有真实外部服务 | 连接生产数据库、真实扣款或真实群发 |
| Preview | 独立远程 MongoDB + Manual | 不测媒体可延后 OSS；不测注册可延后 SMTP | 复用 Production 数据库和长期密钥 |
| Production | HTTPS + 远程 MongoDB + Manual | OSS、SMTP、XorPay、Webhook 按业务目标启用 | Mock Payment；弱 `AUTH_SECRET`；把未实现 Provider 当作已上线 |

注意：Production 使用 Console Email 时可以启动，但依赖邮件的用户入口会明确关闭；
Production 使用 Local Storage 时可以运行核心页面，但 Serverless 视频和资料不会被视为
可持久交付能力。

当前版本以视频课程为主，因此公开运营组合是 `Vercel + Atlas + OSS + SMTP + Manual`；
这里的“可以延后”只适用于纯核心 Preview 或明确不开放对应流程的站点。第一版唯一维护的
线上部署协议见 [`AGENT_SERVERLESS_DEPLOY.md`](../AGENT_SERVERLESS_DEPLOY.md)。

## 验证与脱敏状态

```bash
pnpm check-config
pnpm check:serverless
pnpm validate:providers
pnpm validate:providers --live
```

- `check-config`：只检查最低核心和已经选择的能力；错误会指出变量名；
- `check:serverless`：检查唯一线上路径的仓库契约并输出脱敏报告；传入 HTTPS 根地址时
  只读探测浅层与深度健康接口；
- `validate:providers`：输出无密钥的 L0 能力结果；
- `validate:providers --live`：执行 MongoDB Ping、OSS HEAD、SMTP Verify 等无业务写入检查；
- `/api/health`：给 Agent 读取浅层能力状态；`?deep=1` 才连接 MongoDB；
- 后台“系统”：给站长展示同一份状态、限制、启用条件和下一步。

任何输出都不得包含 URI、AccessKey、SMTP 密码、支付密钥、Webhook Secret 或变量值。
