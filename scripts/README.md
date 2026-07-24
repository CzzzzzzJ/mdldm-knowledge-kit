# Scripts

当前提供：

- `create-admin`：受控创建首个管理员；
- `create-invitation`：创建会员、单课或系列权益邀请码；
- `seed-demo`：导入虚构示例课程和双模式商品；
- `sync-products`：把服务端商品配置同步到 MongoDB；
- `check-config`：启动前检查配置；
- 数据备份与恢复当前使用 Atlas 或 MongoDB Database Tools，见 `docs/BACKUP_AND_RECOVERY.md`。

脚本默认应可重复执行，并在破坏性操作前明确目标和影响。

`seed-demo` 需要先存在一个受控管理员，并在检测到 ffmpeg 时生成完全合成的 Demo MP4。

`create-invitation` 只在终端显示一次明文邀请码；数据库保存 HMAC 摘要、短提示、权益范围、有效期和使用上限。

修改 `config/products.config.ts` 后运行 `npm run sync-products`。已有订单使用下单时保存的 `OrderItem` 快照，不会被新价格覆盖。
