# Configuration

当前配置：

- `site.config.ts`：品牌、导航、主题和支持信息；
- `features.config.ts`：可选功能开关；
- `products.config.ts`：本地商品和权益定义。

仓库默认值必须为无隐私、无真实业务凭据的 Demo 配置。

商品价格和权益由服务端配置决定。修改后运行
`npm run sync-products`，已有订单仍保留下单时的商品快照。
