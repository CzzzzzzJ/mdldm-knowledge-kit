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

