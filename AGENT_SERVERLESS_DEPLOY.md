# Agent + Serverless 上线协议

这是一条给 Codex 或其他 Coding Agent 执行的生产部署协议。第一版只维护这一条线上
路径：

```text
Git 仓库
  → Vercel Preview（hkg1）
  → MongoDB Atlas
  → 按当前视频知识站需要接入 OSS + SMTP
  → Manual Payment（默认）或 XorPay（按需）
  → Preview 通过后才能申请 Production
```

Vercel 是当前唯一维护的 Web Serverless 平台，但尚未取得全新隔离账号的完整 L2/L3
证据，也不能保证中国大陆网络可用性。Agent 必须把技术检查、真实账号验收和国内网络
验收分开报告。

## 1. Agent 开始前只读这些文件

1. `AGENTS.md`
2. `docs/DEPLOYMENT.md`
3. `docs/CAPABILITY_MATRIX.md`
4. `docs/PROVIDER_VALIDATION.md`

不要读取 `.local-planning` 或任何私有原项目目录。不读取或回显环境变量值，只允许查看变量名、
作用范围和脱敏状态。不得把 URI、Token、AccessKey、邮箱、Bucket、项目 ID 或域名写入
报告、Issue、日志或 Git。

## 2. 人与 Agent 的边界

站长负责：

- 注册和登录 Vercel、Atlas、阿里云、支付平台；
- 完成 MFA、实名、账单、域名和平台协议；
- 在 Secret Manager 中填写密钥；
- 确认任何资源创建、外部写入、真实发信、支付和 Production 发布；
- 保存国内网络与 L2/L3 的脱敏证据。

Agent 可以：

- 检查仓库、依赖、环境变量名称和 Provider 脱敏状态；
- 运行 `pnpm check`、`pnpm check-config`、`pnpm validate:providers`；
- 在站长明确提供 Preview 根地址后运行只读健康检查；
- 解释失败项，并给出下一项最小操作；
- 在每个外部状态变更前停下请求确认。

Agent 不可以静默创建项目、Cluster、Bucket、发件人、商户商品、域名或付费资源，也不
可以把 Preview 推成 Production。

## 3. 固定执行顺序

### S0：本地仓库门禁

执行：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm check:serverless
```

最后一条没有远程地址时应返回 `NEEDS_USER_ACTION`，这是正常状态；它只证明仓库契约和
当前脱敏配置状态，没有证明生产可用。

### S1：站长选择运营范围

当前视频知识站要公开运营，组合固定为：

```text
Vercel + Atlas + OSS + SMTP + Manual
```

需要自动支付时才把 Manual 替换为 XorPay。Webhook 是可选告警；转码、S3、Sentry 和
生产 Docker 不属于公开第一版。

### S2：创建隔离的 Preview 资源

站长在平台控制台创建 Preview 专用数据库、数据库账号、OSS Bucket/前缀和测试发件人。
Agent 只能给出字段名与最小权限建议；执行创建前必须获得站长确认。

Preview 与 Production 至少隔离：

- `MONGODB_URI` 指向不同数据库，推荐使用不同 Database User；
- OSS 使用不同 Bucket 或强制隔离前缀与凭据；
- SMTP 使用测试收件人和可识别的发件人；
- 支付使用 Manual 或隔离低价商品；
- `AUTH_SECRET` 与 `INITIAL_SETUP_TOKEN` 不复用。

### S3：在 Vercel 配置变量名与作用域

先只配置 Preview。值由站长在 Vercel Secret Manager 中填写，Agent 不要求粘贴到聊天。
最低变量与按需变量以 `docs/CAPABILITY_MATRIX.md` 为唯一事实源。

Agent 可以查看 Preview / Production 中“变量名是否存在”，不能读取值。环境变量更新只
影响新的 Deployment，更新后需要重新部署。

### S4：只读配置检查

在能安全注入 Preview 变量的受控终端中执行：

```bash
pnpm check-config
pnpm validate:providers
pnpm validate:providers --live
```

`--live` 只做 MongoDB Ping、OSS HEAD、SMTP Verify 等 L1 检查；不会写 OSS、发送邮件、
创建支付订单或触发告警。

### S5：部署 Preview

这是第一次产生外部状态。Agent 必须先列出即将创建的 Deployment、预计使用的项目与
环境，再请求站长明确确认。未经确认不得执行。

部署后，由站长把不含路径和查询参数的 HTTPS Preview 根地址交给 Agent：

```bash
pnpm check:serverless --url https://preview.example.com/
```

该命令只读取 `/api/health` 和 `/api/health?deep=1`，不会回显目标域名或响应正文。

### S6：Preview 业务验收

先完成不产生费用的浏览器旅程：

1. 打开 `/admin`，用 Preview 专用初始化口令创建管理员；
2. 立刻轮换临时密码；
3. 在 `/admin/setup` 完成配置并检查深度健康状态；
4. 导入虚构 Demo，验证首页、课程、后台与学习页；
5. 验证未授权用户不能读取付费媒体或正文。

发送真实测试邮件、写入并删除 OSS 临时对象、制造 Webhook 或发起真实支付都属于 L2/L3。
Agent 必须逐项说明影响、费用与清理动作，并分别请求确认。

### S7：中国大陆网络验收

Vercel 没有中国大陆基础设施，`hkg1` 只是国内用户优先的函数区域，不能证明页面在大陆
稳定可用。Production 前必须绑定自定义域名，并从至少两个中国大陆网络点验证：

- 首页和课程列表首屏；
- 登录与管理员后台；
- 学习页与授权媒体读取；
- API 错误率和可接受的延迟；
- 不可用时的回滚或暂停上线决定。

`.vercel.app` 地址或 Agent 当前机器的一次请求不能替代这项验收。

### S8：申请 Production

只有 S0-S7 的证据齐全，Agent 才能列出 Production 变更计划。Production 发布是第二次
独立确认，不能沿用 Preview 的确认。

Production 必须使用独立数据库、密钥和正式域名。推广前再次运行：

```bash
pnpm check:serverless --url https://your-production-domain.example/
```

随后创建管理员 1 号、轮换临时密码、完成 `/admin/setup`，并移除或轮换已经不再需要的
`INITIAL_SETUP_TOKEN`。

### S9：交付与回滚

Agent 提交报告、当前 Deployment 标识、回滚目标和未完成的人工事项。报告不能包含账号、
环境变量值、域名、邮箱、订单或平台资源 ID。

## 4. 强制报告格式

```text
状态：PASS | NEEDS_USER_ACTION | BLOCKED
检查范围：technical-readiness | L0 | L1 | L2 | L3 | mainland-network

已完成：
- ...

失败或阻断：
- ...

需要站长操作：
- 动作：...
  原因：...
  是否产生外部状态/费用：是或否
  完成证据：...

未验证且不得宣传为已上线：
- ...

回滚点：
- ...
```

`pnpm check:serverless` 的 `PASS` 只表示技术就绪；报告仍必须单列 L2/L3 和大陆网络证据。

## 5. 必须停下来的情况

- 需要登录、扫码、MFA、实名、付费或同意平台协议；
- 需要创建、修改或删除任何第三方资源；
- 需要发送真实邮件、上传对象、支付、提交 Webhook 或写生产数据库；
- Preview 和 Production 看起来共用数据库、Bucket、密钥或支付账号；
- 站长要求把密钥粘贴进聊天、Issue、文件或命令历史；
- 中国大陆网络验收失败或没有证据；
- 真实账号 L2/L3 尚未完成，却要把 Provider 写成“生产验证通过”。

详细平台字段、风险与官方链接见 [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)。
