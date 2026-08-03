# ADR 0014：最低配置与按需能力门禁

- 状态：Accepted
- 日期：2026-08-03

## 背景

公共仓库同时暴露了已实现、开发演示和尚未实现的 Provider 选项。即使部署者不需要
视频、真实邮件、自动支付或外部告警，也会看到大量变量和生产警告；OSS 与 SMTP SDK
还会随 Provider 选择器静态加载。这让“可选能力”在安装、理解和上线检查中继续形成
隐性耦合。

第一版需要让 Agent 先用最少配置启动可管理的知识站，再根据运营目标逐项增加外部依赖。
未启用的能力必须有真实降级，而不是静默假成功。

## 决策

1. 新部署最低核心配置为 `APP_URL`、`MONGODB_URI`、`AUTH_SECRET` 和
   `INITIAL_SETUP_TOKEN`；完成首个管理员初始化后可轮换或移除一次性初始化口令；
2. 安全默认组合改为 Local Storage、Console Email、Manual Payment、None Transcode
   和 Console Observability；Mock Payment 只在显式测试环境中选择；
3. 公共第一版只接受以下 Provider 值：
   - Storage：`local / oss`；
   - Email：`console / smtp`；
   - Payment：`manual / mock / xorpay`；
   - Transcode：`none`；
   - Observability：`console / webhook`；
4. S3、FFmpeg、Aliyun MPS 和 Sentry 不作为可配置但未实现的占位项；选择这些值时配置
   校验直接失败，不再降级成另一项能力；
5. 配置解析只校验已选择能力的专属变量。未选择 OSS、SMTP、XorPay 或 Webhook 时，
   对应变量不参与解析和启动判断；
6. OSS 与 SMTP 实现通过动态导入加载。选择 Local 或 Console 时不加载对应第三方 SDK；
7. 生产环境使用 Console Email 时，站点仍可启动和供已有账号登录，但自助注册、重发
   验证和找回密码在页面与 API 中明确停用；启用 SMTP 后自动恢复；
8. Local Storage 和 Console Observability 的生产限制只作为能力提示，不阻断纯核心
   站点开站；生产 Mock Payment 仍是硬错误；
9. `/api/health`、`pnpm check-config` 和后台系统页返回同一份脱敏能力状态：只包含
   Provider 名称、状态、限制、下一步和所需变量名，不包含任何变量值；
10. Demo、Preview 与 Production 的组合差异及裁剪行为由
    `docs/CAPABILITY_MATRIX.md` 作为公共事实源。

## 备选方案

### 所有生产 Provider 都作为必填

能形成统一生产拓扑，但会强迫只做基础内容或人工收款的创作者先购买和配置无关服务。

### 保留未实现选项并显示警告

看似为未来保留接口，实际上会让部署者误以为 S3、转码或 Sentry 已经可用，也会增加
配置分支和测试负担。

### 在构建时完全移除可选依赖包

安装体积更小，但需要维护多套包清单或构建产物。第一版先保证运行时不加载未启用 SDK，
待真实安装成本成为问题后再评估独立插件包。

## 影响

- 从旧配置升级时，`PAYMENT_PROVIDER` 未设置会从 Mock 改为 Manual；测试环境若依赖
  Mock，必须显式设置；
- 使用 `s3`、`ffmpeg`、`aliyun-mps` 或 `sentry` 的自定义分支需要保留自己的 Adapter，
  不能再依赖公共配置枚举；
- Console Email 的生产站不会创建无法完成邮箱验证的新用户；
- 新增 Provider 时必须同时补齐条件校验、脱敏状态、降级路径、SDK 加载测试和能力矩阵；
- 图文正文发布属于后续内容模型任务，本决策只保证不选择媒体能力时不要求 OSS。
