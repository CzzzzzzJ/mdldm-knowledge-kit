export interface SetupAction {
  title: string;
  detail: string;
}

export interface SetupLink {
  label: string;
  href: string;
}

export interface SetupLesson {
  slug: string;
  group: "开始" | "基础设施" | "开始运营";
  navLabel: string;
  title: string;
  summary: string;
  purpose: string;
  outcome: string;
  estimatedMinutes: number;
  actions: SetupAction[];
  envKeys: string[];
  validation: {
    command: string;
    expected: string;
  };
  prompt: string;
  links: SetupLink[];
}

const sharedPromptRules = `你正在当前 mdldm-knowledge-kit 仓库中工作。先阅读 PROJECT.md、ARCHITECTURE.md、TASKS.md、docs/SECURITY_BASELINE.md 和相关 ADR。

安全要求：
1. 不创建第二个项目，不复制私有原项目代码或数据。
2. 不输出、记录或提交任何密钥、Token、数据库 URI、Bucket 名称、用户数据和支付回调原文。
3. 密钥只允许写入我自己的 .env.local、Vercel Environment Variables 或 Secret Manager。
4. 先做只读检查。任何会创建外部资源、发信、扣款或写入远端数据的动作都先告诉我影响。
5. 完成后给出实际执行过的验证、结果和仍需我手动完成的事项。`;

