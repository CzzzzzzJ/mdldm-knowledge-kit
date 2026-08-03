# Agent 任务接口

本文件是 `mdldm Knowledge Kit` 面向 Coding Agent 的任务路由。站长只需要选择一种任务，
补充非敏感目标，再把对应 Prompt 完整交给当前仓库中的 Agent。

先运行：

```bash
pnpm agent:status
```

它只输出项目版本、生命周期、Provider 名称、能力状态、变量名和下一步，不输出站点域名、
数据库 URI、邮箱、Token、Bucket、环境变量值或业务数据。若生命周期是 `unknown`，Agent
必须先修复配置或数据库连接，不能猜测站点已经上线。

需要把可复现诊断交给维护者时运行 `pnpm run doctor --issue`。它只生成被 Git 忽略的本地
草稿，不登录 GitHub，也不提交 Issue；人工检查脱敏结果后，仍由站长本人决定是否公开。

## 1. 所有任务共用的安全契约

### Agent 可以读取和修改什么

开始前必须阅读 `AGENTS.md` 规定的治理文件，并运行 `git status --short`。随后按任务最小
范围读取：

| 任务 | 优先读取 | 允许修改的主要范围 |
| --- | --- | --- |
| 本地启动 | `START_HERE.md`、`AGENT_QUICKSTART.md` | 本地忽略文件与运行状态；默认不修改受版本控制文件 |
| Serverless 部署 | `AGENT_SERVERLESS_DEPLOY.md`、`vercel.json` | 部署文档和必要仓库配置；环境变量只进入用户的部署平台 |
| Provider 配置 | `docs/CAPABILITY_MATRIX.md`、`docs/DEPLOYMENT.md` | `config/`、对应 `providers/`、验证脚本、测试和 ADR |
| 品牌改造 | `docs/DESIGN_SYSTEM.md`、站点设置代码 | `app/`、`components/`、样式 Token 和用户明确提供的公开素材 |
| 图文发布 | 内容模型、Catalog、Learning、Entitlement | 仅在仓库已经支持相应内容类型时修改对应领域、后台和测试 |
| 上线验收 | `docs/PROVIDER_VALIDATION.md`、`docs/RELEASE.md` | 默认只读；发现代码缺陷后才修改最小相关文件和测试 |

除非任务确实改变模块边界、核心模型或外部接口，否则不要新增抽象。改变这些边界时必须
新增 ADR，并同步 `TASKS.md`。

### 敏感信息禁区

Agent 不得读取后再输出、复制、总结或提交以下内容：

- `.env*` 中的值、Vercel Secret、数据库 URI、AccessKey、Token、密码和支付密钥；
- 真实邮箱、用户、订单、收益、支付回调原文和对象存储标识；
- `.vercel/` 身份信息、备份、导出、运行数据、私有原项目和 `.local-planning/`；
- 未经用户批准的站点截图、品牌素材、域名和第三方控制台信息。

可以说明“变量是否存在、Provider 名称、检查是否通过、需要哪个变量名”，但不能回显值。

### 必须由用户确认的外部动作

以下动作在执行前必须单独说明目标、影响、费用和回滚方法，并等待用户明确确认：

- 登录第三方平台、创建或删除资源、实名与审核；
- 发送真实邮件、创建支付订单、扣款、上传或删除远端对象；
- 写入或迁移远端数据库、恢复备份；
- Production 部署、域名、DNS、回调地址和公开访问变更；
- `git push`、提交 Issue、创建 PR、Release 或向外部社区发布。

只读检查、本地测试和用户已明确授权的当前仓库代码修改不需要重复确认。

### 质量命令与回滚点

所有任务开始前记录当前分支、`git status --short` 和基准提交。不得使用
`git reset --hard`、覆盖用户改动或删除失败测试。

