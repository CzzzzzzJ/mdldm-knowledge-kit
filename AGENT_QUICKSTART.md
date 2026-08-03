# Agent Quickstart 执行协议

本文件给 Codex、Claude Code 和其他 Coding Agent 使用。目标是在不接触生产第三方平台、
不泄露密钥、不覆盖用户改动的前提下，把当前仓库启动成可创建管理员的本地知识站。

用户入口和逐步解释见 [START_HERE.md](START_HERE.md)。本协议定义 Agent 应该读取什么、
允许做什么、如何证明完成，以及失败时如何汇报。

## 1. 任务范围

本任务只包含：

```text
本机前置检查
→ pnpm 冻结安装
→ 本地环境准备
→ Docker MongoDB
→ 配置校验
→ Next.js 开发服务器
→ 深度健康检查
→ 用户在 /admin 创建管理员
→ 用户确认后可选导入虚构 Demo
```

本任务不包含：

- Vercel、Atlas、阿里云、邮件和支付平台账号创建；
- 实名认证、备案、域名购买、DNS 或第三方审核；
- 生产密钥配置；
- 真实付款、邮件发送、对象上传或外部告警；
- 品牌改造、主题开发和内容迁移；
- Git 提交、推送、Issue 提交或 Release。

## 2. 必读文件和停止扩散规则

先读取并遵守根目录 `AGENTS.md` 及其要求的治理文件，然后只为本任务额外读取：

1. `START_HERE.md`；
2. `AGENT_QUICKSTART.md`；
3. `package.json`；
4. `.env.example`；
5. 仅在命令失败时读取对应脚本或错误涉及的文件。

不要为了启动本地 Demo 浏览全部 `docs/`，不要读取 `.local-planning`，不要访问私有原
项目。若现有证据已经足够，不继续扩大读取范围。

## 3. 安全和权限边界

- 开始前运行 `git status --short`，保留所有已有改动；
- 不运行 `git add .`，不提交、不推送、不创建 PR；
- 不打印、复制、总结或回显 `.env.local` 的值；
- 不使用会把环境变量完整输出的诊断命令；
- 不将真实邮箱、密码、Token、URI 或 Bucket 写入仓库；
- `pnpm quickstart:prepare` 可以创建或修复本地 `.env.local`，但不得用模板覆盖已有
  有效配置；
- 可以启动仓库自带的本地 MongoDB；不得自动停止未知容器或占用端口的进程；
- 任何第三方登录、付费、资源创建和外部发布都必须停止并交给用户确认；
- Demo 只能使用仓库内置虚构数据。

## 4. 执行状态机

每一步都必须保留“操作证据”和“结果判断”。上一状态未通过，不进入下一状态。

### Q0：确认仓库与工作区

意义：避免在错误目录执行命令或覆盖用户尚未保存的工作。

执行：

```bash
git status --short
node --version
corepack --version
docker --version
docker compose version
```

通过条件：当前目录的 `package.json` 名称为 `mdldm-knowledge-kit`；Node.js 主版本至少
为 20；Corepack、Docker CLI 和 Compose 可调用。

失败动作：明确缺失的单个前置条件及安装要求，然后停止。不要擅自安装系统级软件。

### Q1：启用并验证 pnpm

意义：项目只接受锁文件中固定的 pnpm 依赖树。

执行：

```bash
corepack enable
pnpm --version
pnpm install --frozen-lockfile
```

通过条件：pnpm 为 `10.14.0`；安装退出码为 0；`pnpm-lock.yaml` 没有被修改。

失败动作：

- 缺少 Corepack：报告 Node.js 安装不完整；
- 冻结锁文件失败：报告具体差异，不删除或重新生成锁文件；
- 网络失败：报告访问失败的注册表，不切换到未经用户确认的镜像。

### Q2：准备本地环境

意义：为身份会话生成独立密钥，同时避免密钥进入 Agent 上下文。

执行：

```bash
pnpm quickstart:prepare
```

通过条件：命令退出码为 0，`.env.local` 存在且保持在 Git 忽略范围；终端没有输出
任何密钥值。

允许记录的证据只有：文件是否创建、命令是否成功、密钥是否被生成。禁止读取后再
输出值。重复运行时必须保留已有有效配置。

### Q3：启动 MongoDB

意义：验证真实数据层，而不是只看到前端静态页面。

执行：

```bash
docker compose up -d mongodb
docker compose ps mongodb
```

通过条件：服务状态为 `healthy`。状态仍为 `starting` 时可以短暂轮询，但单次等待不
超过 60 秒。

失败动作：

