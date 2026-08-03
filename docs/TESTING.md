# 测试分层与 Agent 质量门

本项目把测试按失败时应由谁处理分成 L1-L5。分层的目的不是增加命令数量，而是让站长、
贡献者和 Coding Agent 能快速判断：改动影响了哪条边界，必须运行哪一组测试，哪些结果仍需
真人和真实第三方平台确认。

## L1-L5 定义

| 层级 | 自动化 | 覆盖范围 | 主要命令 |
| --- | --- | --- | --- |
| L1 | 是 | Schema、纯领域规则、金额、权益、内容类型、隐私规则 | `pnpm test:l1` |
| L2 | 是 | Application Service、Query Service、Repository Port、Provider Contract | `pnpm test:l2` |
| L3 | 是 | Route Handler 输入、身份、CSRF、限流、状态码与错误脱敏 | `pnpm test:l3` |
| L4 | 是 | 浏览器中的初始化、发布、购买、阅读、观看与后台确认 | `pnpm test:l4` |
| L5 | 人工为主 | 全新环境、真实 Provider、备份恢复、国内网络与 Release | [L5 发布验收](L5_RELEASE_ACCEPTANCE.md) |

`pnpm test` 仍会一次执行全部 Vitest 测试，便于本地快速回归；`pnpm check` 会按 L1、L2、
L3 分组执行，并在最后完成生产构建。CI 把三层显示为独立步骤，使失败归属清晰可见。

## 按改动选择测试

| 改动 | 最低测试 |
| --- | --- |
| Schema、金额、权限或内容类型 | L1 |
| Application Service、Repository 或 Provider | L1 + L2 |
| API、认证、支付、后台写操作 | L1 + L2 + L3 |
| 页面、发布、购买、学习主旅程 | `pnpm check` + L4 |
| 上线、迁移、真实 Provider 或 Release | 全部自动化 + L5 |

不能因为 L4 已通过就跳过 L1-L3。E2E 证明用户旅程可以完成，较低层负责精确证明金额、
权限、输入和 Provider 边界没有被偶然绕过。

## L4 的两套支付环境

```bash
# Mock 自动支付、管理员初始化、视频/图文发布、会员/单课权益
pnpm test:l4:auto

# Manual 下单保持 pending，管理员确认后幂等发放权益
pnpm test:l4:manual

# 顺序执行以上两套
pnpm test:l4
```

- Mock 套件使用 `mdldm_knowledge_kit_e2e`、端口 `3210`；
- Manual 套件使用 `mdldm_knowledge_kit_manual_e2e`、端口 `3211`；
- Global Setup 只允许清理名称以 `_e2e` 结尾的数据库；
- 两套配置固定一个 Worker，避免共享数据库的测试互相污染；
- E2E 只使用虚构账号、课程、订单和本地合成媒体；
- Mock 不是生产支付验收，XorPay 真实低价支付属于 L5。

首次运行 L4 前安装浏览器并启动本地 MongoDB：

```bash
docker compose up -d mongodb
pnpm exec playwright install chromium
pnpm test:l4
```

## 当前关键旅程

| 旅程 | 层级与证据 |
| --- | --- |
| 管理员临时密码、强制轮换和入口关闭 | L1 + L4 |
| 图文课无视频发布、授权阅读、未授权正文不返回 | L1 + L2 + L4 |
| 视频上传、绑定、发布、Range 播放和资料下载 | L1 + L4 |
| Mock 自动支付、会员与单课幂等授权 | L1 + L2 + L3 + L4 |
| Manual 下单、后台确认和幂等授权 | L2 + L3 + 独立 L4 |
| Provider 禁用、按需变量和 SDK 延迟加载 | L1 + L2 |
| Agent Doctor 脱敏和本地 Issue 草稿 | L1 + L2 |
| Explore 提交模板和公开授权确认 | L2 |
| 真实 Atlas、OSS、SMTP、XorPay、恢复和国内网络 | L5，不能由单测代替 |

## 完整仓库质量门

```bash
pnpm lint
pnpm typecheck
pnpm test:layers
pnpm build
pnpm test:l4
pnpm release:audit
```

上线前还要运行 `pnpm check-config`、`pnpm check:serverless`，并逐项完成 L5。Agent 的
`PASS` 只表示它实际执行并通过的自动化层；没有真实平台证据时必须标记
`NEEDS_USER_ACTION`，不能推断 Production 已验收。

## 新增测试的放置规则

1. 文件继续按业务模块放在 `tests/<module>/`，API 契约统一放在 `tests/api/`；
2. 新文件必须加入对应 `vitest.l1.config.ts`、`vitest.l2.config.ts` 或
   `vitest.l3.config.ts`，不能只依赖总入口偶然执行；
3. 一个文件只归属一个层。需要跨层证明时拆成多个测试，不把真实数据库塞进 L1；
4. E2E 使用唯一虚构标识，不依赖其他测试遗留数据；
5. 认证、权益、支付、正文和媒体的未授权结果必须同时断言“不返回敏感内容”；
6. L5 证据只记录日期、版本、状态和脱敏位置，不提交密钥、真实用户或支付载荷。
