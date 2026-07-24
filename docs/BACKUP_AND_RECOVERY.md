# 数据备份与恢复

本文定义 v0.1 的生产备份基线。管理员后台的“导出运营数据”用于审计和迁移查看，不包含密码哈希、Session、身份令牌、限流记录或支付回调摘要，**不能替代数据库与媒体备份**。

## 1. 建议恢复目标

个人创作者生产站可先采用：

| 数据 | 建议 RPO | 建议 RTO | 主备份 |
| --- | --- | --- | --- |
| MongoDB 业务数据 | 24 小时以内 | 4 小时以内 | Atlas Cloud Backup / `mongodump` |
| OSS 视频与资料 | 24 小时以内 | 8 小时以内 | 版本控制、跨区域复制或定期清单 |
| Vercel 环境变量 | 每次变更 | 2 小时以内 | 受控密码库中的变量清单 |
| Git 源码与配置 | 每次提交 | 1 小时以内 | GitHub 远端与 Release |

RPO 是最多可接受丢失的数据时间，RTO 是恢复服务所需时间。正式营收站应根据订单量提高备份频率。

## 2. MongoDB Atlas

### 推荐配置

1. 为 Production 使用独立 Atlas Project、Cluster 与 Database User；
2. 开启 Cloud Backup 和 Point-in-Time Restore（套餐支持时）；
3. 保留至少 7 个每日恢复点、4 个每周恢复点；
4. 配置备份失败、存储增长和连接数告警；
5. Preview 与恢复演练数据库不能连接正式站域名。

Atlas 恢复时优先恢复到新 Cluster 或新数据库名，不直接覆盖 Production。确认用户、订单、PaymentEvent、Entitlement 与 MediaAsset 数量后，再切换 `MONGODB_URI` 并重新部署。

### 自托管 MongoDB

在受控终端安装与服务端版本兼容的 MongoDB Database Tools。不要把 URI 写入仓库、脚本或 Shell 历史：

```bash
read -s "MONGODB_BACKUP_URI?MongoDB URI: "
mongodump \
  --uri "$MONGODB_BACKUP_URI" \
  --archive="mdldm-$(date +%Y%m%d-%H%M).archive" \
  --gzip
unset MONGODB_BACKUP_URI
```

归档文件应加密后传到独立存储，并记录 MongoDB 与 Database Tools 版本。恢复演练使用全新数据库：

```bash
read -s "MONGODB_RESTORE_URI?Restore target URI: "
mongorestore \
  --uri "$MONGODB_RESTORE_URI" \
  --archive="replace-with-backup.archive" \
  --gzip \
  --nsFrom="mdldm_knowledge_kit.*" \
  --nsTo="mdldm_knowledge_kit_restore_drill.*"
unset MONGODB_RESTORE_URI
```

不要把示例中的目标数据库名替换成 Production，除非已经完成停机、二次确认和可回退快照。

## 3. 阿里云 OSS

1. Bucket 保持私有并开启 Block Public Access；
2. 启用版本控制，防止误覆盖和误删除立即变成永久丢失；
3. 为历史版本配置符合业务保留期的生命周期规则；
4. 对高价值课程启用跨区域复制，或定期把清单和对象复制到独立 Bucket；
5. 开启 OSS 日志、异常删除和容量告警；
6. 定期抽查 `MediaAsset.objectKey` 对应对象存在且大小一致。

恢复媒体时先恢复对象，再恢复 MongoDB。对象 Key 必须保持不变，否则现有 MediaAsset 无法定位文件。不要把 Bucket 临时改为公共读来做恢复；继续使用私有权限和短期签名。

## 4. Vercel 与密钥

Vercel 部署历史不是完整密钥备份。至少在受控密码库中维护以下变量的名称、归属环境、轮换日期和负责人：

- `APP_URL`、`MONGODB_URI`、`AUTH_SECRET`；
- OSS RAM/STS 配置；
- SMTP 配置；
- XorPay AID 与 App Secret；
- Observability Webhook URL 与签名 Secret。

不要在备份中记录明文用户密码、Session Cookie 或一次性身份令牌。恢复到新环境时优先生成新 `AUTH_SECRET`；如果必须保留现有 Session，需要保留旧 Secret，但应评估泄露风险并安排轮换。

## 5. 恢复演练

至少每季度执行一次：

1. 新建隔离的恢复目标；
2. 恢复 MongoDB 备份，不连接正式域名；
3. 恢复或只读挂载 OSS 副本；
4. 使用隔离环境变量部署 Preview；
5. 运行 `/api/health?deep=1`；
6. 核对用户、课程、订单、权益、媒体和学习记录总数；
7. 抽查一个公开课、一个会员课和一个单课订单；
8. 验证支付回调仍保持幂等，但不要向正式支付平台发送测试回调；
9. 记录实际 RPO、RTO、缺失对象和修复项；
10. 销毁演练环境中的个人数据副本。

恢复完成后再检查 `/admin` 的统一失败队列，确认没有数据库、存储、邮件或支付故障被遗漏。

## 6. 管理员数据导出

登录管理员后台后可点击“导出运营数据”，或访问：

```text
GET /api/admin/export
```

接口返回最多每类 10,000 条的 JSON 快照，并强制 `private, no-store`。导出包含用户邮箱、订单和权益等个人数据，应加密保存、限制访问并在用途结束后删除。大于该规模时应改用数据库流式导出，不应继续增大 Serverless Function 内存载荷。

官方参考：

- [MongoDB Atlas 备份架构建议](https://www.mongodb.com/docs/atlas/architecture/current/backups/)
- [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/)
- [阿里云 OSS 版本控制对象操作](https://help.aliyun.com/zh/oss/user-guide/manage-objects-in-a-versioning-enabled-bucket)
- [阿里云 OSS 跨区域复制](https://help.aliyun.com/zh/oss/user-guide/cross-region-replication-overview/)