- Docker daemon 未运行：要求用户打开 Docker Desktop；
- 27017 被占用：使用只读端口检查定位占用者并停止，等待用户决定；
- 健康检查失败：读取 `docker compose logs --tail 100 mongodb`，不要删除数据卷。

### Q4：验证配置

意义：在启动应用前确认最低变量和已选择 Provider 的配置结构有效。

执行：

```bash
pnpm check-config
```

通过条件：输出“配置校验通过”。默认 Manual Payment 不要求外部支付配置；仅当用户
明确要测试 Mock 支付时才设置 `PAYMENT_PROVIDER=mock`，其提示不算失败。

失败动作：引用错误中的变量名和修复目标，不显示当前值。身份密钥问题优先重新运行
`pnpm quickstart:prepare`。

### Q5：启动应用并验证数据连接

意义：用公开健康接口证明应用、运行配置和 MongoDB 已连通。

执行：

```bash
pnpm dev
```

在独立终端验证：

```bash
curl -fsS "http://localhost:3000/api/health?deep=1"
```

通过条件：开发服务器 Ready；健康接口 HTTP 200；顶层 `status=ok` 且
`database.status=ok`。不得把健康接口返回之外的环境信息加入报告。

失败动作：区分端口冲突、应用编译失败和数据库 503；给出下一条只针对该原因的命令，
不要只转发完整堆栈。

### Q6：交还用户完成一次性管理员创建

意义：管理员邮箱和正式密码属于用户决策。系统负责生成每个部署独立的临时密码，
Agent 不替用户选择、读取或记录任何凭据。

操作：告诉用户打开 `http://localhost:3000/admin`，两次输入自己的邮箱。提醒用户自行
复制只展示一次的临时密码，再两次输入自己的正式密码。Agent 不读取屏幕中的密码、
不通过聊天收集密码、不把表单值写进命令历史，也不替用户点击复制按钮。

通过条件：用户确认临时密码已经保存、正式密码已经设置，并进入
`http://localhost:3000/admin/setup`。

失败动作：根据页面错误检查开发服务器、`NODE_ENV` 和配置状态；不要绕过一次性初始化
边界，不使用公共默认密码。用户遗失临时密码时，只指向 `docs/DEVELOPMENT.md` 的受控
恢复路径，不要求用户把新密码发给 Agent。

### Q7：经用户确认后导入 Demo

意义：用虚构内容验证知识站的内容和商品形态。

只有用户明确确认后执行：

```bash
pnpm seed-demo
```

通过条件：命令报告 1 个系列、3 节课程、1 个视频、1 份资料和 2 个商品。可以打开
`/admin/catalog`、`/admin/products` 验证，但不得替用户正式开站。

失败动作：缺少管理员时回到 Q6；缺少 ffmpeg 时报告其为 Demo 视频前置条件，允许用户
选择安装或跳过；不得换用未经批准的图片、视频或真实课程素材。

## 5. 完成汇报格式

最终只使用下面结构，不粘贴整段安装日志：

```text
状态：PASS | NEEDS_USER_ACTION | BLOCKED

已完成：
- pnpm 冻结安装：PASS/FAIL
- 本地配置准备：PASS/FAIL（不得输出值）
- MongoDB healthy：PASS/FAIL
- 配置校验：PASS/FAIL
- 应用启动：PASS/FAIL
- 深度健康检查：PASS/FAIL
- 管理员初始化：WAITING/PASS
- Demo 导入：SKIPPED/WAITING/PASS

访问地址：
- 管理员初始化：http://localhost:3000/admin
- 启动成功页：http://localhost:3000/admin/setup
- 深度健康检查：http://localhost:3000/api/health?deep=1

需要用户处理：
- 只列必须由用户完成的下一步；没有则写“无”

保留的原有改动：
- 说明是否检测到 dirty worktree，禁止列出或展示密钥文件内容

失败修复：
- 若失败，写明失败状态、已确认原因和唯一下一条修复命令
```

## 6. 何时必须停止

出现以下任一情况立即停止并报告，不继续猜测：

- 需要创建或修改第三方平台资源；
- 需要真实邮箱、密码、Token 或支付信息；
- 需要停止未知进程、删除数据库或覆盖已有环境文件；
- 锁文件与 `package.json` 不一致；
- 当前目录不是目标仓库；
- 用户尚未完成管理员创建，却要求导入 Demo；
- 健康检查仍为 503 且原因无法用现有日志确认。

本地 Quickstart 完成后也必须停止。生产 Serverless 部署、Provider 配置和正式开站验收
属于后续独立任务。
