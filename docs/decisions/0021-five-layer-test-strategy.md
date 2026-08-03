# ADR 0021：L1-L5 测试分层与发布证据

- 状态：Accepted
- 日期：2026-08-03

## 背景

仓库已经有单测和 Playwright E2E，但测试集中在一个总命令和一个大型浏览器文件中。Agent
无法从失败结果判断是领域、服务、API 还是外部平台问题；Mock 测试还容易被误写成真实
Provider 或 Production 已验收。

## 决策

1. 自动化测试分为 L1 Schema/领域、L2 服务/Provider Contract、L3 API/安全和 L4 用户旅程；
2. L5 专门记录全新环境、真实 Provider、备份恢复、目标网络和 Release 人工验收；
3. Vitest 文件继续按业务模块组织，但每个文件必须只加入一个分层配置；
4. CI 独立显示 L1、L2、L3，生产构建通过后在隔离 MongoDB 执行 L4；
5. L4 把 Mock 自动支付与 Manual 人工支付放在不同端口和 `_e2e` 数据库中，固定单 Worker；
6. `pnpm test` 保留为全部 Vitest 回归，`pnpm check` 顺序执行 L1-L3 与生产构建；
7. L5 没有真实证据时必须为 `NEEDS_USER_ACTION`，不得由 Mock、截图或配置存在推断通过。

## 备选方案

### 只保留一个 test 命令

入口更少，但无法给 Agent、CI 和贡献者提供失败归属，也无法表达外部人工验收的边界。

### 所有 Provider 都做真实 CI

能提高集成覆盖，但需要长期第三方密钥、费用和易变外部状态，不适合公开 Fork。真实验证
继续使用部署者的隔离资源和人工批准。

## 影响

- 新测试需要显式登记到对应 Vitest 配置；
- 认证、权益、支付、正文或媒体主旅程变化必须补 L4；
- Provider Adapter 至少需要 L2 Contract，真实写入与生产可用性仍由 L5 证明；
- 发布清单和 Agent 汇报必须区分仓库自动化结果与外部平台证据。
