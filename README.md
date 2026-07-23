# mdldm Knowledge Kit

一套面向个人创作者的、自托管的知识产品交付与会员运营底座。

项目由麦当 mdldm 发起，来自一个已经稳定运行的真实知识站实践。这里不会公开复制原站，而是重新提炼其中可复用的课程交付闭环，并将个人 IP、真实业务数据和私有服务隔离在公共核心之外。

> 当前阶段：`v0.0 / architecture-first`
>
> 仓库先冻结产品边界、目标架构、安全基线和开发路线，再开始 Phase 1 应用骨架开发。

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
- [开发路线图](docs/ROADMAP.md)
- [安全基线](docs/SECURITY_BASELINE.md)
- [架构决策](docs/decisions/README.md)
- [贡献指南](CONTRIBUTING.md)

## 计划中的技术基线

- Next.js 15+
- React 19+
- TypeScript
- MongoDB / Mongoose
- 单仓模块化架构
- 本地存储、Mock 支付和 Console 邮件作为默认开发 Provider

应用脚手架将在 Phase 1 建立。当前仓库不提供可运行产品，也不应对外宣称已经进入稳定版本。

## 开发准备

开始实现前先阅读：

1. `PROJECT.md`
2. `ARCHITECTURE.md`
3. `TASKS.md`
4. `docs/SECURITY_BASELINE.md`
5. `AGENTS.md`

## License

许可证尚未最终确定。公开发布前必须从 `docs/LICENSE-DECISION.md` 中完成选择并加入正式 `LICENSE` 文件。在此之前，仓库内容默认保留全部权利，不应被描述为已经完成许可证发布。

