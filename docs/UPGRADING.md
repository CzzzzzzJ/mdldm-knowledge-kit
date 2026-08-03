# 升级与回滚

## SiteSetting 主题字段

新增的 `theme` 只接受 `mdldm` 和 `minimal`。旧数据库记录没有该字段时，应用会读取为
`mdldm`；站长下次在 `/admin/site` 保存设置时会自动写入默认值，不需要直接修改 MongoDB。
回滚到不认识主题字段的旧版本前仍应先备份数据库，但该字段不会改变支付、订单或权益数据。

## 升级前

1. 阅读 `CHANGELOG.md` 和目标版本 Release Notes；
2. 记录当前 Git 提交、部署版本和 Provider 配置；
3. 按 `BACKUP_AND_RECOVERY.md` 备份 MongoDB 与媒体；
4. 在 Preview 使用独立数据库和 Bucket 演练升级；
5. 确认旧支付 Provider 的待支付订单和回调仍可处理。

## 升级

```bash
git fetch --tags origin
git checkout v0.1.0
pnpm install --frozen-lockfile
pnpm check-config
pnpm check
pnpm release:audit
pnpm sync-products
```

部署后检查：

- `/api/health?deep=1` 返回 `ok`；
- 首页、登录、公开课和授权课程可访问；
- 管理员后台无新增失败；
- 一个隔离测试订单能完成支付与权益发放；
- 邮件、OSS 签名和告警 Webhook 正常。

`sync-products` 只同步当前商品配置，不修改历史 OrderItem 快照。AF-03 为 User 增加的
`requiresPasswordChange` 字段默认是 `false`：既有管理员会继续使用原密码，不需要离线
迁移；只有通过新版 `/admin` 创建的首个管理员才会进入强制激活流程。

## 回滚

1. 停止继续发布内容和处理新订单；
2. 在 Vercel 将流量切回上一条已验证部署，或检出上一版本重新部署；
3. 如果新版本只增加兼容字段，不要恢复数据库；
4. 只有出现不兼容写入或数据损坏时，才按恢复手册把备份恢复到新数据库；
5. 更新 `MONGODB_URI` 指向已验证的恢复目标，再重新部署；
6. 保留支付回调地址和旧密钥，确认回调不会丢失；
7. 在 `/admin` 处理失败队列，并记录事故时间线。

不要在未验证备份时直接清空或覆盖 Production 数据库。代码回滚与数据恢复是两个独立动作。
