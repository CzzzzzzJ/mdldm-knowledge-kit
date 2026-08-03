# Scripts

当前提供：

- `create-admin`：受控创建首个管理员；仅在明确提供 `--reset-existing` 时重置同邮箱
  管理员的密码并撤销旧会话；
- `create-invitation`：创建会员、单课或系列权益邀请码；
- `seed-demo`：导入虚构示例课程和双模式商品；
- `sync-products`：把服务端商品配置同步到 MongoDB；
- `check-config`：启动前检查最低核心和已经选择的 Provider，只输出脱敏能力状态与变量名；
- `validate:providers`：默认执行无外部副作用的 L0 检查，增加 `--live` 后执行 L1 连接；
- `quickstart:prepare`：创建本地 `.env.local` 并安全生成身份密钥，不输出密钥值；
- 数据备份与恢复当前使用 Atlas 或 MongoDB Database Tools，见 `docs/BACKUP_AND_RECOVERY.md`。

脚本默认应可重复执行，并在破坏性操作前明确目标和影响。

`seed-demo` 需要先存在一个受控管理员，并在检测到 ffmpeg 时生成完全合成的 Demo MP4。

未选择 OSS、SMTP、XorPay 或 Webhook 时，相关变量不会参与 `check-config`。公共第一版
不接受 S3、转码或 Sentry 配置值；完整边界见 `docs/CAPABILITY_MATRIX.md`。

## `check-serverless-readiness.ts`

检查 `pnpm + Vercel hkg1 + 本地 MongoDB Docker 边界` 的仓库契约，并输出不含环境变量值
的 `PASS / NEEDS_USER_ACTION / BLOCKED` 报告。可选传入 HTTPS 根地址：

```bash
pnpm check:serverless --url https://preview.example.com/
```

远程模式只读取 `/api/health` 和 `/api/health?deep=1`，不替代 Provider L2/L3 或中国大陆
多网络验收。

`create-invitation` 只在终端显示一次明文邀请码；数据库保存 HMAC 摘要、短提示、权益范围、有效期和使用上限。

修改 `config/products.config.ts` 后运行 `pnpm sync-products`。已有订单使用下单时保存的 `OrderItem` 快照，不会被新价格覆盖。
