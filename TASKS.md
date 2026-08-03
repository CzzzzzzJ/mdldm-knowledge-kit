# 开发任务

状态约定：`TODO`、`IN PROGRESS`、`BLOCKED`、`DONE`。

## Phase 0：边界与治理

- DONE：创建无私有 Git 历史的新仓；
- DONE：归档现状分析、迁移映射和目标拓扑；
- DONE：明确 v0.1 核心、可选和不进入范围；
- DONE：建立安全基线和仓库协作规则；
- DONE：正式英文展示名使用 `mdldm Knowledge Kit`，见 ADR 0001；
- DONE：公共核心采用 Apache-2.0，见 ADR 0002；
- DONE：v0.1 同时支持全站订阅会员与单课购买，见 ADR 0003；
- DONE：为旧站功能补齐 `core / optional / private / drop` 清单。

退出条件：产品名、许可证、v0.1 权益范围均有正式决策记录。

## Phase 1：应用骨架

- DONE：初始化 Next.js、React、TypeScript 和 Tailwind；
- DONE：建立 `modules/`、`providers/`、`config/` 模块边界；
- DONE：接入 MongoDB Adapter；
- DONE：实现 Feature Flags 和站点配置；
- DONE：加入 `.env.example`、Docker Compose 和配置校验；
- DONE：实现 `create-admin`、`seed-demo` 和 `check-config`；
- DONE：建立 Lint、类型检查、单测、构建和 E2E CI。

退出条件：在无支付、OSS、SMTP 配置时可启动 Demo 站。

## Phase 2：课程交付闭环

- DONE：Series、Course、CourseMaterial 和 CourseProgress；
- DONE：后台系列与课时管理；
- DONE：统一 MediaAsset；
- DONE：Local Storage Provider；
- DONE：本地 MP4 播放和安全下载；
- DONE：断点续播和系列进度；
- DONE：发布前媒体可用性校验。

退出条件：管理员能发布一节课，普通用户能观看、续播和下载授权资料。

## Phase 3：身份与权益

- DONE：唯一邮箱注册入口；
- DONE：邮箱验证、登录、退出、找回和修改密码；
- DONE：服务端固定新用户角色；
- DONE：Cookie、CSRF、CORS、安全 Header 和 MongoDB 共享速率限制；
- DONE：Entitlement 模型与统一鉴权服务；
- DONE：`public / registered / member / course / series` 权限矩阵；
- DONE：邀请码授予权益；
- DONE：越权与到期回收测试；
- DONE：Vercel、MongoDB Atlas、阿里云 OSS 与 SMTP 配置文档。

退出条件：权限矩阵通过自动化测试，越权请求全部失败。

## Phase 4：交易与支付

- DONE：Product、Order、OrderItem 和 PaymentEvent；
- DONE：服务端 SKU 定价；
- DONE：Manual Payment Provider；
- DONE：Mock Payment Provider；
- DONE：XorPay Adapter；
- DONE：隔离并记录 XorPay 强制 MD5 线协议的安全边界，业务载荷摘要继续使用 SHA-256；
- DONE：Webhook 验签、幂等和失败重放；
- DONE：支付与授权事务边界；
- DONE：订单后台。

退出条件：客户端无法篡改金额，重复回调不会重复授予权益。

## Phase 5：后台与监控

- DONE：用户、课程、订单、权益、媒体和学习数据总览；
- DONE：支付、转码、邮件和存储失败队列；
- DONE：`/api/health`；
- DONE：结构化日志和 ErrorReporter；
- DONE：通用 Webhook 告警；
- DONE：数据导出、备份和恢复说明。

退出条件：管理员无需查看服务器日志即可发现主要故障。

## Phase 6：公开发布

- DONE：全新环境 15 分钟安装测试；
- DONE：虚构 Demo 数据、截图和演示课程；
- DONE：部署、Provider、升级、备份和回滚文档；
- DONE：依赖、安全、隐私和密钥扫描；
- DONE：贡献指南、Issue 模板和 Release 流程；
- DONE：发布 `v0.1.0`。

退出条件：陌生贡献者只读 README 即可跑通发布和学习主流程。

## Phase 7：Vibe Coding 创作者可运营

