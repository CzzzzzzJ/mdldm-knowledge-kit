# Providers

这里承载第三方和基础设施适配器：

- database；
- storage；
- payment；
- email；
- transcode；
- observability；
- external auth。

每个 Provider 必须实现对应 Port，并说明配置、降级行为、错误模型和测试方式。

当前实现：

- `database/mongodb`：MongoDB 连接、健康检查和严格 Schema；
- `storage/local`：本地媒体写入、路径隔离、存在性检查和删除；
- `auth/session`：服务端会话 Cookie 与数据库 Session。

其余 Provider 仍处于配置识别或计划状态。
