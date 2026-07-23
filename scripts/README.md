# Scripts

当前提供：

- `create-admin`：受控创建首个管理员；
- `seed-demo`：导入虚构示例课程；
- `check-config`：启动前检查配置；
- 后续的数据迁移、备份和恢复脚本。

脚本默认应可重复执行，并在破坏性操作前明确目标和影响。

`seed-demo` 需要先存在一个受控管理员，并在检测到 ffmpeg 时生成完全合成的 Demo MP4。
