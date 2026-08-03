# 15 分钟启动 mdldm Knowledge Kit

这是项目唯一的快速启动入口。目标不是在 15 分钟内完成正式运营配置，而是让一个
有 Vibe Coding 能力的创作者把任务交给 Agent，并得到一个可以打开、创建管理员和
进入站长后台的本地知识站。

> 最短路径：克隆项目 → 交给 Agent → pnpm 安装 → 安全生成本地配置 → 启动 MongoDB
> → 启动网站 → 打开 `/admin` → 创建管理员 → 可选导入 Demo。

## 先确认 15 分钟包含什么

计时从以下本机前置条件已经可用后开始：

- Git；
- Node.js 20 或更高版本，推荐 Node.js 22；
- Corepack；
- Docker Desktop 已安装并启动；
- 如需导入带测试视频的 Demo，额外安装 ffmpeg。

以下事项不计入 15 分钟：第三方平台注册和实名认证、MongoDB Atlas 或阿里云资源
创建、域名购买与 DNS 生效、邮件或支付审核、备案、网络下载受限等待。这些属于正式
部署阶段，本入口不会替你创建付费资源或修改外部账号。

## 推荐方式：把下面这段 Prompt 交给 Agent

在 Codex、Claude Code 或其他 Coding Agent 中打开本仓库，然后完整复制：

```text
请帮我完成 mdldm Knowledge Kit 的本地 15 分钟快速启动。

先遵守仓库 AGENTS.md，再阅读 START_HERE.md 和 AGENT_QUICKSTART.md。只完成本地
Demo 启动，不要配置生产 Provider，不要创建第三方账号或付费资源，不要提交或推送
Git，不要读取 `.local-planning` 或私有原项目，也不要在回复、日志或命令输出中展示任何密钥。

请依次：
1. 检查 Node.js、Corepack、pnpm、Docker 和端口 3000/27017；
2. 使用仓库固定的 pnpm 版本执行冻结安装；
3. 运行 pnpm quickstart:prepare 安全准备 .env.local；
4. 启动 Docker MongoDB，并等待容器 healthy；
5. 运行 pnpm check-config；
6. 启动开发服务器，验证 /api/health?deep=1；
7. 告诉我打开 http://localhost:3000/admin，两次输入我自己的邮箱并创建管理员 1 号；
8. 让我自行保存只展示一次的临时密码并设置正式密码；不要索取、记录或回显任何密码；
9. 等我进入 /admin/setup 后，再询问我是否导入虚构 Demo；
9. 最终按 AGENT_QUICKSTART.md 的格式汇报，不得回显环境变量值。

遇到失败时先给出“失败步骤、可验证原因、下一条修复命令”，不要只粘贴堆栈，
不要自动结束其他进程，不要覆盖已有有效 .env.local。
```

Agent 的权限、安全边界、逐步证据和汇报格式见
[AGENT_QUICKSTART.md](AGENT_QUICKSTART.md)。

完成本地启动后，需要部署、配置 Provider、修改品牌、发布图文或做上线验收时，使用
[Agent 任务接口](AGENT_TASKS.md)，不要把所有目标继续塞进本地启动 Prompt。

## 唯一执行路线

即使暂时不使用 Agent，也只执行下面同一条路线，不需要阅读其他部署文档。

### 第 0 步：获取项目

意义：获得不包含私有原站历史和真实业务数据的公开知识站仓库。

```bash
git clone https://github.com/CzzzzzzJ/mdldm-knowledge-kit.git
cd mdldm-knowledge-kit
```

如果 Agent 已经在本仓库根目录工作，跳过克隆，只需确认 `package.json` 中的项目名称是
`mdldm-knowledge-kit`。如果目录已经存在，不要覆盖或重复克隆。

预期结果：当前目录包含 `AGENTS.md`、`START_HERE.md`、`package.json` 和
`pnpm-lock.yaml`。

失败处理：认证失败时确认使用的是公开仓库 URL；目录冲突时停止并检查现有目录，
不要自动删除。

### 第 1 步：安装固定依赖

意义：确保本机与 CI、Vercel 使用同一个 pnpm 版本和同一份依赖树。

```bash
corepack enable
pnpm --version
pnpm install --frozen-lockfile
```

预期结果：版本输出 `10.14.0`，安装以 `Done` 结束，不修改 `pnpm-lock.yaml`。

失败处理：

- `corepack: command not found`：当前 Node.js 安装不完整，安装 Node.js 22 LTS 后重开终端；
- `pnpm: command not found`：重新运行 `corepack enable`，不要改用另一种包管理器；
- `ERR_PNPM_OUTDATED_LOCKFILE`：停止操作并向维护者报告，不要绕过 `--frozen-lockfile`；
- 下载超时：检查代理或包注册表网络后重试，不要删除锁文件。

### 第 2 步：安全准备本地配置

意义：身份和会话必须使用独立密钥，但密钥不应出现在聊天记录和终端输出中。

```bash
pnpm quickstart:prepare
```

