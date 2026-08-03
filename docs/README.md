# 文档中心

README 只负责帮采用者看懂项目和进入唯一主线。这里按“什么时候需要”分类，不要求第一次启动全部阅读。

## 第一次使用

1. [15 分钟启动](../START_HERE.md)：本地安装、MongoDB、首个管理员和可选 Demo；
2. [Agent Quickstart](../AGENT_QUICKSTART.md)：Agent 的执行状态机、安全边界和汇报格式；
3. [Agent + Serverless 部署](../AGENT_SERVERLESS_DEPLOY.md)：唯一官方线上部署路线；
4. `/admin/setup`：部署后在站长后台完成站点设置、能力检查和开站。

只想了解 Demo 内容和业务闭环时，阅读 [Demo 指南](DEMO.md)。

## 经营时按需查看

| 你要做的事 | 文档 |
| --- | --- |
| 判断最少要配置什么 | [能力与最低配置](CAPABILITY_MATRIX.md) |
| 配置 Vercel、Atlas、OSS、SMTP 或支付 | [生产部署与 Provider](DEPLOYMENT.md) |
| 验证第三方连接和真实链路 | [Provider 验证分级](PROVIDER_VALIDATION.md) |
| 备份或恢复数据与媒体 | [备份与恢复](BACKUP_AND_RECOVERY.md) |
| 升级、验证和回滚 | [升级指南](UPGRADING.md) |
| 修改品牌、组件或主题 | [设计系统](DESIGN_SYSTEM.md) |
| 本地排障或受控恢复管理员 | [开发与排障](DEVELOPMENT.md) |

## 发布与贡献

| 你要做的事 | 文档 |
| --- | --- |
| 选择 L1-L5 测试 | [测试分层](TESTING.md) |
| 做真实环境最终验收 | [L5 发布验收](L5_RELEASE_ACCEPTANCE.md) |
| 准备版本发布 | [Release 流程](RELEASE.md) 与 [Changelog](../CHANGELOG.md) |
| 理解安全要求 | [安全基线](SECURITY_BASELINE.md) 与 [漏洞报告](../SECURITY.md) |
| 理解系统边界 | [架构总览](../ARCHITECTURE.md) 与 [ADR](decisions/README.md) |
| 提交代码或文档 | [贡献指南](../CONTRIBUTING.md) |

## 授权与商业延伸

- [Apache-2.0 正文](../LICENSE) 与 [许可证 ADR](decisions/0002-open-source-license.md)；
- [商标与品牌使用说明](../TRADEMARKS.md)；
- [第三方依赖声明](../THIRD_PARTY_NOTICES.md) 与 [截图素材清单](assets/README.md)；
- [《麦当知识站实战》入口与授权边界](PAID_PRACTICE_GUIDE.md)。

完整 Docker、多平台迁移、规模化运维和知识产品运营属于独立进阶内容。公共仓库仍会免费提供跑起站点、官方 Serverless 部署、管理员初始化、基础支付、备份、升级和安全所必需的说明。
