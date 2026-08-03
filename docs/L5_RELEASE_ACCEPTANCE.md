# L5 全新环境与发布验收

L5 验证自动化无法证明的外部事实：一份全新 Clone 是否能安装，真实 Provider 是否能在隔离
资源中完成写入与恢复，以及正式域名在目标网络中是否可用。执行前先完成
[L1-L4](TESTING.md)，任何真实写入、发信、支付、恢复或 Production 发布都要由站长逐项确认。

## 证据记录规则

为每次候选版本复制下面的表格到站长自己的私密验收记录。公开仓库只提交脱敏状态，不提交
控制台截图原图、URI、邮箱、Bucket、Token、订单号、回调载荷或真实用户数据。

| 字段 | 记录 |
| --- | --- |
| 候选版本 / Commit | `待填写` |
| 验收日期与执行人 | `待填写` |
| Preview / Production | `待填写` |
| 脱敏证据位置 | `待填写，不放密钥` |
| 总结 | `PASS / NEEDS_USER_ACTION / BLOCKED` |

## A. 全新安装

- [ ] 从远端仓库克隆到新的隔离目录，不复用当前 `node_modules`、`.next` 或 `.env.local`；
- [ ] 使用 Node.js 22 和仓库固定的 pnpm 10.14.0；
- [ ] `pnpm install --frozen-lockfile` 通过，仓库没有其他锁文件；
- [ ] 只按 `START_HERE.md` 配置最低变量并启动；
- [ ] 打开 `/admin`，用双邮箱确认创建管理员 1 号并完成正式密码轮换；
- [ ] `pnpm check`、`pnpm test:l4` 和 `pnpm release:audit` 通过。

## B. Vercel Preview

- [ ] Preview 与 Production 使用不同 Atlas 数据库、`AUTH_SECRET` 和外部资源；
- [ ] Agent 运行 `pnpm check:serverless --url <Preview 根地址>`，输出不包含配置值；
- [ ] 首页、登录、后台、图文阅读、视频播放和资料下载可访问；
- [ ] Preview 未经确认不晋级 Production；
- [ ] 保存 Vercel 历史部署作为回滚入口。

## C. 真实 Provider L2/L3

按 [Provider 验证分级](PROVIDER_VALIDATION.md) 逐项执行。未启用的能力记录为
`NOT_SELECTED`，不是失败，也不能写成已验证。

### MongoDB Atlas

- [ ] 使用隔离数据库完成健康检查；
- [ ] 创建、读取、更新并删除一条虚构记录；
- [ ] 完成管理员、课程、订单和学习进度业务链路；
- [ ] 网络规则、最小权限、TLS、费用告警和备份已检查。

### 阿里云 OSS（启用视频或资料时）

- [ ] 私有 Bucket 与 Block Public Access 已确认；
- [ ] 使用专用 RAM 权限完成上传、签名读取、Range 播放和删除；
- [ ] 未授权访问被拒绝，签名过期后不能继续读取；
- [ ] Preview 与 Production CORS Origin 不使用 `*`。

### SMTP（启用自助注册时）

- [ ] 向站长控制的隔离收件地址发送验证邮件；
- [ ] 验证链接单次有效，找回密码会撤销旧会话；
- [ ] 发信失败进入脱敏故障队列；
- [ ] DNS、退信和额度状态已人工确认。

### Manual / XorPay

- [ ] Manual 订单在后台确认前保持 `pending` 且不授予权益；
- [ ] 管理员确认后只产生一份权益，重复确认保持幂等；
- [ ] 如启用 XorPay，使用隔离低价商品完成一次真实支付与签名回调；
- [ ] 服务端金额、币种、Provider 和订单一致，重复回调不重复授权；
- [ ] 测试完成后恢复正式商品状态并保留回调回滚窗口。

## D. 备份与恢复演练

- [ ] 在写入测试数据前创建 Atlas 与 OSS 备份；
- [ ] 只恢复到新的隔离数据库和对象前缀，不覆盖当前 Production；
- [ ] 比对系列、课程、商品、订单、权益和媒体数量；
- [ ] 用恢复环境实际登录、阅读一篇图文课、播放一节视频并下载资料；
- [ ] 记录恢复耗时、缺失项、回滚入口和删除隔离资源的负责人。

详细操作见 [数据备份与恢复](BACKUP_AND_RECOVERY.md)。

## E. 中国大陆目标网络

- [ ] 使用最终自定义域名，不用 `.vercel.app` 代替正式验收；
- [ ] 至少两个不同中国大陆网络点验证首页、登录、后台、学习页和授权媒体；
- [ ] 分别记录成功/失败、时间范围和脱敏证据；
- [ ] 没有证据时保持 `NEEDS_USER_ACTION`，不宣称国内生产可用。

## F. Release 人工门禁

- [ ] CI、CodeQL、依赖审计和 Release Audit 全部通过；
- [ ] 公开源码不含 `.env.local`、`.mdldm/`、真实数据和内部付费教程；
- [ ] License、变更日志、升级、回滚和已知限制已复核；
- [ ] 站长单独确认 Production 发布、Tag 和 GitHub Release；
- [ ] 发布后再次完成浅健康检查与最小购买/学习烟雾测试。

只要 C、D、E 中任何被选能力没有真实证据，总结就不能是 `PASS`。仓库内的 Mock、单元
测试、浏览器截图或 Provider 配置存在，都不能替代这项判断。
