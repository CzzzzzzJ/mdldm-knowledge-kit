<div align="center">

# mdldm Knowledge Kit

**把项目交给你的 Agent，搭建一个支持图文、视频、会员订阅和单课购买的独立知识站。**

面向有 Vibe Coding 能力、希望经营自己知识产品的创作者。

[![Release](https://img.shields.io/github/v/release/CzzzzzzJ/mdldm-knowledge-kit)](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/releases/latest)
[![CI](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/actions/workflows/ci.yml)
[![pnpm](https://img.shields.io/badge/pnpm-10.14.0-f69220.svg)](package.json)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

[15 分钟启动](START_HERE.md) · [交给 Agent](AGENT_QUICKSTART.md) · [部署上线](AGENT_SERVERLESS_DEPLOY.md) · [查看 Demo](docs/DEMO.md)

[麦当的知识站](https://www.mdldm.club/) · [X / Twitter](https://x.com/czzzzzzJ_) · [联系作者](#联系作者)

</div>

![只含虚构数据的 mdldm Knowledge Kit 首页](docs/assets/home.png)

> 这个项目不是把麦当原站原样公开，而是把真实知识站里可复用的内容、交易、权益、学习和运营闭环重新做成公共核心。真实用户、订单、课程、密钥和私有服务从未进入 Demo。

## 你最终会得到什么

| 能力 | 可以做什么 |
| --- | --- |
| 内容 | 发布图文课、视频课、混合系列和下载资料 |
| 付费 | 同时经营全站会员和单课购买 |
| 学习 | 按权益阅读、播放、下载并保存学习进度 |
| 后台 | 管理品牌、主题、内容、商品、用户、订单和故障 |
| 部署 | 让 Coding Agent 按一条 Serverless 路线完成配置与检查 |
| 反馈 | 生成脱敏 Agent Report，再由你确认是否提交 Issue |

**不录视频，也可以在这里发布和销售文档型教程。** Article 图文课与 Video 视频课使用同一套商品、订单和权益系统。

## 它适不适合你

| 适合 | 暂不适合 |
| --- | --- |
| 有内容、课程或知识产品 | 希望零配置获得官方托管 SaaS |
| 会使用 Codex、Claude Code 等 Coding Agent | 完全不使用 Agent，也不准备接触 Git 和环境变量 |
| 想持有自己的代码、数据库和第三方账号 | 第一版就需要完整生产 Docker、多租户或复杂营销系统 |
| 愿意先跑通最小闭环，再逐项开启外部能力 | 需要微信小程序、返佣、提现或麦当私有业务插件 |

第一版只维护 **Agent + Serverless** 这一条线上路径。Docker Compose 只负责本地 MongoDB，不是生产部署方案。

## 交给 Agent 开始

在 Codex、Claude Code 或其他 Coding Agent 中打开仓库，然后直接发送：

```text
你正在 mdldm Knowledge Kit 仓库中工作。

目标：使用项目唯一官方 Agent + Serverless 路径，帮我建立一个可以发布图文、视频，
并支持会员订阅和单课购买的知识站。

请先读取 AGENTS.md 和 AGENT_QUICKSTART.md，然后：
1. 检查 Node.js、pnpm、Docker 和当前工作区；
2. 先完成本地启动，只要求我提供当前启用能力真正需要的信息；
3. 不读取、输出、记录或提交任何密钥；
4. 外部登录、资源创建、付费、真实写入和 Production 发布前先向我确认；
5. 引导我在 /admin 两次输入自己的邮箱，创建管理员 1 号并设置正式密码；
6. 完成后运行与改动相称的质量检查；
7. 最后汇报已完成、需要我处理、尚未真实验证和回滚方式。
```

本地启动的完整执行状态机、安全边界和汇报格式见 [Agent Quickstart](AGENT_QUICKSTART.md)。部署、Provider、品牌改造、图文发布和上线验收则从 [Agent 任务接口](AGENT_TASKS.md) 选择对应 Prompt。

## 15 分钟先跑起来

准备 Git、Node.js 20+、Corepack 和已经启动的 Docker Desktop，然后执行：

```bash
git clone https://github.com/CzzzzzzJ/mdldm-knowledge-kit.git
cd mdldm-knowledge-kit
corepack enable
pnpm install --frozen-lockfile
pnpm quickstart:prepare
docker compose up -d mongodb
pnpm check-config
pnpm dev
```

打开 `http://localhost:3000/admin`，两次输入你自己的邮箱。它会成为管理员 1 号；项目没有公共默认管理员或默认密码。请自行保存只展示一次的随机临时密码，再设置正式密码并进入 `/admin/setup`。

需要虚构课程和商品时，在完成管理员初始化后运行：

```bash
pnpm seed-demo
```

每一步的意义、预期结果和失败处理都在 [15 分钟启动指南](START_HERE.md)。项目只支持 pnpm；如果系统里的 `pnpm` 不可用，请先按该指南修复 Corepack，不要改用 npm 生成第二份锁文件。

## 从内容到交付

```text
站长初始化
  → 设置品牌、主题和能力
  → 发布图文或视频内容
  → 创建会员或单课商品
  → 学员注册并完成购买
  → 服务端发放权益
  → 阅读、观看、下载并保存进度
```

默认使用 Manual Payment，所以没有自动支付账号也能先经营和人工确认订单；OSS、SMTP、XorPay 和外部告警只在需要时开启。未启用的能力不会要求你填写对应密钥。

当前内置“麦当 mdldm”和“极简知识库”两套主题，站长可在 `/admin/site` 切换；主题只改变视觉 Token，不改变价格、内容和权限规则。

## 官方部署路径

```text
Coding Agent
  → Vercel / Next.js Serverless
  → MongoDB Atlas
  → 按需：阿里云 OSS、SMTP、XorPay、Webhook
```

生产最低核心配置只有 `APP_URL`、`MONGODB_URI`、`AUTH_SECRET` 和 `INITIAL_SETUP_TOKEN`。媒体、邮件、自动支付和外部告警按能力开启；完整变量、平台步骤、验证与回滚统一见 [Agent + Serverless 部署协议](AGENT_SERVERLESS_DEPLOY.md)。

Vercel 是否适合你的中国大陆用户，必须用正式域名和目标网络实测，不能由部署成功推断。当前 Docker Compose 仅用于本地数据库；完整自维护 Docker 不属于第一版免费官方路线。

## 当前状态

| 已自动验证 | 仍需站长真实验收 |
| --- | --- |
| L1 领域、L2 服务/Provider Contract、L3 API 安全 | 全新 Atlas、OSS、SMTP 与可选 XorPay 账号 |
| Mock 自动支付和 Manual 人工确认两套 L4 | 备份恢复演练与真实邮件/支付链路 |
| 图文、视频、会员、单课与主要拒绝路径 | 至少两个中国大陆网络点的正式域名体验 |
| 生产构建、依赖许可证和公开仓库扫描 | Preview 与 Production 的最终发布确认 |

因此，当前仓库是可以运行和继续改造的公共核心，但还不能把“代码测试通过”写成“你的生产环境已经验收通过”。正式发布前按 [L5 发布验收](docs/L5_RELEASE_ACCEPTANCE.md) 留下脱敏证据。

## Explore 与反馈

Explore Guide 正在征集首批基于本项目搭建的知识站，不虚构案例数量。提交时只提供公开首页和简短介绍，不要提交后台地址、测试账号或第三方配置。

- [报告可复现错误](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/issues/new?template=01-bug.yml)
- [提出功能建议](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/issues/new?template=02-feature.yml)
- [提交脱敏 Agent Report](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/issues/new?template=03-agent-report.yml)
- [申请加入 Explore Guide](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/issues/new?template=04-explore-submission.yml)
- [私密报告安全漏洞](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/security/advisories/new)

排障先运行：

```bash
pnpm run doctor
pnpm run doctor --issue
```

第二条命令只会在被 Git 忽略的 `.mdldm/` 中生成脱敏草稿，**不会登录 GitHub，也不会创建或提交 Issue**。请人工检查后再决定是否公开。这里必须写 `pnpm run doctor`：pnpm 10 自带同名内置命令，直接运行 `pnpm doctor` 不会调用本项目脚本。

## 联系作者

本项目由 **麦当mdldm** 发起。你可以按下面的方向联系我：

- 项目 Bug、功能建议和 Agent 诊断：优先使用上面的 GitHub Issue；
- 基于本项目搭建的知识站：提交 Explore，也欢迎分享真实使用反馈；
- 课程合作、品牌合作、企业 AI 培训与技术咨询：通过 [X / Twitter](https://x.com/czzzzzzJ_) 或 [个人联系页](https://www.mdldm.club/about) 联系；
- 想继续看 AI Agent、Vibe Coding 和知识产品实战内容：访问 [麦当的知识站](https://www.mdldm.club/)，或在 B 站、小红书、抖音、掘金等中文平台搜索 **麦当mdldm**。

安全漏洞不要通过社交媒体或公开 Issue 发送，请使用 [GitHub Private Security Advisory](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/security/advisories/new)。

## 文档主线

第一次使用只走这四步：

1. [15 分钟启动](START_HERE.md)：在本地得到可创建管理员的知识站；
2. [Agent Quickstart](AGENT_QUICKSTART.md)：让 Agent 按安全协议执行；
3. [Agent + Serverless 部署](AGENT_SERVERLESS_DEPLOY.md)：配置唯一官方线上路径；
4. `/admin/setup`：在站长后台完成开站配置并正式上线。

备份、升级、安全、测试、Provider 和贡献文档不再平铺在 README；需要时从 [文档中心](docs/README.md) 进入。进阶 Docker、多平台迁移、规模化运维和知识产品运营见 [《麦当知识站实战》入口与授权边界](docs/PAID_PRACTICE_GUIDE.md)，免费核心不依赖该教程才能启动和经营基础站点。

## License 与品牌边界

公共核心采用 [Apache License 2.0](LICENSE)：允许使用、修改和商业部署，但需要遵守许可证与必要声明。依赖许可证见 [Third-party notices](THIRD_PARTY_NOTICES.md)，仓库截图来源与分发结论见 [素材清单](docs/assets/README.md)。

Apache-2.0 不授予 `mdldm`、麦当名称、Logo 或其他品牌标识的商标权。公开运营自己的 Fork 前，请按 [商标与品牌使用说明](TRADEMARKS.md) 更换站点品牌；付费教程和外部商业内容使用独立版权与授权条款。

参与开发前请阅读 [贡献指南](CONTRIBUTING.md)。
