# ADR 0015：Agent-first Serverless 唯一线上路径

- 状态：Accepted
- 日期：2026-08-03

## 背景

项目同时出现过 Vercel、自托管和 Docker 的表述，但第一版没有资源维护多套生产拓扑。
目标用户是有 Vibe Coding 能力、主要借助 Agent 完成部署的国内创作者；他们需要一条边界
清晰、可以逐步验收的路径，而不是平台选型大全。

Vercel 已有项目配置并适配当前 Next.js Serverless 结构。官方资料同时明确：Vercel 没有
中国大陆基础设施，`.vercel.app` 域名可能在大陆访问缓慢或不可用，自定义域名也不能保证
可用性。因此“采用 Vercel”和“国内网络验收通过”必须是两个事实。

## 决策

1. 第一版唯一维护的线上路径为 `Agent + Vercel Serverless`；完整生产 Docker、自建
   Kubernetes 和其他 Web 平台不进入免费公开支持范围；
2. `vercel.json` 固定 pnpm 冻结安装与 `hkg1` 函数区域。`hkg1` 是国内用户优先的默认值，
   不代表中国大陆部署或访问保证；数据库应选择与函数区域网络接近的部署；
3. 当前视频优先产品的公开运营组合为 Vercel + Atlas + OSS + SMTP + Manual；自动支付
   可按需把 Manual 替换为 XorPay，Webhook 告警可选；
4. 纯核心 Preview 可以暂时使用 Local/Console/Manual，但 Local 媒体不会在 Serverless
   持久化，Production Console Email 会关闭自助注册、重发验证和找回密码；
5. Preview 必须先于 Production，二者使用隔离数据库、密钥和外部资源。Preview 部署与
   Production 推广是两次独立的外部状态变更确认；
6. Agent 只读取变量名、Provider 状态与健康结果，不读取或回显变量值；登录、MFA、实名、
   付费、资源创建、L2/L3 写入和 Production 发布由站长确认；
7. `pnpm check:serverless` 输出脱敏的 `PASS / NEEDS_USER_ACTION / BLOCKED` 技术报告，
   可选读取站点浅层和深度健康接口，但不能替代真实账号 L2/L3 与国内网络验收；
8. Production 前必须使用自定义域名，从至少两个中国大陆网络点验证首页、登录、后台、
   学习页和授权媒体；没有证据时保持 `NEEDS_USER_ACTION`；
9. `docker-compose.yml` 只提供本地 MongoDB 辅助，并用机器可读的
   `x-mdldm-scope: local-mongodb-only` 声明边界；
10. 全新隔离第三方账号、费用、平台控制台、失败案例、截图和替代部署实践进入未来复核/
    付费文档；公共仓库只记录当前真实验证等级，不把“已实现 Adapter”写成“生产验证通过”。

## 备选方案

### 同时维护 Vercel 与完整 Docker

覆盖范围更广，但会显著增加数据库、媒体、反向代理、TLS、升级、备份和故障排查矩阵，
与第一版面向 Agent 的最短路径冲突。

### 把 OSS、SMTP 和自动支付全部设为硬性依赖

拓扑统一，但会让只做 Preview 或人工收款的站长提前购买无关服务。公开文档改为按当前
运营目标启用，同时对视频持久化和自助账号流程给出明确限制。

### 因国内可用性不确定而宣称 Vercel 不可用

这同样超过现有证据。项目保留 Vercel 作为唯一维护路径，但把自定义域名和真实大陆网络
测试设为发布门禁；未通过时不建议公开上线。

## 影响

- README 不再把项目描述为已经提供完整自托管生产方案；
- 本地 15 分钟启动与线上部署成为两个独立入口；
- `hkg1` 变更可能增加远离香港的数据库延迟，部署者应把数据库放在相近区域，或在形成
  新 ADR 和验收证据后调整区域；
- Provider L0/L1、技术健康、L2/L3 和大陆网络证据必须分别记录；
- Docker 生产、自建平台和中国大陆合规托管仍可由用户二次开发，但不是第一版维护承诺。

## 参考

- [Vercel：中国大陆访问说明](https://vercel.com/kb/guide/accessing-vercel-hosted-sites-from-mainland-china)
- [Vercel Regions](https://vercel.com/docs/regions)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel CLI 部署流程](https://vercel.com/docs/projects/deploy-from-cli)
- [MongoDB Atlas 与 Vercel 集成](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)
