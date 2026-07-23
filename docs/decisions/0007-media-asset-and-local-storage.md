# ADR 0007：媒体资产与本地存储策略

- 状态：Accepted
- 日期：2026-07-24

## 背景

原站的视频、封面和课程资料分别使用不同上传接口与 OSS 字段，导致权限、对象键、文件状态和引用关系难以统一。Phase 2 需要先提供无云服务也能工作的本地交付链路。

## 决策

所有视频、图片和资料先创建 `MediaAsset`，课程与资料只保存资产引用。

`MediaAsset` 至少记录：

- owner；
- kind；
- status；
- provider；
- objectKey；
- originalName；
- mimeType；
- size；
- checksum。

Local Storage Provider：

- 默认写入 `LOCAL_STORAGE_PATH`；
- 对象键由服务端生成，不使用用户文件名决定路径；
- 拒绝逃逸存储根目录的对象键；
- 只允许白名单 MIME 类型和明确大小限制；
- 数据库记录失败时回收已写入文件。

媒体访问：

- MP4 通过受控 Route Handler 返回；
- 支持单段 HTTP Range 请求；
- 播放和资料下载都在服务端执行课程与资料权益检查；
- 响应使用 `private, no-store`，不暴露绝对文件路径；
- 发布课程前必须确认视频资产为 `ready` 且本地文件存在。

## 备选方案

### 直接使用 `public/` 目录

实现简单，但无法执行服务端权益检查，也无法阻止公开列举。

### Phase 2 直接依赖 OSS

更接近原站生产环境，但会阻止无第三方账号的 Demo 启动。

### 课程直接保存文件路径

文件少，但无法统一管理 checksum、状态、owner 和 Provider。

## 影响

- `uploads/` 永不进入 Git；
- Demo Seed 生成合成 MP4 和虚构资料，不使用原站媒体；
- OSS/S3 Adapter 后续实现相同 Storage Port；
- 多清晰度 HLS、转码状态机和孤儿资产清理在后续迭代补齐。
