# ADR 0017：Agent Doctor 与人工确认的 Issue 流程

- 状态：Accepted
- 日期：2026-08-03

## 背景

AF-07 已经提供任务级 Prompt、脱敏生命周期状态和后台故障交接，但用户遇到安装、配置或
运行问题时，仍需要自己判断哪些信息可以公开。直接让 Agent 读取日志、环境变量或第三方
平台页面，会增加 URI、Token、邮箱、Bucket、域名和真实业务数据进入公开 Issue 的风险。

项目同时希望让 Agent 生成可复现报告，但外部提交必须继续由人类明确确认，安全漏洞也不
能流入公开 Issue。

## 决策

1. 在 `modules/operations/doctor.ts` 定义纯领域报告、固定检查码、隐私扫描和 Markdown
   草稿渲染；脚本层只负责读取安全的本地事实与写入忽略目录。
2. `pnpm run doctor` 只输出项目版本、Node/pnpm 版本、站点生命周期、Provider 名称、能力
   状态、所需变量名和固定检查结果，不输出环境变量值、底层错误、绝对路径或业务记录。
3. Git 状态只允许输出 `clean / dirty / unknown`，不列出分支、用户名、远端地址或改动
   文件名。
4. `pnpm run doctor --issue` 先对完整草稿做本地隐私扫描，再以 `0600` 权限写入被 Git 忽略的
   `.mdldm/agent-report-*.md`；扫描失败时不生成草稿。
5. Doctor 不调用 `gh`、GitHub API 或浏览器，不登录 GitHub，也不创建、更新或提交 Issue。
   草稿必须由用户人工检查并自行决定是否复制到公开模板。
6. 保留 Bug 与 Feature 模板，新增 Agent Report 与 Explore Submission。Agent Report 强制
   确认可复现、已脱敏和人工提交；Explore 只接收站长主动授权公开的站点与素材。
7. 可利用漏洞、密钥暴露和其他安全问题继续只走 GitHub Private Security Advisory。
8. 发布审计把 `.mdldm/` 视为禁止发布路径，即使忽略规则被破坏也必须阻断。
9. pnpm 10 已经占用 `pnpm doctor` 作为内置命令，仓库脚本不能覆盖它；因此公开命令必须
   显式写为 `pnpm run doctor`，避免误执行 pnpm 自身诊断。

## 备选方案

### 自动调用 GitHub CLI 创建 Issue

拒绝。自动提交会跨越公开发布边界，也可能在用户检查前泄露本地信息。

### 直接附加完整日志和配置诊断

拒绝。日志和配置值不能可靠地区分公开信息、个人数据与第三方凭据。

### 只提供手写 Issue 模板

拒绝。它无法给 Agent 提供一致、可测试和可复现的版本、能力与检查事实。

## 影响

- 用户可以用一个命令获得统一诊断，并用第二个命令生成可人工审核的报告草稿；
- 报告可能只给出固定错误分类，不会包含底层连接错误，因此进一步排障仍应在本地完成；
- `.mdldm/` 属于本地临时产物，不是项目文档或提交材料；
- Explore Submission 只是公开收集入口，展示、审核与失效规则在 AF-09 实现；
- Doctor 的 `PASS` 仅代表本地可读检查通过，不代表 Provider L2/L3、真实支付、真实邮件或
  Production 已验收。
