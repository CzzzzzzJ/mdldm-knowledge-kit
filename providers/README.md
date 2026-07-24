# Providers

这里承载第三方和基础设施适配器：

- database；
- storage；
- payment；
- email；
- transcode；
- observability；
- external auth。

每个 Provider 必须实现对应 Port，并说明配置、降级行为、错误模型和测试方式。

当前实现：

- `database/mongodb`：MongoDB 连接、健康检查和严格 Schema；
- `storage/local`：本地媒体写入、路径隔离、存在性检查和删除；
- `storage/oss`：阿里云 OSS 写入、HEAD、短期上传和读取签名；
- `email/console`：本地输出验证和找回链接；
- `email/smtp`：标准 SMTP 事务邮件；
- `auth/session`：服务端会话 Cookie 与数据库 Session；
- `rate-limit/mongodb`：跨实例共享的身份接口固定窗口限流。
- `payment/manual`：管理员核对后手工确认到账；
- `payment/mock`：仅用于非生产 Demo 的无扣款支付；
- `payment/xorpay`：XorPay 下单、签名和回调协议适配。
- `observability/console`：脱敏后的单行 JSON 故障日志；
- `observability/webhook`：带时间戳与 HMAC-SHA256 签名的通用告警。

支付 Provider 不决定商品价格或发放权益。订单校验、PaymentEvent 幂等和 Entitlement 发放统一位于应用用例层。S3、转码与 Sentry Provider 仍处于配置识别或计划状态。
