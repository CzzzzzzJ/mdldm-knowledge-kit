# ADR 0020：图文课内容与正文权限边界

- 状态：Accepted
- 日期：2026-08-03

## 背景

公共核心原先只有视频课：每个 Course 发布前必须绑定可用 MediaAsset。目标站长中有大量
不录视频、只交付文档教程的创作者；把正文塞进摘要、资料文件或视频字段会绕过正式发布与
Entitlement 边界，也无法保证未授权响应不泄露正文。

## 决策

1. Course 增加白名单 `contentType: video | article`，旧记录缺少字段时安全回落为 `video`；
2. `articleBody` 是最大 100,000 字符的纯文本正文，草稿可以为空，发布时必须包含非空正文；
3. 视频课仍必须绑定当前 Storage Provider 中真实存在且状态为 `ready` 的视频资产；
4. 图文课不要求 Storage Provider 或视频资产，可以只依赖 MongoDB 发布；
5. Repository 可在内部读取正文，但 Learning Query Service 只有在 Entitlement 判断通过后
   才把正文写入安全 DTO；未授权 DTO 使用 `articleBody: null`，同时清空媒体和资料；
6. 学习页使用 React 文本转义和 `white-space` 展示正文，不使用 `dangerouslySetInnerHTML`；
7. Catalog 公开列表只返回内容类型，不返回正文；后台列表只返回是否已填写正文；
8. Markdown、富文本、图片内嵌、Mixed 内容和阅读进度不在本次范围，未来需要独立安全设计。

## 备选方案

### 把 Markdown 文件作为课程资料

下载权限可复用，但不能形成站内阅读体验，也容易让公开摘要或文件 URL 变成正文事实源。

### 立即支持任意 HTML / Markdown

编辑体验更强，但需要统一 Sanitizer、链接和图片策略、版本迁移与预览一致性。第一版先用
安全纯文本打通知识付费闭环。

## 影响

- 无视频创作者可以发布公开、登录、会员、单课或系列权限的图文课；
- 文章正文进入数据库备份范围，不进入 MediaAsset；
- 新增内容类型必须同时补充 Schema、发布规则、Learning DTO 权限和 L1/L2/L4 测试；
- 从纯文本升级为 Markdown 或 Mixed 前不得直接渲染 HTML，也不得复用摘要字段。
