# ADR 0016：Agent-first 任务与脱敏状态接口

- 状态：Accepted
- 日期：2026-08-03

## 背景

项目已经有本地启动和 Serverless 部署文档，但不同任务的 Prompt、权限边界、质量门和
回滚规则分散在多个页面。站长后台的故障也只能显示给人看，Agent 无法用统一、脱敏的
事实判断站点处于未初始化、配置中还是已经开站。

直接把环境变量、错误详情或后台导出交给 Agent 会泄露 URI、Token、邮箱、Bucket、域名
和业务数据；让 Agent 直接提交 Issue 或执行 Production 变更也超出站长的审批边界。

## 决策

1. 根目录 `AGENT_TASKS.md` 作为任务级 Agent 接口，提供本地启动、Serverless 部署、
   Provider 配置、品牌改造、图文发布和上线验收六种标准 Prompt；
2. 所有 Prompt 共用可编辑范围、敏感信息禁区、外部状态审批、质量门和回滚契约；
3. `pnpm agent:status` 输出版本、生命周期、Provider 名称、能力状态和变量名，不输出
   APP_URL、APP_NAME、环境变量值、邮箱、URI、Token、Bucket、域名或业务数据；Provider
   只表示当前选择的配置，不声称已经通过外部 L2/L3；
4. 管理员可通过受保护的 `/api/admin/agent-context` 读取同一份 `no-store` JSON；未登录
   不能访问，读取失败只返回固定错误码，不返回底层连接错误；
5. 系统后台可复制通用诊断 Prompt；单条失败只把 category、code、provider 和次数交给
   Agent，不复制 detail、sourceId、用户信息或原始载荷；
6. 生命周期无法读取时必须返回 `BLOCKED / unknown`，不得从页面可见或配置存在推断已上线；
7. 图文 Prompt 在 AF-06 能力尚未实现时必须明确阻断，不能绕过正式内容模型和 Entitlement；
8. Issue 草稿和外部提交属于 AF-08，AF-07 不自动创建或提交 GitHub Issue。

## 备选方案

### 只维护 README 中的一段万能 Prompt

入口更短，但部署、品牌、Provider 和故障排查的权限与质量门不同，万能 Prompt 容易扩大
读取范围或执行未授权外部动作。

### 把完整健康检查和后台错误原文交给 Agent

信息更多，但错误详情、外部标识和用户数据可能进入聊天、日志或 Issue，不符合安全基线。

### 让 Agent 直接读取数据库判断状态

会把数据层结构和凭据暴露给每个 Agent。统一应用服务与受保护接口可以保持最小事实面。

## 影响

- 新增 Agent 状态 JSON 属于稳定的外部接口，字段变化需要同步测试和文档；
- `agent:status` 返回非零且生命周期为 `unknown` 时，Agent 应停止后续上线判断；
- 后台复制的 Prompt 只用于定位，不能替代管理员查看详情和批准处理动作；
- AF-08 将在这一脱敏状态之上增加 Doctor 与 Issue 草稿，但仍保留人类提交确认点。
