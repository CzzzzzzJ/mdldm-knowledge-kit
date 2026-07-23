# ADR 0004：单仓模块化结构

- 状态：Accepted
- 日期：2026-07-24

## 背景

项目需要同时保持陌生贡献者的启动成本和领域边界清晰度。Phase 1 尚未出现需要独立发布、独立版本或跨应用复用的 package。

## 决策

第一阶段使用一个 Next.js 仓库，不拆分 Monorepo。

目录职责：

- `app/` 和 `components/` 负责 Web 入口与界面；
- `modules/` 负责不依赖具体服务商的领域类型和规则；
- `providers/` 负责数据库和第三方服务适配；
- `config/` 负责运行配置、Feature Flags、站点和服务端商品；
- `scripts/` 负责可重复执行的初始化与运维命令。

依赖方向为：

```text
app / scripts
  -> modules
  -> provider ports

app / scripts
  -> provider adapters

modules
  -X-> provider adapters
```

## 备选方案

### 立即拆成 Monorepo

可以强化 package 边界，但会增加构建、发布和本地开发复杂度，当前没有实际复用需求。

### 延续原站目录

迁移速度快，但领域规则、Mongoose Model 和第三方 SDK 会继续相互渗透。

## 影响

- 模块边界先通过目录、类型和测试约束；
- Provider 或插件出现独立发布需求后，再用新 ADR 评估包化；
- 不从原仓批量复制 `app`、`lib`、`models` 或历史目录。

