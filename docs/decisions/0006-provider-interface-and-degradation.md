# ADR 0006：Provider 接口与降级策略

- 状态：Accepted
- 日期：2026-07-24

> 2026-08-03 补充：最低默认支付已由 Mock 调整为 Manual，公共 Provider 白名单与
> 条件校验以 ADR 0014 为准；本 ADR 的接口隔离与明确降级原则继续有效。

## 背景

原站的存储、支付、邮件、转码和告警实现与业务代码耦合。开源版需要在未配置云服务时运行，并能明确告诉部署者哪些能力尚不可用。

## 决策

- 领域模块不得导入具体 Provider SDK；
- Provider 使用 Port 描述核心需要的最小能力；
- 默认开发组合为 MongoDB、Local Storage、Console Email、Mock Payment、None Transcode 和 Console Observability；
- 未实现或未配置的 Provider 必须在配置检查与健康检查中标记，不允许静默假成功；
- `/api/health` 默认执行无外部副作用的浅检查；
- `/api/health?deep=1` 才连接 MongoDB 执行深度检查；
- 健康检查不得返回 URI、密钥、Token 或完整错误载荷。

## 备选方案

### 核心模块直接调用 SDK

文件更少，但测试、替换和无第三方服务启动都更困难。

### 启动时强制连接全部 Provider

能尽早暴露生产配置错误，但会阻断默认 Demo 和按需启用能力。

## 影响

- 每个新增 Provider 必须提供配置校验、错误模型、健康检查和测试；
- 生产环境仍可通过部署平台在启动前强制运行 `check-config`；
- 深度健康检查的访问控制和速率限制在公开部署前补齐。