| 改动 | 最低质量门 |
| --- | --- |
| 文档或 Prompt | 相关文档契约测试、`pnpm release:audit` |
| 配置或 Provider | `pnpm check-config`、相关单测、`pnpm check` |
| 页面或后台 | 相关分层测试、`pnpm check`；主旅程变化增加 `pnpm test:l4` |
| 认证、权益、支付 | L1-L3、`pnpm check`、`pnpm test:l4` |
| 上线前验收 | `pnpm check:serverless`、`pnpm check`、`pnpm test:l4`、`pnpm release:audit` 和人工 L5 |

回滚只撤销本任务创建的文件或提交。外部平台使用 Preview、平台历史部署或已验证备份回滚；
没有备份和恢复证据时，不执行生产迁移。

## 2. 标准本地启动 Prompt

```text
请帮我完成 mdldm Knowledge Kit 的本地启动。

先遵守 AGENTS.md，再阅读 START_HERE.md、AGENT_QUICKSTART.md 和 AGENT_TASKS.md。
先运行 git status --short 和 pnpm agent:status，只完成本地 Demo 启动。

不要读取或输出 .env.local 的值，不要访问私有原项目或 .local-planning，不要配置生产
Provider，不要创建第三方资源，不要提交或推送 Git。

依次检查 Node.js、Corepack、pnpm、Docker 和端口，执行冻结安装、
pnpm quickstart:prepare、启动本地 MongoDB、pnpm check-config、启动应用并验证
/api/health?deep=1。然后让我自己打开 /admin，两次确认邮箱、保存一次性临时密码并设置
正式密码；不要索取任何账号密码。导入虚构 Demo 前再次询问我。

失败时给出失败步骤、可验证原因和下一条安全修复命令。最终按 PASS / NEEDS_USER_ACTION /
BLOCKED 汇报实际证据和回滚点。
```

## 3. Agent + Serverless 部署 Prompt

```text
请把当前 mdldm Knowledge Kit 仓库部署成一个隔离的 Vercel Preview。

先遵守 AGENTS.md，阅读 AGENT_TASKS.md 和 AGENT_SERVERLESS_DEPLOY.md，并运行
git status --short、pnpm agent:status、pnpm check:serverless。只使用 pnpm 和仓库已有
vercel.json；不要改成 Docker 或第二套生产路径。

先给出 Preview 与 Production 的变量名清单和资源隔离方案，不读取、打印或粘贴任何变量
值。任何 Vercel 登录、项目创建、外部资源创建、写入和部署都先说明影响并等待我确认。
Preview 成功后执行浅层与深度健康检查，但不能把技术检查写成 L2/L3 或中国大陆网络验收
通过。Production 是第二次独立确认，未经确认不得发布。

完成后报告部署目标、脱敏检查结果、仍需人工完成的第三方事项、质量门和平台回滚入口。
```

## 4. Provider 配置 Prompt

```text
请为当前 mdldm Knowledge Kit 配置这个能力：[MongoDB / OSS / SMTP / Manual / XorPay /
Webhook]。我的非敏感目标是：[描述用途，不要填写任何密钥或真实标识]。

先遵守 AGENTS.md，阅读 AGENT_TASKS.md、docs/CAPABILITY_MATRIX.md、
docs/DEPLOYMENT.md 和对应 Provider/ADR。运行 pnpm agent:status 和 pnpm check-config，
只报告 Provider 名称、变量名、状态和错误分类，不输出环境变量值。

先做 L0 配置检查，再做无副作用 L1 连接检查。需要第三方登录、创建资源、发送邮件、
创建支付订单、上传对象、写数据库或产生费用时，说明目标和清理方式并等待我确认。不得把
Adapter 已实现写成生产已验证。

如果需要改代码，只修改对应 config、provider、验证脚本、测试和必要 ADR，不绕过
modules/ports。完成后运行相关单测、pnpm check-config 和 pnpm check，并列出 L2/L3 仍需
人工保存的证据。
```

## 5. 品牌改造 Prompt

