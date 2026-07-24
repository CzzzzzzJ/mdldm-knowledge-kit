# mdldm Knowledge Kit v0.1.0

首个公开版本已经完成从内容发布、身份权益、双模式交易到运营监控的核心闭环。

## 核心能力

- 系列、课时、视频、资料、学习进度与权限交付；
- 邮箱身份、Session、邀请码和统一 Entitlement；
- 全站订阅会员与单课购买；
- Manual、Mock、XorPay 支付和幂等授权；
- Local/OSS 存储、Console/SMTP 邮件；
- 运营总览、失败队列、健康检查、导出与签名 Webhook 告警。

## 安装

按 [README](https://github.com/CzzzzzzJ/mdldm-knowledge-kit#快速启动) 可以在无付费第三方服务的本地环境运行完整 Demo。

## 发布验证

- 全新 GitHub 浅克隆到生产启动与深度健康检查约 86.35 秒；
- 40/40 单元测试与 7/7 端到端测试通过；
- 生产构建、发布审计和 `npm audit` 通过，已知漏洞为 0；
- Secret Scanning、Push Protection、Dependabot、CodeQL 与私密漏洞报告已启用。

## 升级与运维

- [升级与回滚](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/blob/v0.1.0/docs/UPGRADING.md)
- [生产部署与 Provider](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/blob/v0.1.0/docs/DEPLOYMENT.md)
- [备份与恢复](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/blob/v0.1.0/docs/BACKUP_AND_RECOVERY.md)
- [完整 Changelog](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/blob/v0.1.0/CHANGELOG.md)

## 已知限制

S3、转码和 Sentry Adapter 尚未实现；v0.1 不包含多租户、返佣提现、微信小程序或麦当私有业务插件。
