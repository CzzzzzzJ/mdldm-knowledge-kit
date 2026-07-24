# ADR 0009：Vercel 部署、OSS 直传与 SMTP Provider

- 状态：Accepted
- 日期：2026-07-24

## 背景

Local Storage 适合单机开发，但 Vercel Functions 没有可依赖的持久业务磁盘，并且函数请求体存在大小限制。视频若继续通过 Next.js 函数上传和回传，会同时遇到持久性、带宽和载荷限制。

## 决策

- 本地默认继续使用 Local Storage；
- 生产环境可选择阿里云 OSS，Bucket 必须为私有；
- 管理员在 OSS 模式下先向站点申请受控上传任务，服务端创建 `pending` MediaAsset 并生成 10 分钟 PUT 签名 URL；
- 浏览器直接 PUT 到 OSS，随后调用完成接口；完成接口通过服务端 HEAD 校验对象大小，再把 MediaAsset 标记为 `ready`；
- 视频和资料请求仍先在 Next.js 服务端执行 Entitlement 检查，通过后 307 跳转到 5 分钟 GET 签名 URL；
- `MediaAsset.provider` 明确记录 `local` 或 `oss`，运行时 Provider 与资产不一致时拒绝访问；
- 邮件使用统一 Email Port，本地实现 Console Provider，生产实现标准 SMTP Provider；
- Vercel、MongoDB Atlas、OSS 和 SMTP 的配置只通过环境变量注入。

## 备选方案

### Vercel 上继续使用 Local Storage

无需云存储，但文件不能作为跨实例、跨部署的持久数据。

### 所有媒体都代理经过 Next.js

权限路径集中，但大视频会占用函数带宽，并受请求和响应体限制。

### 公开读 OSS Bucket

播放简单，但会绕过 Entitlement，无法阻止对象被匿名访问。

## 影响

- OSS 必须配置生产域名对应的 CORS PUT 规则；
- OSS RAM 身份只授予指定 Bucket 前缀所需的最小对象权限；
- 直传未完成会保留 `pending` 资产，后续运维阶段需要增加超时清理任务；
- OSS ETag 作为远端对象校验标识记录；需要强内容校验时再增加客户端 SHA-256 或服务端异步校验；
- 从 Local 切换 OSS 不会自动迁移已有资产，生产上线前应先确定 Provider。