- DONE：定义第三方配置后直接运营的真实用户旅程；
- DONE：明确目标用户为稍懂 Git、环境变量和 Vibe Coding、可使用 Agent 的 AI 博主；
- DONE：明确后台、第三方平台和 Agent 的职责边界与 `v0.2.0` 总完成定义；
- DONE：明确环境变量与后台运营设置的边界，见 ADR 0012；
- DONE：从原项目脱敏提取 MongoDB、OSS、SMTP、XorPay、Vercel 与 MPS 配置结构；
- DONE：建立 L0 配置、L1 只读连接、L2 隔离写入和 L3 业务全链路验证分级；
- DONE：提供 `pnpm validate:providers` 无密钥输出验证命令；
- DONE：使用原项目配置完成第一轮 L0/L1 验证并记录脱敏结果；
- DONE：把站长教学入口、逐屏意义、操作、验收与 Agent Prompt 集成进当前知识站；
- DONE：在站长引导中接入当前运行配置和无副作用的深度健康检查；
- DONE：实现严格 SiteSetting 模型、服务、管理员 API 和站点设置表单；
- DONE：把 SiteSetting 接入公开首页、元信息、页头、创作者资料和基础导航；
- DONE：实现分类、Tag、搜索、系列详情和 Tag 聚合的内容发现链路；
- DONE：补齐基础学习中心、系列连续学习、权益入口和学员空状态；
- DONE：按站点、内容、商品、订单和系统拆分基础后台；
- DONE：实现服务端商品、价格、期限、权益目标和上下架后台管理；
- DONE：为 E2E 使用独立数据库并自动准备虚构管理员与 Demo 数据；
- DONE：从原站抽离统一 Neo-brutalism Token 与公开页组件库，并完成 P0 页面风格迁移；
- DONE：移除未批准的自动生成 Demo 图片，默认使用可配置封面或几何封面；
- DONE：实现一次性首个管理员页面、并发 claim 和生产初始化口令；
- DONE：将开站指南迁入独立后台 Shell，并把教学进度保存到站点数据库；
- DONE：增加 `configuring / live` 生命周期、公开页面门禁和正式开站检查；
- DONE：从公开站点导航移除后台入口，并补齐后台用户与站长密码入口；
- DONE：完成 AF-01 pnpm 唯一工具链，固定 10.14.0、唯一锁文件、CI/Vercel 命令、
  安装脚本白名单，并通过全新冻结安装、质量门、E2E、发布与安全审计；
- DONE：完成 AF-02 唯一 15 分钟启动入口，新增 `START_HERE.md`、
  `AGENT_QUICKSTART.md`、安全本地环境准备命令和隔离用户旅程验收；
- DONE：完成 AF-03 首个管理员初始化，使用双邮箱确认、每次部署独立的临时密码、
  一次性展示、强制正式密码轮换、后台门禁、并发保护与受控恢复；
- DONE：完成 AF-04 最低配置与能力裁剪，默认 Manual Payment，仅校验已选择能力，
  OSS/SMTP SDK 按需加载，生产 Console Email 明确关闭自助邮件流程，后台与 Agent 使用
  同一份脱敏能力状态，并建立公开能力矩阵和非公开付费实践文档骨架；
- IN PROGRESS：完成 AF-05 的 Agent + Vercel Serverless 唯一线上协议、`hkg1` 仓库契约、
  Preview/Production 双确认、只读健康检查、脱敏报告与本地 Docker 边界；全新隔离账号
  L2/L3 和至少两个中国大陆网络点的真实验收仍待完成；
- TODO：在最后的 README P0 重构中只暴露 AF-02 这一条推荐启动旅程；
- IN PROGRESS：补齐课程和系列的编辑、排序、预览、安全删除与 Demo 清理；
- IN PROGRESS：补齐用户、权益和分析后台；
- TODO：创建开源版独立 Preview 的 Vercel、Atlas、OSS、SMTP 配置，并按需验证 XorPay；
- DONE：实现一次性首个管理员初始化，`/setup` 兼容重定向到 `/admin/setup`；
- TODO：提供部署、Provider、品牌改造、内容迁移和上线验收的任务级 Agent Prompt；
- TODO：使用隔离第三方测试账号完成 L2 验证；
- TODO：邀请未参与开发、稍懂 Vibe Coding 的 AI 博主完成全新部署和 L3 验收；
- TODO：发布面向运营就绪的 `v0.2.0`。

退出条件：不了解 Next.js、但会使用 Agent 的 AI 博主可以按 README 或 Prompt 完成
独立部署；完成第三方平台配置后，不修改 TypeScript 即可发布第一门课、配置会员或
单课商品，并处理用户、订单、权益和主要故障。视觉与个性化代码改造具有明确扩展边界，
且全新隔离环境的 L2/L3 验收通过。
