# 生产部署与第三方 Provider

本文是 README 部署章节的扩展说明。当前推荐组合是：

```text
Vercel（Next.js）
  + MongoDB Atlas（业务数据、Session、Token、限流）
  + 阿里云 OSS 私有 Bucket（视频与资料）
  + SMTP / 阿里云邮件推送（验证与找回邮件）
```

## 环境隔离

至少分开三组配置：

- Development：本地 MongoDB、Local Storage、Console Email；
- Preview：独立测试数据库、独立 OSS 前缀或 Bucket、测试发信地址；
- Production：正式数据库、正式私有 Bucket、正式发信域名。

不要让 Vercel Preview 连接生产数据库。环境变量修改只影响之后的新部署，修改密钥后需要重新部署。

## Vercel

1. 在 Vercel 导入 Git 仓库，Framework 保持 Next.js，Node.js 选择 22；
2. 在 Project Settings → Environment Variables 分别配置 Preview 与 Production；
3. Production 的 `APP_URL` 使用正式 HTTPS 域名；
4. 使用 `openssl rand -hex 32` 生成 `AUTH_SECRET`；
5. 配置 Atlas、OSS 与 SMTP 变量；
6. 部署后运行 `/api/health?deep=1`，确认 MongoDB 为 `ok`，且 Provider 显示 `configured`；
7. 使用生产环境变量从受控终端创建首个管理员。

Vercel Functions 的请求与响应载荷限制不适合代理大视频。本项目在 OSS 模式下使用浏览器直传和鉴权后的短期签名读取，避免把视频字节穿过函数。

官方参考：

- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Project Settings](https://vercel.com/docs/project-configuration/project-settings)
- [Vercel Functions Limits](https://vercel.com/docs/functions/limitations)

## MongoDB Atlas

1. 创建 Atlas Project 与 Cluster；
2. 创建专用 Database User，不使用个人 Atlas 登录凭据；
3. 在 Network Access 配置来源；
4. 从 Connect → Drivers 复制 SRV URI，并写入 `MONGODB_URI`；
5. URI 中的用户名和密码如包含特殊字符，需要进行 URL 编码；
6. 为 Preview 与 Production 使用不同数据库，最好使用不同 Database User；
7. 开启备份、监控和成本告警。

Vercel 使用动态出口 IP。MongoDB 的 Vercel 集成可能配置 `0.0.0.0/0`；如果采用这一方式，必须使用强随机数据库密码、最小数据库权限、TLS 和独立账号。更高安全级别应使用支持固定出口或私网连接的部署方案。

官方参考：

- [MongoDB Atlas 与 Vercel 集成](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/)
- [连接 Atlas Cluster](https://www.mongodb.com/docs/atlas/connect-to-database-deployment/)
- [Atlas Cluster 安全配置](https://www.mongodb.com/docs/atlas/setup-cluster-security/)

## 阿里云 OSS

1. 创建与主要用户区域接近的 Bucket；
2. Bucket ACL 设为私有，并开启 Block Public Access；
3. 创建专用 RAM 用户或角色，不使用阿里云主账号 AccessKey；
4. 只给目标 Bucket 对象前缀授予 `GetObject`、`PutObject`、`DeleteObject` 所需权限；
5. 配置以下环境变量：

```dotenv
STORAGE_PROVIDER=oss
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=replace-with-private-bucket
OSS_ENDPOINT=
OSS_ACCESS_KEY_ID=replace-with-ram-or-sts-key
OSS_ACCESS_KEY_SECRET=replace-with-secret
OSS_SESSION_TOKEN=
```

`OSS_ENDPOINT` 使用默认地域域名时可以留空。若使用 STS 临时凭据，需要同时配置 `OSS_SESSION_TOKEN`，并在过期前轮换部署环境变量。

管理员后台使用浏览器 PUT 直传，因此 OSS CORS 至少允许：

```text
Allowed Origins: https://你的正式域名
Allowed Methods: PUT, GET, HEAD
Allowed Headers: Content-Type
Expose Headers: ETag, Content-Length
```

Preview 域名也要单独列入，不建议使用 `*`。Bucket 仍保持私有，GET 与 PUT 都依赖短期签名。

官方参考：

- [OSS Node.js SDK](https://help.aliyun.com/zh/oss/developer-reference/nodejs-sdk/)
- [OSS 权限与访问控制](https://help.aliyun.com/zh/oss/user-guide/permissions-and-access-control-overview)
- [OSS RAM 最小权限](https://help.aliyun.com/en/oss/user-guide/ram-policy/)

## SMTP 与阿里云邮件推送

本地默认：

```dotenv
EMAIL_PROVIDER=console
```

验证和找回链接会输出到服务端终端，仅用于开发。生产配置：

```dotenv
EMAIL_PROVIDER=smtp
EMAIL_FROM=Knowledge Kit <sender@example.com>
SMTP_HOST=smtpdm.aliyun.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=sender@example.com
SMTP_PASSWORD=replace-with-smtp-password
```

阿里云邮件推送中，SMTP 用户名必须与已配置的发信地址一致，密码是发信地址的 SMTP 密码，不是阿里云账号密码。上线前完成发信域名、DNS、发信地址和额度验证。

官方参考：

- [阿里云 SMTP 发送邮件](https://help.aliyun.com/en/direct-mail/user-guide/send-emails-using-smtp)
- [阿里云邮件推送发送方式](https://help.aliyun.com/zh/direct-mail/getting-started/three-mail-sending-methods)

## 首个管理员与邀请码

管理员只能从受控终端创建：

```bash
npm run create-admin -- \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password-2026"
```

Vercel 项目链接后，可以让命令临时读取 Production 环境变量：

```bash
vercel env run -e production -- npm run create-admin -- \
  --name "Admin" \
  --email "admin@example.com" \
  --password "replace-with-a-strong-password-2026"
```

创建一年期单人会员邀请码：

```bash
npm run create-invitation -- \
  --type membership \
  --duration-days 365 \
  --max-redemptions 1 \
  --admin-email "admin@example.com"
```

单课或系列邀请码还需要 `--target-id`。明文邀请码只显示一次，数据库只保存摘要。

## 上线检查

```bash
npm run check-config
npm run check
npm run test:e2e
```

同时人工确认：

- `APP_URL` 与最终 HTTPS 域名完全一致；
- Preview 不连接生产数据；
- OSS Bucket 不可匿名读取；
- 未授权媒体请求返回 403；
- SMTP 能收到验证和重置邮件；
- Atlas 有备份与告警；
- `.env*`、AccessKey、SMTP 密码未进入 Git。
