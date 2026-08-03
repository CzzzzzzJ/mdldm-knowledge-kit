# ADR 0019：Query Service、安全 DTO 与渐进式工程边界

- 状态：Accepted
- 日期：2026-08-03

## 背景

Phase 7 已补齐首页、课程发现、学习中心和分区后台，但多个 Next.js
Page 和 Route Handler 仍直接导入 Mongoose Model。这会让页面同时承担展示、
数据查询、权限与序列化责任，也会让 Agent 在修改 UI 时误触商品价格、
Entitlement 或内部数据库字段。

## 决策

1. Page、Route Handler 和 Client Component 不直接导入 MongoDB Model；
2. Catalog、User 和 Learning 建立 Query Service，Commerce 后台读模型同步建立
   Query Service；
3. Query Service 依赖定义在 `modules/` 的 Repository Port，MongoDB 实现位于
   `providers/database/mongodb/repositories/`；
4. Provider 将 ObjectId、Mongoose Document 和数据库内部字段转换为安全
   DTO，Page 和 Client Component 只接收 DTO；
5. 学习页的视频、资料和访问结果由 Learning Query Service 统一计算，
   无权时不返回媒体或资料 DTO；
6. 登录、商品管理、课程发布、学习进度、媒体交付和媒体上传先迁入
   应用服务，Route Handler 只做输入校验、授权和 HTTP 响应映射；
7. 不进行全仓一次性 Repository 重写。现有命令服务只在被真实功能修改时
   继续下沉 Port，但不允许数据库调用重新回流到 Page 或 Route Handler。

## 安全 DTO 约束

- ID 一律是字符串，日期在跨越组件边界时一律是 ISO 字符串；
- 不返回 `passwordHash`、Session、Token、支付载荷、存储 `objectKey` 或 Mongoose
  Document 方法；
- 商品价格和权益继续以服务端 Product / Entitlement 为事实源；
- 无权学习响应不包含可播放媒体和可下载资料信息。

## 备选方案

### 一次性重写全部数据访问

边界最整齐，但回归风险和验收成本过高，会阻断 Phase 7 的可运营补齐。

### 只用文档约定

无法阻止后续 Agent 把 Model 重新导入 Page 或 Client Component。

## 影响

- 架构测试会阻止 Page、Route Handler 和 Client Component 直连 MongoDB；
- Query Service 可注入伪 Repository 独立测试；
- MongoDB 查询优化与页面展示可以独立变更；
- 新增读页面应先扩展已有 Query Service，不得在 Page 中调用 Model；
- 实际 Bundle 仍需由生产构建验证，静态边界测试作为回归防线。
