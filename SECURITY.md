# Security Policy

## Supported versions

项目尚未发布稳定版本，目前只维护主开发分支。

## Reporting a vulnerability

在正式公开邮箱确定前，请不要在公共 Issue 中披露可利用细节。项目所有者应在公开发布前补充专用安全联系邮箱和响应 SLA。

报告建议包含：

- 受影响版本或提交；
- 复现步骤；
- 影响范围；
- 可行的缓解建议；
- 是否涉及用户数据、支付、权限或媒体访问。

## High-risk areas

以下区域的变更必须经过额外审查：

- 注册、登录、会话和管理员权限；
- Entitlement 判定；
- Product 定价、支付回调和订单状态；
- 上传、下载、HLS/MP4 播放地址；
- 外部 Webhook、邮件和通知；
- 数据导入、导出、备份和恢复。

详细工程基线见 `docs/SECURITY_BASELINE.md`。

