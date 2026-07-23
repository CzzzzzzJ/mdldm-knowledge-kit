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

- TODO：唯一邮箱注册入口；
- TODO：邮箱验证、登录、退出、找回和修改密码；
- TODO：服务端固定新用户角色；
- TODO：Cookie、CSRF、CORS、安全 Header 和速率限制；
- TODO：Entitlement 模型与统一鉴权服务；
- TODO：`public / registered / member / course / series` 权限矩阵；
- TODO：邀请码授予权益；
- TODO：越权与到期回收测试。

退出条件：权限矩阵通过自动化测试，越权请求全部失败。

## Phase 4：交易与支付

- TODO：Product、Order、OrderItem 和 PaymentEvent；
- TODO：服务端 SKU 定价；
- TODO：Manual Payment Provider；
- TODO：Mock Payment Provider；
- TODO：XorPay Adapter；
- TODO：Webhook 验签、幂等和失败重放；
- TODO：支付与授权事务边界；
- TODO：订单后台。

退出条件：客户端无法篡改金额，重复回调不会重复授予权益。

## Phase 5：后台与监控

- TODO：用户、课程、订单、权益、媒体和学习数据总览；
- TODO：支付、转码、邮件和存储失败队列；
- TODO：`/api/health`；
- TODO：结构化日志和 ErrorReporter；
- TODO：通用 Webhook 告警；
- TODO：数据导出、备份和恢复说明。

退出条件：管理员无需查看服务器日志即可发现主要故障。

## Phase 6：公开发布

- TODO：全新环境 15 分钟安装测试；
- TODO：虚构 Demo 数据、截图和演示课程；
- TODO：部署、Provider、升级、备份和回滚文档；
- TODO：依赖、安全、隐私和密钥扫描；
- TODO：贡献指南、Issue 模板和 Release 流程；
- TODO：发布 `v0.1.0`。

退出条件：陌生贡献者只读 README 即可跑通发布和学习主流程。
