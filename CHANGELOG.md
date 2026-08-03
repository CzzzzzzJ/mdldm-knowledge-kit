# Changelog

本项目遵循 [Semantic Versioning](https://semver.org/)。公开版本的用户可见变化记录在这里。

## [Unreleased]

### Added

- Article 图文课纯文本正文、无视频发布和服务端 Entitlement 正文脱敏；
- L1-L5 测试分层、L1-L3 独立 CI 门禁和 L5 人工发布验收清单；
- Mock 自动支付与 Manual 人工确认两套隔离 L4 E2E。
- 采用者优先的 README、四步文档主线和按任务分类的文档中心；
- 商标与品牌说明、公开截图素材清单，以及只保留入口和授权边界的进阶实践指南；
- 移除重复路线图、内部阶段分析、历史安装报告和重复许可证说明；
- README 作者联系方式、事项分流、X/Twitter 与中文社交平台入口。

## [0.1.0] - 2026-07-24

首个公开版本，提供个人创作者知识产品交付的完整基础闭环。

### Added

- Next.js 15、React 19、严格 TypeScript 与 MongoDB 单仓模块化骨架；
- 系列、课时、视频、资料、发布校验和学习进度；
- 邮箱注册、验证、登录、找回密码、Session 与共享限流；
- `public / registered / member / course / series` 权益矩阵与邀请码；
- 全站订阅会员和单课购买两套商品模式；
- 服务端 SKU、Order、OrderItem、PaymentEvent 与幂等 Entitlement 发放；
- Manual、Mock 与 XorPay Payment Provider；
- Local 与阿里云 OSS Storage Provider；
- Console 与 SMTP Email Provider；
- 管理员运营总览、失败队列、健康检查与数据导出；
- 结构化 Console 与 HMAC 签名 Webhook 告警；
- Vercel、Atlas、OSS、SMTP、支付、备份、恢复、升级与回滚文档。

### Security

- 服务端固定新用户角色和商品金额；
- 支付回调验签、金额核对、事件幂等和失败重放；
- Cookie、CSRF、CORS、安全 Header、运行时输入校验和严格 Mongoose Schema；
- 私有媒体短期授权、上传限制、日志脱敏与失败聚合；
- GitHub Secret Scanning、Push Protection、Dependabot 安全更新和 CodeQL。

### Known limitations

- S3、转码和 Sentry Adapter 尚未实现；
- v0.1 不是多租户 SaaS，不包含返佣、提现、微信小程序和私有业务插件；
- 数据库模型尚无独立迁移框架，升级前必须备份并阅读升级说明。

[0.1.0]: https://github.com/CzzzzzzJ/mdldm-knowledge-kit/releases/tag/v0.1.0
[Unreleased]: https://github.com/CzzzzzzJ/mdldm-knowledge-kit/compare/v0.1.0...HEAD
