# Scripts

当前提供：

- `create-admin`：受控创建首个管理员；
- `create-invitation`：创建会员、单课或系列权益邀请码；
- `seed-demo`：导入虚构示例课程；
- `check-config`：启动前检查配置；
- 后续的数据迁移、备份和恢复脚本。

脚本默认应可重复执行，并在破坏性操作前明确目标和影响。

`seed-demo` 需要先存在一个受控管理员，并在检测到 ffmpeg 时生成完全合成的 Demo MP4。

`create-invitation` 只在终端显示一次明文邀请码；数据库保存 HMAC 摘要、短提示、权益范围、有效期和使用上限。
