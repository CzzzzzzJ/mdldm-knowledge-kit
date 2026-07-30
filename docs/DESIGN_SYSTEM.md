# mdldm 公开站设计系统

## 1. 设计定位

公开站采用从原麦当 mdldm 知识站抽离的 Neo-brutalism 视觉语言：

- 近白纸张底色与深色正文；
- 黄色作为唯一交互强调色；
- 蓝色、紫色和绿色只用于辅助色块与语义状态；
- 2px 深色描边和 4px 至 8px 硬阴影；
- 卡片使用 16px 圆角，按钮使用 12px 圆角，标签使用胶囊圆角；
- 点阵与网格背景用于页面层级，不依赖生成式图片。

公开项目保留原站的辨识度，但不复制真实用户、评价、运营数据、课程正文、第三方品牌
素材和长期签名地址。

## 2. 事实来源

全局设计 Token 位于 `app/globals.css`。公开页面只能使用语义变量，不在页面内新增独立
颜色体系。

主要变量：

- `--page`：页面背景；
- `--surface`：卡片与表单背景；
- `--surface-strong`：次级分区背景；
- `--ink`：正文、描边与硬阴影；
- `--muted`：辅助文字；
- `--accent`：主 CTA、当前状态与重点提示；
- `--brand-blue`、`--brand-purple`、`--brand-green`：辅助品牌色；
- `--hard-shadow`：硬阴影颜色。

## 3. 组件入口

公开站复用 `components/mdldm-ui.tsx`：

- `MdldmPanel`：通用描边面板；
- `MdldmPageIntro`：页面标题与返回入口；
- `MdldmSectionHeading`：栏目标题；
- `MdldmActionLink`、`MdldmButton`：统一按钮；
- `MdldmAccessBadge`：公开、注册、会员、单课与系列权益；
- `MdldmCourseCover`：站长封面或无图片几何封面；
- `MdldmSeriesCard`：系列课卡片；
- `MdldmEmptyState`：空状态与故障提示；
- `MdldmFooter`：公开页页脚。

新增公开页面时，应优先组合这些组件。只有组件无法表达新的通用场景时，才扩展组件
库，不在单个页面复制一套颜色、阴影和按钮实现。

## 4. 素材规则

- 默认 Demo 不包含自动生成的写实人物图、工作台图或课程封面；
- 没有站长封面时，由 `MdldmCourseCover` 使用设计 Token 生成几何封面；
- `heroImageUrl` 和 `coverImageUrl` 只展示站长主动配置的 HTTP(S) 图片；
- 新增仓库素材前，必须确认来源、权属、隐私和是否允许随 Apache-2.0 项目分发；
- 学员评价、作品、头像、订单、聊天、抽奖和真实统计数据不得进入公开仓库。

## 5. 页面覆盖

P0 公开页面统一使用该设计系统：

- 顶部导航与页脚；
- 首页；
- 课程搜索、分类与标签；
- 系列课详情；
- 课程学习页；
- 学习中心；
- 会员与单课价格页。

`/setup` 与后台继续共享同一组全局 Token，后续按运营界面的信息密度逐步迁移组件。
