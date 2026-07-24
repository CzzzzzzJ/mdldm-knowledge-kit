# 架构总览

## 1. 目标架构

```mermaid
flowchart TB
    UI["Web UI<br/>首页、课程、学习台、后台"]
    API["Application API<br/>输入校验、鉴权、用例编排"]

    Site["Site Core<br/>品牌、导航、主题、设置"]
    Identity["Identity Core<br/>用户、会话、角色"]
    Catalog["Catalog Core<br/>系列、课时、分类"]
    Entitlement["Entitlement Core<br/>免费、登录、会员、单课权益"]
    Learning["Learning Core<br/>进度、作业、答疑、反馈"]
    Commerce["Commerce Core<br/>商品、订单、支付事件"]
    Media["Media Core<br/>资产、上传、下载、转码"]
    Operations["Operations Core<br/>后台、健康检查、失败队列"]

    DatabasePort["Database Port"]
    StoragePort["Storage Port"]
    PaymentPort["Payment Port"]
    EmailPort["Email Port"]
    TranscodePort["Transcode Port"]
    ObservabilityPort["Observability Port"]
    AuthPort["External Auth Port"]

    Mongo["MongoDB Adapter"]
    LocalStorage["Local Storage Adapter"]
    ObjectStorage["OSS / S3 Adapter"]
    ManualPay["Manual / Mock Payment"]
    XorPay["XorPay Adapter"]
    Mail["Console / SMTP Adapter"]
    Video["None / FFmpeg / MPS"]
    Alerts["Console / Webhook / Sentry"]
    WeChat["WeChat Adapter"]

    UI --> API
    API --> Site
    API --> Identity
    API --> Catalog
    API --> Entitlement
    API --> Learning
    API --> Commerce
    API --> Media
    API --> Operations

    Site --> DatabasePort
    Identity --> DatabasePort
    Catalog --> DatabasePort
    Entitlement --> DatabasePort
    Learning --> DatabasePort
    Commerce --> DatabasePort
    Media --> DatabasePort

    Media --> StoragePort
    Media --> TranscodePort
    Commerce --> PaymentPort
    Identity --> EmailPort
    API --> ObservabilityPort
    Identity --> AuthPort

    DatabasePort --> Mongo
    StoragePort --> LocalStorage
    StoragePort --> ObjectStorage
    PaymentPort --> ManualPay
    PaymentPort --> XorPay
    EmailPort --> Mail
    TranscodePort --> Video
    ObservabilityPort --> Alerts
    AuthPort --> WeChat
```

核心约束：

> 领域模块决定业务规则，Provider 只负责外部服务调用；未配置某个 Provider 时，核心站点仍可降级运行。

## 2. 目标数据拓扑

```mermaid
erDiagram
    SITE_SETTING ||--o{ NAV_ITEM : configures
    USER ||--o{ SESSION : owns
    USER ||--o{ ORDER : places
    USER ||--o{ ENTITLEMENT : receives
    USER ||--o{ COURSE_PROGRESS : learns
    USER ||--o{ TASK_SUBMISSION : submits

    PRODUCT ||--o{ ORDER_ITEM : sold_as
    ORDER ||--o{ ORDER_ITEM : contains
    ORDER ||--o{ PAYMENT_EVENT : receives
    ORDER ||--o{ ENTITLEMENT : grants

    SERIES ||--o{ COURSE : contains
    COURSE ||--o{ COURSE_PROGRESS : tracks
    COURSE ||--o{ COURSE_MATERIAL : provides
    COURSE ||--o{ TASK_SUBMISSION : receives
    COURSE ||--o{ COMMENT : receives

    MEDIA_ASSET ||--o{ COURSE : powers_video
    MEDIA_ASSET ||--o{ COURSE_MATERIAL : stores_file
```

关键变化：

- `Entitlement` 取代单一 `isVIP` 判断；
- `Product + OrderItem` 取代订单 JSON 中的商品信息；
- `PaymentEvent` 负责回调留痕和幂等处理；
- `MediaAsset` 统一视频、封面和课程资料；
- 微信、飞书和 AI 网关信息不进入核心 `User`。

## 3. 三条关键业务流

### 创作者初始化

```mermaid
flowchart LR
    Clone["克隆仓库"] --> Env["复制 .env.example"]
    Env --> Check["运行 check-config"]
    Check --> DB["启动 MongoDB / Docker"]
    DB --> Admin["创建首个管理员"]
    Admin --> Seed["可选导入 Demo 课程"]
    Seed --> Run["启动知识站"]
```

### 内容发布

```mermaid
flowchart LR
    Draft["创建系列和草稿课时"] --> Upload["上传封面、视频和资料"]
    Upload --> Asset["生成 MediaAsset"]
    Asset --> Transcode["可选转码"]
    Transcode --> Verify["验证可播放"]
    Verify --> Publish["发布课程"]
    Publish --> Notify["可选通知会员"]
```

### 购买与学习

```mermaid
flowchart LR
    Register["注册并验证邮箱"] --> Browse["浏览公开课程"]
    Browse --> Checkout["选择服务端商品"]
    Checkout --> Pay["Payment Provider"]
    Pay --> Webhook["验签并记录 PaymentEvent"]
    Webhook --> Entitlement["幂等授予 Entitlement"]
    Entitlement --> Learn["安全播放和资料下载"]
    Learn --> Progress["保存学习进度和成果"]
```

## 4. 计划目录

```text
mdldm-knowledge-kit/
├── app/
├── components/
├── modules/
│   ├── site/
│   ├── identity/
│   ├── catalog/
│   ├── entitlement/
│   ├── commerce/
│   ├── media/
│   ├── learning/
│   └── operations/
├── providers/
│   ├── database/mongodb/
│   ├── storage/local/
│   ├── storage/oss/
│   ├── payment/manual/
│   ├── payment/xorpay/
│   ├── email/console/
│   ├── email/smtp/
│   ├── transcode/ffmpeg/
│   └── observability/webhook/
├── config/
├── models/
├── scripts/
├── public/demo/
└── docs/
```

第一阶段保持一个 Next.js 仓库，不提前拆成复杂 Monorepo。

## 5. 当前生产部署拓扑

```mermaid
flowchart LR
    Browser["浏览器"] --> Vercel["Vercel / Next.js"]
    Vercel --> Atlas["MongoDB Atlas"]
    Vercel --> SMTP["SMTP / 阿里云邮件推送"]
    Vercel --> Signed["生成短期 OSS 签名"]
    Browser -->|"管理员 PUT 直传"| OSS["阿里云 OSS 私有 Bucket"]
    Browser -->|"鉴权后 307 读取"| OSS
```

- Vercel 负责页面、API、会话与权益编排，不持久保存媒体；
- Atlas 保存用户、Session、Token、限流、课程、权益和学习数据；
- OSS 保持私有，上传与读取都由短期签名授权；
- SMTP 只通过 Email Port 调用；
- Preview 与 Production 必须使用隔离的数据和密钥。
