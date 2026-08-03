# Configuration

当前配置：

- `.env.example`：最低核心、运行默认值与按需 Provider；
- `site.config.ts`：品牌、导航、主题和支持信息；
- `features.config.ts`：可选功能开关；
- `products.config.ts`：本地商品和权益定义。

仓库默认值必须为无隐私、无真实业务凭据的 Demo 配置。

商品价格和权益由服务端配置决定。修改后运行
`pnpm sync-products`，已有订单仍保留下单时的商品快照。

环境变量只保存基础设施地址、密钥和启动级选择。日常品牌、课程和商品运营设置应进入
受保护后台，不继续堆到 `.env`。

最低配置、Provider 白名单、能力关闭后的行为和 Development/Preview/Production 差异
见 [`docs/CAPABILITY_MATRIX.md`](../docs/CAPABILITY_MATRIX.md)。配置解析只校验当前已经
选择的能力；未选择能力的变量不会阻断启动。`pnpm check-config` 与后台状态都只返回
变量名和脱敏说明，不返回变量值。
