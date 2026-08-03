# 贡献指南

感谢你参与 `mdldm Knowledge Kit`。

## 当前阶段

`v0.1.x` 已进入公开维护。开始提交功能前，请先搜索现有 Issue，确认变更符合 `PROJECT.md` 的产品边界；较大的模型、Provider 或接口改动应先提出设计 Issue 或 ADR。

## 本地准备

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
docker compose up -d mongodb
pnpm check-config
```

需要完整 Demo 时，再创建虚构管理员并运行 `pnpm seed-demo`。第一次使用只走
`START_HERE.md`；其他文档按任务从 `docs/README.md` 进入。

## 开发流程

1. Fork 仓库，从 Issue 选择一个边界明确的任务；
2. 如涉及模型、模块或 Provider 边界，先提交 ADR；
3. 从最新 `main` 创建独立分支完成实现；
4. 补充测试和文档；
5. 按 `docs/TESTING.md` 选择分层测试，运行 `pnpm check`、`pnpm release:audit`，高风险
   变更还要运行 `pnpm test:l4`；
6. 提交 Pull Request，说明动机、行为变化、验证结果和风险。

建议使用 Conventional Commits，例如：

```text
feat: add a storage provider
fix: reject expired entitlements
docs: clarify Atlas setup
```

## Pull Request 最低要求

- 不包含真实业务数据或私有配置；
- 不绕过统一权限和定价服务；
- 新增环境变量同步更新 `.env.example`；
- 新增 Provider 同时提供配置校验和失败行为；
- 核心逻辑有测试；
- 用户可见变化有文档或截图；
- 不把个人品牌和固定外部服务写进核心。

Pull Request 模板中的自检项必须如实填写。测试暂时无法运行时，需要说明原因、风险和人工验证方式，不能删除失败测试来换取通过。

## 贡献许可

除非贡献者明确另行书面声明，提交到本仓库并被接受的贡献将按照 Apache License 2.0 授权，且不附加额外条款。

贡献代码不代表获得 `mdldm`、麦当名称、Logo 或其他品牌标识的使用权。公开运营 Fork
前请阅读 `TRADEMARKS.md` 并更换自己的站点品牌。

## 安全问题

不要通过公开 Issue 披露可利用的安全漏洞。请按 `SECURITY.md` 的方式报告。
