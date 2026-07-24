# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| `0.1.x` | Yes |
| `< 0.1.0` | No |

## Reporting a vulnerability

请通过 GitHub 的 [Private vulnerability reporting](https://github.com/CzzzzzzJ/mdldm-knowledge-kit/security/advisories/new) 提交安全问题。不要在公共 Issue、Discussion、Pull Request 或截图中披露可利用细节、真实密钥和用户数据。

报告建议包含：

- 受影响版本或提交；
- 复现步骤；
- 影响范围；
- 可行的缓解建议；
- 是否涉及用户数据、支付、权限或媒体访问。

维护者目标是在 3 个工作日内确认收到报告，并在 14 天内给出初步影响判断和后续安排。实际修复时间取决于风险、复现和兼容性；在补丁可用前，双方应保持细节私密。

## High-risk areas

以下区域的变更必须经过额外审查：

- 注册、登录、会话和管理员权限；
- Entitlement 判定；
- Product 定价、支付回调和订单状态；
- 上传、下载、HLS/MP4 播放地址；
- 外部 Webhook、邮件和通知；
- 数据导入、导出、备份和恢复。

详细工程基线见 `docs/SECURITY_BASELINE.md`。