预期结果：创建 `.env.local`，自动写入随机 `AUTH_SECRET`，终端只说明“已写入”，不会
打印密钥。重复运行不会覆盖已有有效密钥和其他配置。

失败处理：确认当前目录中存在 `package.json` 和 `.env.example`，并确认当前用户对
项目目录有写权限。不要把 `.env.local` 提交到 Git。

### 第 3 步：启动本地数据库

意义：管理员、内容、商品和学习进度都保存在 MongoDB，网站不能只启动前端页面。

```bash
docker compose up -d mongodb
docker compose ps mongodb
```

预期结果：`mongodb` 状态最终变成 `healthy`。

失败处理：

- 无法连接 Docker daemon：先打开 Docker Desktop，等待状态变为 Running；
- 端口 `27017` 被占用：运行 `lsof -nP -iTCP:27017 -sTCP:LISTEN` 查明进程并报告，
  不要自动结束未知进程；
- 容器持续不健康：运行 `docker compose logs --tail 100 mongodb` 获取具体原因。

### 第 4 步：检查最低配置

意义：在启动网站前发现变量拼写、Provider 选择和身份密钥问题。

```bash
pnpm check-config
```

预期结果：出现“配置校验通过”。默认 `Manual Payment` 不连接自动支付平台；如果你为
Demo 显式选择了 Mock，提示“不产生真实扣款”也不算失败。

失败处理：按输出中的变量名修复 `.env.local`。若提示 `AUTH_SECRET`，重新运行
`pnpm quickstart:prepare`；不要把密钥值发给 Agent 或维护者。

### 第 5 步：启动并验证网站

意义：确认 Next.js 和 MongoDB 不只是分别运行，而是已经真实连通。

```bash
pnpm dev
```

保持这个终端运行，在另一个终端执行：

```bash
curl -fsS "http://localhost:3000/api/health?deep=1"
```

预期结果：开发服务器显示 `Ready`；健康检查返回 HTTP 200，JSON 中顶层
`status` 为 `ok`，`database.status` 为 `ok`。

失败处理：

- 3000 端口占用：先运行 `lsof -nP -iTCP:3000 -sTCP:LISTEN` 并确认占用者，不要
  自动结束未知服务；
- 健康检查返回 503：查看 `database.message`，再检查 MongoDB 容器和 `MONGODB_URI`；
- 页面无法访问：优先查看运行 `pnpm dev` 的终端，不要只看浏览器空白页。

### 第 6 步：创建第一个管理员

意义：后台不提供公开导航入口，必须由部署者完成一次性初始化后才能管理站点。

打开：

```text
http://localhost:3000/admin
```

两次输入你自己的邮箱。这个邮箱会成为“管理员 1 号”的登录账号；项目没有公共默认
管理员或默认密码。创建成功后，页面会显示当前部署随机生成的临时密码：

1. 立即复制并保存在自己的密码管理器中；
2. 点击“设置我的正式密码”；
3. 两次输入正式密码并完成激活；
4. 确认进入：

```text
http://localhost:3000/admin/setup
```

这个页面就是本地启动成功页。临时密码只展示一次，不会保存到浏览器持久存储；正式
密码设置后，临时密码立即失效。不要把任何密码交给 Agent、写进 Issue 或放进命令历史。

失败处理：若页面提示初始化不可用，先确认 `.env.local` 的 `NODE_ENV=development`，
再重新运行 `pnpm quickstart:prepare` 和 `pnpm check-config`。如果误关临时密码页面，
使用已经复制的邮箱和临时密码登录；临时密码也丢失时按 `docs/DEVELOPMENT.md` 的受控
恢复说明处理。

### 第 7 步：可选导入虚构 Demo

意义：快速看到系列、课程、会员商品和单课商品，不需要先录制自己的内容。

完成管理员创建后，在第二个终端运行：

```bash
pnpm seed-demo
```

预期结果：输出“Demo 数据已就绪”，包括 1 个系列、3 节课程、1 个测试视频、1 份
资料和 2 个商品。随后可以检查：

- `http://localhost:3000/admin/catalog`
- `http://localhost:3000/admin/products`
- `http://localhost:3000/admin/setup`

失败处理：

- 提示缺少管理员：先在 `/admin` 完成创建；
- 提示 ffmpeg 不存在：安装 ffmpeg 后重试，或暂时跳过 Demo；站点启动仍然有效；
- MongoDB 错误：确认命令使用的 `.env.local` 与运行网站时相同。

## 完成标准

同时满足以下条件才算完成快速启动：

- `pnpm install --frozen-lockfile` 成功且锁文件未变化；
- `pnpm check-config` 通过；
- MongoDB 容器为 healthy；
- `/api/health?deep=1` 返回应用和数据库均为 `ok`；
- `/admin` 可以创建首个管理员；
- 创建后能够进入 `/admin/setup`；
- 若选择 Demo，`pnpm seed-demo` 成功且后台能看到内容和商品。

到这里请停止。Atlas、OSS、SMTP、XorPay、Vercel、域名和正式开站属于后续生产配置，
不要为了完成“15 分钟”而跳过审核或自动创建付费资源。
