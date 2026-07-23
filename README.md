# mdldm Knowledge Kit

一套面向个人创作者的、自托管的知识产品交付与会员运营底座。

项目由麦当 mdldm 发起，来自一个已经稳定运行的真实知识站实践。这里不会公开复制原站，而是重新提炼其中可复用的课程交付闭环，并将个人 IP、真实业务数据和私有服务隔离在公共核心之外。

> 当前阶段：`v0.1 development / Phase 2 course delivery`
>
> 应用骨架、课程目录、本地 MP4、资料下载、学习进度和受控课程后台已经可运行。

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
- [原项目 Phase 1 参考审视](docs/analysis/原项目Phase1参考审视-2026-07-24.md)
- [开发路线图](docs/ROADMAP.md)
- [本地开发](docs/DEVELOPMENT.md)
- [安全基线](docs/SECURITY_BASELINE.md)
- [架构决策](docs/decisions/README.md)
- [贡献指南](CONTRIBUTING.md)

## 技术基线

- Next.js 15.5
- React 19.2
- TypeScript 5.9
- MongoDB / Mongoose 8
- Tailwind CSS 4
- 单仓模块化架构
- 本地存储、Mock 支付和 Console 邮件作为默认开发 Provider

当前可以运行课程交付 Demo，但注册、正式权益授予、支付和生产 Provider 尚未完成，不应对外宣称已经进入稳定版本。

## 快速启动

```bash
npm install
cp .env.example .env.local
docker compose up -d mongodb
npm run check-config
npm run create-admin -- \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password"
npm run seed-demo
npm run dev
```

打开 `http://localhost:3000`。首次启动前请在 `.env.local` 中替换 `AUTH_SECRET` 占位值，完整说明见 [本地开发](docs/DEVELOPMENT.md)。

## 质量检查

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## 开发准备

开始实现前先阅读：

1. `PROJECT.md`
2. `ARCHITECTURE.md`
3. `TASKS.md`
4. `docs/SECURITY_BASELINE.md`
5. `AGENTS.md`

## License

本项目公共核心采用 [Apache License 2.0](LICENSE)。该许可证不授予 `mdldm`、麦当相关名称、Logo 或其他商标的额外使用权。