export const setupLessons: readonly SetupLesson[] = [
  {
    slug: "welcome",
    group: "开始",
    navLabel: "理解开站路径",
    title: "先知道整条路，再开始填配置",
    summary:
      "你会在同一个知识站里完成部署、连接服务、发布课程和学员验收。",
    purpose:
      "把基础设施配置和日常运营分开。以后更新课程、调整价格和处理订单时，不需要反复修改代码或密钥。",
    outcome:
      "一份适合你的开站清单，以及 Preview 和 Production 相互隔离的基本方案。",
    estimatedMinutes: 5,
    actions: [
      {
        title: "确定测试环境",
        detail:
          "先使用独立 Preview 数据库、测试存储空间和测试发件人。不要让测试站连接正式用户数据。",
      },
      {
        title: "准备平台账号",
        detail:
          "准备 GitHub、Vercel、MongoDB Atlas、阿里云和支付平台账号。暂时不接支付时可以先用 Manual。",
      },
      {
        title: "保留可降级方案",
        detail:
          "最低组合使用 Local Storage、Console Email 和 Manual Payment；只有测试支付时才显式切换 Mock，外部能力按运营目标逐项启用。",
      },
    ],
    envKeys: [],
    validation: {
      command: "pnpm check-config",
      expected:
        "命令会说明当前配置是否可启动，并列出仍在使用的本地或演示 Provider。",
    },
    prompt: `${sharedPromptRules}

任务：
请只读审视当前项目的运行环境，结合我准备使用的部署平台，为我生成一份开站前置清单。把事项分成“必须先完成”“可以稍后完成”“生产上线前必须复查”。不要修改文件，也不要创建任何外部资源。`,
    links: [],
  },
  {
    slug: "deploy",
    group: "基础设施",
    navLabel: "部署与安全",
    title: "先让知识站拥有稳定的公网地址",
    summary:
      "Vercel 负责运行页面和 API，正式域名会成为邮件链接和支付回调的共同入口。",
    purpose:
      "注册验证、找回密码和支付通知都需要一个稳定的 HTTPS 地址。如果地址不断变化，用户会收到失效链接，支付平台也无法可靠回调。",
    outcome:
      "一个可访问的 Preview 部署、独立的生产配置区域，以及重新生成的会话密钥。",
    estimatedMinutes: 15,
    actions: [
      {
        title: "导入当前仓库",
        detail:
          "在 Vercel 导入这个仓库，Framework 保持 Next.js，Node.js 使用项目要求的版本。",
      },
      {
        title: "区分 Preview 与 Production",
        detail:
          "两套环境使用不同数据库和测试资源。环境变量变更后要重新部署才会生效。",
      },
      {
        title: "生成新的会话密钥",
        detail:
          "运行 openssl rand -hex 32，把结果只写入自己的 Secret Manager。不要复用原项目密钥。",
      },
      {
        title: "确认正式地址",
        detail:
          "Production 的 APP_URL 使用最终 HTTPS 域名，不要填写 localhost 或临时 Preview 地址。",
      },
    ],
    envKeys: ["APP_URL", "APP_NAME", "AUTH_SECRET", "NODE_ENV"],
    validation: {
      command: "pnpm check-config",
      expected:
        "生产环境会拒绝 HTTP APP_URL、弱 AUTH_SECRET 和 Mock Payment。",
    },
    prompt: `${sharedPromptRules}

任务：
请帮我把当前仓库部署到 Vercel。先检查 package.json、.env.example 和 docs/DEPLOYMENT.md，再列出 Preview 与 Production 分别需要的环境变量。可以使用 Vercel CLI 做只读检查，但不要在对话或日志中显示变量值。生成新的 AUTH_SECRET 时只告诉我应该保存到哪里，不要回显它。部署后运行配置检查并验证首页与 /api/health。`,
    links: [
      {
        label: "Vercel 环境变量文档",
        href: "https://vercel.com/docs/environment-variables",
      },
    ],
  },
  {
    slug: "database",
    group: "基础设施",
    navLabel: "连接 MongoDB",
    title: "让用户、订单和学习进度有可靠的家",
    summary:
      "MongoDB 保存账号、Session、课程、订单、权益和学习记录，是知识站的业务事实源。",
    purpose:
      "没有稳定数据库，注册、购买和学习进度都无法跨请求保存。Preview 与 Production 分库还能避免测试操作污染正式数据。",
    outcome:
      "一个使用专用 Database User 的 Atlas 数据库，以及通过深度健康检查的连接。",
    estimatedMinutes: 15,
    actions: [
      {
        title: "创建独立 Cluster 和 Database User",
        detail:
          "数据库账号只授予当前知识站所需权限，不要使用个人 Atlas 登录账号连接应用。",
      },
      {
        title: "配置网络访问",
        detail:
          "根据部署方式设置 Network Access。若必须开放动态出口，依赖 TLS、强密码和最小权限降低风险。",
      },
      {
        title: "保存连接字符串",
        detail:
          "把 SRV URI 写入自己的 Vercel 环境变量或 .env.local，绝不提交到 Git。",
      },
      {
        title: "执行只读 Ping",
        detail:
          "使用当前页面右侧的只读检查，或运行 Provider 验证命令。检查不会写入业务数据。",
      },
    ],
    envKeys: ["MONGODB_URI"],
    validation: {
      command: "pnpm validate:providers --live",
      expected:
        "MongoDB 显示 PASS，或者 /api/health?deep=1 的 database.status 显示 ok。",
    },
    prompt: `${sharedPromptRules}

任务：
请帮我完成当前项目的 MongoDB Atlas 接入。先检查 config/env.ts 和 MongoDB Provider，再告诉我如何创建专用 Database User、隔离 Preview 与 Production 数据库，并把 MONGODB_URI 安全地设置到部署环境。不要打印 URI。最后只执行 Ping 或健康检查，不要写入、迁移或删除业务数据。`,
    links: [
      {
        label: "MongoDB Atlas 连接文档",
        href: "https://www.mongodb.com/docs/atlas/connect-to-database-deployment/",
      },
    ],
  },
  {
    slug: "storage",
    group: "基础设施",
    navLabel: "配置阿里云 OSS",
    title: "需要视频和资料时，再接入持久对象存储",
    summary:
      "纯核心运行不要求 OSS；使用 Serverless 交付课程视频和资料时，OSS 保存对象，Vercel 只签发短期访问权限。",
    purpose:
      "Vercel 的运行磁盘不会长期保存文件，大视频也不适合穿过 Serverless Function。私有 OSS 配合短期签名才能兼顾稳定交付和访问控制。",
    outcome:
      "一个开启 Block Public Access 的私有 Bucket、最小权限 RAM 身份和正确的 CORS。",
    estimatedMinutes: 20,
    actions: [
      {
        title: "创建私有 Bucket",
        detail:
          "开启 Block Public Access，不允许匿名列举或读取课程文件。",
      },
      {
        title: "创建最小权限 RAM 身份",
        detail:
          "只授予目标 Bucket 或前缀所需的 GetObject、PutObject 和 DeleteObject 权限。",
      },
      {
        title: "配置 CORS",
        detail:
          "只加入自己的正式域名和 Preview 域名，允许 PUT、GET、HEAD，并暴露 ETag 与 Content-Length。",
      },
      {
        title: "切换 Storage Provider",
        detail:
          "配置完整变量后再把 STORAGE_PROVIDER 改为 oss。已有 Local 文件不会自动迁移。",
      },
    ],
    envKeys: [
      "STORAGE_PROVIDER",
      "OSS_REGION",
      "OSS_BUCKET",
      "OSS_ACCESS_KEY_ID",
      "OSS_ACCESS_KEY_SECRET",
      "OSS_SESSION_TOKEN",
    ],
    validation: {
      command: "pnpm validate:providers --live",
      expected:
        "OSS 只读鉴权检查显示 PASS。正式上传前还要在隔离前缀完成一次写入和删除测试。",
    },
    prompt: `${sharedPromptRules}

任务：
请帮我把当前项目从 Local Storage 切换到阿里云 OSS。先检查 providers/storage、config/env.ts 和 docs/DEPLOYMENT.md。给出私有 Bucket、最小权限 RAM Policy 与 CORS 的配置清单，但不要读取或打印 AccessKey。设置完成后先运行无副作用的鉴权检查。任何上传或删除测试都必须使用隔离前缀，并在执行前征得我的确认。`,
    links: [
      {
        label: "OSS 权限与访问控制",
        href: "https://help.aliyun.com/zh/oss/user-guide/permissions-and-access-control-overview",
      },
    ],
  },
  {
    slug: "email",
    group: "基础设施",
    navLabel: "配置验证邮件",
    title: "让用户真的能完成注册和找回密码",
    summary:
      "SMTP 负责发送验证与重置链接，Console Email 只适合本地开发。",
    purpose:
      "邮箱验证是账号归属和找回密码的基础。生产站如果仍使用 Console Email，自助注册、重发验证和找回密码会明确停用，避免创建无法完成验证的账号。",
    outcome:
      "一个完成域名验证的发件地址，以及通过 SMTP Verify 和真实收件测试的邮件通道。",
    estimatedMinutes: 15,
    actions: [
      {
        title: "完成发信域名与 DNS 验证",
        detail:
          "先在邮件平台验证域名和发信地址，确认额度、退信和垃圾邮件策略。",
      },
      {
        title: "创建 SMTP 凭据",
        detail:
          "SMTP 密码不是云平台登录密码。使用专用发件人，不把密码写进仓库。",
      },
      {
        title: "切换 Email Provider",
        detail:
          "设置 EMAIL_PROVIDER=smtp，并确认 EMAIL_FROM 与已验证发信地址匹配。",
      },
      {
        title: "分两级验收",
        detail:
          "先用 verify() 检查连接，再向自己的测试邮箱发送一封注册验证邮件。",
      },
    ],
    envKeys: [
      "EMAIL_PROVIDER",
      "EMAIL_FROM",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_SECURE",
      "SMTP_USER",
      "SMTP_PASSWORD",
    ],
    validation: {
      command: "pnpm validate:providers --live",
      expected:
        "SMTP Verify 显示 PASS。它不会发送邮件，真实收件需要再完成一次隔离测试。",
    },
    prompt: `${sharedPromptRules}

任务：
请帮我接入当前项目的 SMTP 邮件 Provider。先检查 providers/email、注册验证和找回密码流程。指导我完成发信域名、EMAIL_FROM 和 SMTP 变量配置，不要显示 SMTP 用户名或密码。先执行 SMTP Verify。需要发送测试邮件时只发到我明确提供的测试邮箱，并在发送前再次确认。最后验证注册链接和重置链接使用正确的 APP_URL。`,
    links: [
      {
        label: "阿里云 SMTP 发送邮件",
        href: "https://help.aliyun.com/en/direct-mail/user-guide/send-emails-using-smtp",
      },
    ],
  },
  {
    slug: "payment",
    group: "基础设施",
    navLabel: "选择支付方式",
    title: "先安全卖出一单，再正式开放购买",
    summary:
      "可以从人工确认开始，也可以接入 XorPay。商品价格和权益始终由服务端决定。",
    purpose:
      "支付不是只生成二维码。还要保证金额不能被客户端修改、回调经过验签、重复通知不重复授权，失败后可以追踪和重试。",
    outcome:
      "一个适合当前阶段的支付 Provider，以及完成低价隔离订单的验收方案。",
    estimatedMinutes: 20,
    actions: [
      {
        title: "先选择上线方式",
        detail:
          "小规模试运营可以用 Manual。生产环境不能使用 Mock，接入 XorPay 后再开放自动支付。",
      },
      {
        title: "重新生成回调地址",
        detail:
          "使用当前站点的新 APP_URL 和 /api/payments/webhooks/xorpay，不能复用原项目旧路由。",
      },
      {
        title: "确认服务端商品",
        detail:
          "浏览器只提交 productId。金额、币种、权益类型和期限都由服务端 Product 生成。",
      },
      {
        title: "执行低价隔离订单",
        detail:
          "检查支付成功、PaymentEvent、订单履约和 Entitlement，再重放同一通知验证幂等。",
      },
    ],
    envKeys: [
      "PAYMENT_PROVIDER",
      "MANUAL_PAYMENT_INSTRUCTIONS",
      "XORPAY_AID",
      "XORPAY_APP_SECRET",
      "XORPAY_NOTIFY_URL",
    ],
    validation: {
      command: "pnpm check-config && pnpm test tests/payment/xorpay.test.ts",
      expected:
        "配置校验通过，签名、金额校验和重复回调测试全部通过。真实订单仍需人工执行。",
    },
    prompt: `${sharedPromptRules}

任务：
请帮我为当前知识站选择并配置支付方式。先说明 Manual 与 XorPay 对当前运营阶段的差别。若选择 XorPay，检查 Product、Order、PaymentEvent、Entitlement 和回调路由，确保客户端不能决定金额。不要打印 AID 或 App Secret。先运行本地签名与幂等测试，再给出一笔隔离低价订单的验收步骤。创建真实订单或扣款前必须征得我的确认。`,
    links: [
      { label: "XorPay API 文档", href: "https://xorpay.com/doc/api.html" },
    ],
  },
  {
    slug: "operate",
    group: "开始运营",
    navLabel: "配置并发布首课",
    title: "把技术底座变成你自己的知识站",
    summary:
      "设置站点名称、会员与单课商品，然后在当前后台发布第一门真实课程。",
    purpose:
      "第三方平台只保证站点能运行，真正能够运营还需要清晰的品牌、可购买的商品、已发布内容和正确的访问权益。",
    outcome:
      "一个完成基础品牌设置的站点、一种可售权益和至少一节经过预览的课程。",
    estimatedMinutes: 25,
    actions: [
      {
        title: "确定最小品牌信息",
        detail:
          "准备站点名称、一句话定位、创作者介绍、联系方式和首页推荐内容。",
      },
      {
        title: "选择首个商品",
        detail:
          "先发布全站会员或一门单课，不必一次配置所有价格与套餐。",
      },
      {
        title: "创建系列与课时",
        detail:
          "在当前后台创建系列、草稿课时，上传视频和资料，再设置访问级别。",
      },
      {
        title: "使用学员视角预览",
        detail:
          "分别检查访客、登录用户、会员和单课用户看到的标题、价格、目录和播放权限。",
      },
    ],
    envKeys: [],
    validation: {
      command: "pnpm seed-demo && pnpm dev",
      expected:
        "可以从 /admin 管理内容，在 /courses 浏览课程，在 /pricing 查看两种付费模式。",
    },
    prompt: `${sharedPromptRules}

任务：
请在当前项目中协助我完成第一轮站点运营配置，不创建独立页面或第二套课程系统。先检查现有 /admin、/courses、/pricing、站点配置和 Product/SKU。引导我准备站点名称、定位、创作者资料、首个会员或单课商品，以及第一节课程。所有 Demo 内容必须是虚构数据。价格和权益只能通过服务端 Product 管理，不能把最终金额交给客户端。完成后分别检查访客、会员和单课用户路径。`,
    links: [
      { label: "打开当前课程后台", href: "/admin" },
      { label: "浏览当前课程页", href: "/courses" },
      { label: "查看当前价格页", href: "/pricing" },
    ],
  },
  {
    slug: "acceptance",
    group: "开始运营",
    navLabel: "完成真实验收",
    title: "用一名真实学员的路径检查整站",
    summary:
      "从注册到购买、观看和后台处置完整走一遍，才能知道站点是否真的可以开放。",
    purpose:
      "配置检查只能证明变量和连接存在。真实运营还依赖邮件送达、支付回调、权益授予、媒体访问、学习进度和后台排障共同成立。",
    outcome:
      "一份脱敏验收记录，包含成功路径、失败路径、清理结果和仍需修复的问题。",
    estimatedMinutes: 20,
    actions: [
      {
        title: "准备隔离测试身份",
        detail:
          "使用测试邮箱和低价测试商品，不使用原项目真实用户、订单或课程。",
      },
      {
        title: "完成学员主路径",
        detail:
          "注册、验证邮箱、浏览课程、购买、获得权益、播放视频、下载资料并保存进度。",
      },
      {
        title: "验证拒绝路径",
        detail:
          "未登录、无权益、过期权益、错误签名和篡改金额都必须被服务端拒绝。",
      },
      {
        title: "检查后台处置",
        detail:
          "确认管理员能找到订单、权益和失败记录，并能在不查看敏感日志的情况下处理问题。",
      },
      {
        title: "清理测试状态",
        detail:
          "删除临时 OSS 对象和测试资源，保留脱敏结果，不在仓库记录账号与外部标识。",
      },
    ],
    envKeys: [],
    validation: {
      command: "pnpm check && pnpm test:e2e",
      expected:
        "自动化质量门通过，真实 L3 旅程另行记录测试账号、外部状态和清理结果的脱敏摘要。",
    },
    prompt: `${sharedPromptRules}

任务：
请作为未参与开发的测试者，按真实学员旅程验收当前知识站。先读取 docs/L5_RELEASE_ACCEPTANCE.md 和 docs/PROVIDER_VALIDATION.md，生成不包含任何敏感值的验收记录。依次验证注册、邮件、会员购买、单课购买、回调幂等、权益、播放、资料下载、学习进度和管理员故障处置。涉及真实发信、低价支付、远端写入和清理时逐项向我确认。发现问题只记录可复现步骤和脱敏错误，不直接扩大修改范围。`,
    links: [
      { label: "打开注册页", href: "/register" },
      { label: "打开订单页", href: "/account/orders" },
      { label: "打开系统后台", href: "/admin" },
    ],
  },
] as const;

export function getSetupLesson(slug: string | undefined): SetupLesson {
  return (
    setupLessons.find((lesson) => lesson.slug === slug) ?? setupLessons[0]
  );
}
