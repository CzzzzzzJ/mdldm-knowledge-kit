# Repository Instructions

本文件约束后续在此仓库中工作的开发者和 AI Agent。

## 开始前

依次阅读：

1. `PROJECT.md`
2. `ARCHITECTURE.md`
3. `TASKS.md`
4. `docs/SECURITY_BASELINE.md`
5. 相关 ADR

## 数据与历史隔离

- 不得复制私有原项目仓库的 `.git` 历史。
- 不得批量复制原仓库目录；只能按任务白名单重写或抽取经过审核的通用逻辑。
- 不得加入真实用户、订单、邮箱、评价、回信、聊天记录和收入数据。
- 不得加入真实密钥、Token、Bucket、域名、Chat ID、Webhook 和长期签名 URL。
- Demo 内容必须为虚构数据。

## 架构约束

- 领域规则位于 `modules/`，第三方调用位于 `providers/`。
- 核心模块不得直接导入支付、存储、邮件、转码或监控服务商 SDK。
- 权限统一通过 Entitlement 服务判断，不在页面和路由中散落 `isVIP`。
- 商品价格从服务端 Product/SKU 读取，不接受客户端最终金额。
- 媒体文件统一通过 MediaAsset 管理。
- 外部回调必须验签、留痕、可重放且幂等。
- Provider 未配置时必须明确降级或在启动检查中给出可操作错误。

## 工程规则

- TypeScript 使用严格模式。
- Mongoose Schema 禁止 `strict: false`。
- 所有 API 输入必须进行运行时校验。
- 新增核心业务必须有单元测试；认证、权限和支付必须有 E2E 或集成测试。
- 每次变更同步更新 `TASKS.md` 或相关 ADR。
- 不引入未被当前任务使用的抽象和依赖。

## 提交规则

- 一次提交只解决一个清晰问题。
- 建议使用 Conventional Commits。
- 变更前检查工作区，保留不属于当前任务的用户改动。
- 不用跳过钩子或删除失败测试来换取提交通过。

## 完成定义

任务只有在代码、测试、文档和必要迁移说明都完成后才算完成。若改变模块边界、核心模型或外部接口，必须新增 ADR。