```text
请把当前知识站改造成我的品牌。我的非敏感品牌目标是：[名称、定位、公开文案、批准的
颜色和素材路径]。

先遵守 AGENTS.md，阅读 AGENT_TASKS.md、docs/DESIGN_SYSTEM.md，并运行
pnpm agent:status。先判断哪些内容应该通过 /admin/site 配置，哪些才需要改 app、
components 或统一设计 Token。优先让站长从 `mdldm / minimal` 两套内置主题中选择；只有
两者都不能表达目标时才新增白名单主题。不要把日常品牌事实硬编码进 TypeScript，不要改动身份、
Entitlement、服务端商品价格和 Provider 边界。

只使用我明确提供或批准的公开素材，不自动生成图片，不复制私有原站资产，不读取真实
用户或运营数据。页面改动先复用现有组件和配色系统，并保持移动端、键盘可用性和空状态。

完成后运行相关测试与 pnpm check；若改变首页或关键导航，再运行相关 E2E。报告后台仍可
配置的内容、代码改动、可视化验收地址和仅撤销本任务改动的回滚点。
```

## 6. 图文发布 Prompt

```text
请把我提供的非敏感内容整理为当前知识站可交付的图文知识产品。内容来源是：[本地文件或
已授权材料路径]，目标权益是：[公开 / 登录 / 会员 / 单课 / 系列]。

先遵守 AGENTS.md，阅读 AGENT_TASKS.md，并运行 pnpm agent:status。当前仓库已支持
`article` 纯文本正文与 `video` 两种课时类型；Markdown、富文本、Mixed 和图文阅读进度尚未
实现。默认把已授权内容整理成安全纯文本，不得直接渲染 HTML、把 Markdown 塞进视频字段、
直接写 MongoDB 或绕过 Entitlement。若任务必须依赖尚未实现的格式，返回 BLOCKED 和缺失项。

只有能力真实存在时，才通过后台或正式应用服务创建草稿。正文保持纯文本并由 React 转义，
不得注入 HTML 或危险链接；付费正文必须由服务端权益保护。发布、通知学员和任何远端资料
上传前先让我确认。

完成后验证访客、无权益用户和有权益用户三种读取结果，运行相关单测、pnpm check，并在
权限或主旅程改变时运行 `pnpm test:l4`。报告草稿/已发布状态和回滚方法。
```

## 7. 上线验收 Prompt

```text
请对当前 mdldm Knowledge Kit 做上线前验收，但先不要发布 Production。

遵守 AGENTS.md，阅读 AGENT_TASKS.md、AGENT_SERVERLESS_DEPLOY.md、
docs/PROVIDER_VALIDATION.md、docs/BACKUP_AND_RECOVERY.md 和 docs/RELEASE.md。运行
pnpm agent:status、pnpm check:serverless、pnpm check、pnpm test:l4、
pnpm release:audit，并只记录脱敏证据。

把结果分成：仓库质量、生命周期、Preview 健康、Provider L0/L1、隔离 L2/L3、备份恢复、
中国大陆多网络和人工事项。没有真实证据的项目必须标记 NEEDS_USER_ACTION，不得从配置
存在推断生产可用。

真实邮件、支付、对象写入/删除、恢复演练、域名检查和 Production 发布逐项说明影响，等待
我确认后再执行。最终给出 PASS / NEEDS_USER_ACTION / BLOCKED、阻断项、证据位置和平台
回滚入口；不要自动创建 Release、推送 Git 或公开 Issue。
```

## 8. Agent 最终汇报格式

```text
状态：PASS | NEEDS_USER_ACTION | BLOCKED
当前生命周期：uninitialized | configuring | live | unknown
完成的任务：
- ...
实际验证：
- 命令/页面：结果（不含敏感值）
需要站长确认：
- 外部动作、影响、费用或公开范围
未验证：
- L2/L3、真实支付、真实邮件、备份恢复或网络点
回滚点：
- 本地提交/改动文件或平台历史部署
```

命令成功不等于真实业务成功；浏览器页面可见也不等于外部邮件、支付、对象存储或备份恢复
已完成。Agent 必须报告实际观察到的最终结果。
