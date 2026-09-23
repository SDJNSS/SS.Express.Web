---
version: alpha
name: 'SS.Express.Web 陆链控制台'
description: '面向 IAM、TMS、VMS 等物流运营子系统的高密度、克制、可靠的桌面管理控制台。'
colors:
  primary: '#2f6bff'
  primary-hover: '#1f5be8'
  primary-light: '#eaf1ff'
  success: '#20b26b'
  success-light: '#e8f7ef'
  warning: '#f59a23'
  warning-light: '#fff3e3'
  danger: '#ef4e52'
  danger-light: '#ffebec'
  info: '#6b7a90'
  info-light: '#edf1f6'
  license-plate: '#1963bd'
  sidebar-brand: '#6ea0ff'
  sidebar-label: '#8fa2bf'
  sidebar-link: '#b8c4d7'
  sidebar-muted: '#9fb0c9'
  sidebar-indicator: '#68a0ff'
  text-primary: '#172033'
  text-regular: '#344054'
  text-secondary: '#667085'
  text-disabled: '#98a2b3'
  text-inverse: '#f8fafc'
  background-page: '#f5f7fa'
  background-card: '#ffffff'
  background-muted: '#f8fafc'
  background-sidebar: '#0b1830'
  background-sidebar-hover: 'rgba(55, 112, 235, 0.2)'
  background-sidebar-active: '#17478d'
  border-default: '#dfe4ec'
  border-light: '#edf0f5'
  border-focus: '#2f6bff'
  chart-tooltip-background: 'rgba(11, 24, 48, 0.94)'
typography:
  sans:
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif"
  helper:
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif"
    fontSize: '12px'
  compact:
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif"
    fontSize: '12px'
  body:
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif"
    fontSize: '13px'
  emphasis:
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif"
    fontSize: '14px'
  section-title:
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif"
    fontSize: '16px'
  page-title:
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif"
    fontSize: '18px'
  metric:
    fontFamily: "Inter, 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', system-ui, sans-serif"
    fontSize: '20px'
rounded:
  small: '4px'
  DEFAULT: '6px'
  large: '8px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '20px'
  '6': '24px'
  '8': '32px'
  '10': '40px'
  '12': '48px'
components:
  app-page:
    backgroundColor: '{colors.background-page}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    padding: '{spacing.3}'
  auth-page-template:
    backgroundColor: '{colors.background-sidebar}'
    textColor: '{colors.text-inverse}'
    typography: '{typography.body}'
    padding: '{spacing.12}'
  page-header:
    backgroundColor: '{colors.background-card}'
    textColor: '{colors.text-primary}'
    typography: '{typography.page-title}'
  search-panel:
    backgroundColor: '{colors.background-muted}'
    textColor: '{colors.text-regular}'
    rounded: '{rounded.DEFAULT}'
    padding: '{spacing.3}'
  data-table:
    backgroundColor: '{colors.background-card}'
    textColor: '{colors.text-regular}'
    typography: '{typography.body}'
  table-toolbar:
    textColor: '{colors.text-secondary}'
    typography: '{typography.compact}'
  app-pagination:
    textColor: '{colors.text-regular}'
    typography: '{typography.body}'
  form-dialog:
    backgroundColor: '{colors.background-card}'
    textColor: '{colors.text-regular}'
    rounded: '{rounded.large}'
  form-drawer:
    backgroundColor: '{colors.background-card}'
    textColor: '{colors.text-regular}'
  detail-drawer:
    backgroundColor: '{colors.background-card}'
    textColor: '{colors.text-regular}'
  primary-action:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.text-inverse}'
    rounded: '{rounded.DEFAULT}'
  primary-action-hover:
    backgroundColor: '{colors.primary-hover}'
  primary-action-subtle:
    backgroundColor: '{colors.primary-light}'
  disabled-content:
    textColor: '{colors.text-disabled}'
  status-tag-success:
    textColor: '{colors.success}'
  status-tag-success-surface:
    backgroundColor: '{colors.success-light}'
  status-tag-warning:
    textColor: '{colors.warning}'
  status-tag-warning-surface:
    backgroundColor: '{colors.warning-light}'
  status-tag-danger:
    textColor: '{colors.danger}'
  status-tag-danger-surface:
    backgroundColor: '{colors.danger-light}'
  status-tag-info:
    textColor: '{colors.info}'
  status-tag-info-surface:
    backgroundColor: '{colors.info-light}'
  license-plate:
    backgroundColor: '{colors.license-plate}'
    textColor: '{colors.text-inverse}'
    rounded: '{rounded.small}'
  app-sidebar:
    backgroundColor: '{colors.background-sidebar}'
  app-sidebar-brand:
    textColor: '{colors.sidebar-brand}'
  app-sidebar-label:
    textColor: '{colors.sidebar-label}'
  app-sidebar-link:
    textColor: '{colors.sidebar-link}'
  app-sidebar-muted:
    textColor: '{colors.sidebar-muted}'
  app-sidebar-indicator:
    backgroundColor: '{colors.sidebar-indicator}'
  app-sidebar-item-hover:
    backgroundColor: '{colors.background-sidebar-hover}'
  app-sidebar-item-active:
    backgroundColor: '{colors.background-sidebar-active}'
  separator-default:
    backgroundColor: '{colors.border-default}'
  separator-light:
    backgroundColor: '{colors.border-light}'
  focus-ring:
    backgroundColor: '{colors.border-focus}'
  chart-tooltip:
    backgroundColor: '{colors.chart-tooltip-background}'
    textColor: '{colors.text-inverse}'
  empty-state:
    textColor: '{colors.text-secondary}'
    typography: '{typography.body}'
  loading-state:
    textColor: '{colors.text-secondary}'
    typography: '{typography.body}'
  list-page-template:
    padding: '{spacing.4}'
  detail-page-template:
    padding: '{spacing.4}'
  form-page-template:
    padding: '{spacing.4}'
  dashboard-page-template:
    padding: '{spacing.4}'
  workspace-page-template:
    padding: '{spacing.4}'
  wizard-page-template:
    padding: '{spacing.4}'
---

# SS.Express.Web Design System

## Overview

### Creative North Star

界面应像物流调度席上的“电子运行图”：深色稳定的导航框架承载统一方向，浅色工作面承载密集但有秩序的信息，路线、状态、时效和运力是少数可以获得表达性的内容。它不是品牌宣传页，而是一张长时间打开、需要快速判断和可靠操作的运营工作台。

### Product context and register

- **Audience and primary job:** 物流运营、调度、车务与平台管理员，在 IAM、TMS、VMS 等子系统中查询、比较和处理运营对象。
- **Target market(s) and evidence:** 当前项目以中文企业物流后台为证据范围；具体业务市场必须由目标页面 PRD 说明，不能从语言推断。
- **Locale(s) and language policy:** 当前界面为 `zh-CN`，产品自有文案、Element Plus 组件和无障碍名称均使用简体中文；新增语言前需建立完整 locale 资源和验证矩阵。
- **Usage scene:** 桌面浏览器、长时间高频操作、信息密度中高；主要宽度约 1440px，并固定验证三个标准桌面视口。
- **Register:** Product/admin。任务清晰度、可扫描性、状态完整性和跨页面一致性优先。
- **Memorable signature:** 深海军蓝 App Shell 与运输路线/状态信息的克制蓝色高亮。
- **Restraint:** 表单、表格、分页、对话框和危险操作必须沿用熟悉的后台交互，不为“独特”改变语义或位置。
- **Anti-references:** 不做营销型 Hero、玻璃拟态、通用 SaaS 大卡片堆叠、超大圆角、霓虹黑底“AI 控制台”或无意义动效；这些形式会削弱运营密度和可信度。
- **Token ownership/runtime mapping:** 采用 Model B。`src/shared/styles/tokens.scss` 是运行时唯一值源；本文件镜像已接受值并解释意图。`standards/registry.json` 只保存 DESIGN 路径到 CSS 变量的映射，`pnpm design:check` 校验漂移。Element Plus 变量在同一 Token 文件中适配，图表通过 `runtimeTokens.ts` 读取运行时变量。

设计证据包括 `docs/design/concepts/platform-dashboard.png` 与 `docs/design/concepts/vms-vehicle-list.png`。它们是当前视觉方向的项目证据，不替代 PRD、Page Contract 或运行时 Token。

## Colors

主色只表达安全的主行动、当前导航和焦点；成功、警告、危险、信息色只表达相应语义，不能作为装饰性色带。页面背景、内容面和边框使用低对比度的冷灰层级，让数据状态而不是容器本身成为注意力中心。

当前只支持 Light Theme。系统高对比度/forced-colors 模式应让浏览器接管必要颜色，不能以品牌色覆盖系统可辨识性。图表从语义 Token 取色，并提供文本、表格或数值作为等价信息。

## Typography

高密度运营界面以 13px 为正文与控件基线，12px 仅用于辅助信息和紧凑元数据；标题与关键指标通过 16–20px 的有限层级建立结构。长文本、详情正文等需要连续阅读的内容可保留 14px 强调层级，不得低于 12px。中文字体栈优先保证 Windows 和常见中文环境的可读性，数字与拉丁字符使用同一无衬线栈。

`Inter` 当前只是首选字体名，仓库没有固定字体资产；不得把它的确定加载作为布局假设。三个标准视口的浏览器验证必须覆盖实际回退字体、长中文、长编号和中英文混排。正文不默认使用斜体，按钮文案使用明确动词，表格编号避免不必要的字距。

## Layout

认证后的业务页面采用唯一 `AppLayout` 生产绑定，其无路由、无会话依赖的视觉 Owner 为 `src/shared/components/AppShell.vue`；UIDesign 与生产绑定复用同一壳层，不能各自维护结构副本。业务页面使用 `AppPage`、`PageHeader` 和登记的 Page Template。认证前页面使用 Registry 登记的 `StandaloneAuthLayout + AuthPageTemplate`，不得显示或复制登录后 App Shell；凭据登录采用左右分区，找回与验证等短流程采用单列聚焦式变体，并统一复用 `AuthBrand`。固定壳层尺寸由运行时 Token 控制：顶部栏、侧栏、折叠侧栏、控件、表格行和页面最小宽度均不得在页面内重新定义。侧栏收起控制固定在右侧中部并使用方向明确的左右箭头；账户入口固定在侧栏底部，展开态以左侧头像、右侧上下排列的用户名与当前 Tenant 名称表达会话身份，折叠态只保留可访问头像入口。顶部子系统入口以克制的半透明分割线建立边界。

`AppShell` 的面包屑最后一级是生产环境唯一可见的页面标题，并使用语义化 `h1`；面包屑路径、分隔符与标题必须共享同一垂直中心线。页面级通用动作进入同一栏右侧的动作区。`PageHeader` 仍是页面标题、说明和动作的代码 Owner：位于生产 `AppShell` 时只把动作装配到面包屑，普通独立 Preview 或无壳层环境则继续自行展示标题、说明与动作，避免 Preview 失去评审上下文。页面内部不再重复展示同名标题或纯粹复述当前会话 Tenant 的横幅；目标对象、目标 Tenant 等业务上下文仍必须保留。

`app-shell__content` 是认证后业务页面的唯一生产承载区。其直接页面根必须通过 `AppPage` 建立 `flex: 1`、`min-width: 0`、`min-height: 0` 和内容盒边界，再由登记的内容型 Page Template 分配内部区域。`AuthPageTemplate` 是明确登记的 standalone 例外，只用于认证前路由，并由应用根高度链承载。Feature 不得复制 `AppShell`，也不得使用视口单位或桌面视口级固定宽高绕过容器；宽内容应在表格或明确的数据面板内滚动，而不是撑大页面根。Page Pattern 是正常高度下的首选滚动 Owner，但所有 `AppPage` 都必须保留纵向 `auto` 滚动兜底；浏览器高度缩短、开发者工具占用空间或内容超过模式上限时，页面仍可完整到达。Feature 页面根不得以 `overflow: hidden/clip` 或 `overflow-y: hidden/clip` 破坏该兜底。普通详情页由 `DetailPageTemplate` 的 `page` 模式和 `AppPage` 独占纵向滚动；只有固定高度表格/标签页工作区使用显式 `contained` 详情变体。工作区默认在 `contained` 模式内管理局部滚动；普通长内容可使用 `page` 模式由 `AppPage` 独占纵向滚动。超长树形工作区使用 `capped-page` 模式，默认最多展开到两个内容区高度，主从面板在页面滚动时保持可见，超过上限的数据由树或数据面板内部滚动。

间距遵循 4px 网格，并统一采用高密度桌面运营档位：13px 正文、28px 常规控件、34px 表头、36px 数据行、12px 页面/卡片内边距、8px 区段和表单间距；App Shell 顶栏为 48px，展开/折叠侧栏为 200px/56px。24px 是紧凑次级操作的最小点击高度，12px 是辅助文字下限；密度调整不得删除焦点、完整值提示或其他可访问状态。列表页通常由页头、一个查询面和一个结果面构成；普通 `ListPage` 的结果面随当前页行数自然增高，页大小变化后由 `AppPage` 作为唯一纵向滚动 Owner。表格只在结果面内承担横向滚动；只有 Workspace、Drawer 或 Page Contract 明确的固定数据面板可以拥有内部纵向滚动，不能为了填满视口而把普通列表或同级长表单锁成固定高度。标准视口唯一由 `standards/registry.json` 定义：`1366×768`、`1440×900`、`1920×1080`。项目当前只承诺桌面端，不把压缩后的桌面布局误称为移动端支持。

## Elevation & Depth

层级优先由背景色、边框和留白表达。普通内容面只允许小阴影；卡片阴影用于从页面背景中轻微分离，不制造漂浮卡片墙。浮层、菜单和对话框使用统一 floating shadow；焦点和当前路径使用明确的 ring。静态表格单元、嵌套内容块和装饰容器不得自行增加阴影。

## Shapes

4px 用于紧凑小元素，6px 是控件和普通内容面的默认圆角，8px 用于较大的容器和浮层。后台页面禁止胶囊化所有按钮，也禁止大圆角卡片。状态标签可以使用更强的形状区分，但仍需文字说明；车牌等业务对象允许有经过登记的专用视觉变体。

## Components

### Foundational visual states

所有可交互控件必须具备 default、hover、focus-visible、active、disabled 和 busy 状态；适用时再提供 selected、read-only、success、warning、error、empty 与 no-results。加载使用项目已有的稳定占位加载组件或 Element Plus loading，并保持结果区域几何不跳动。Skeleton 不是默认方案，只有 Page Contract 明确选择时使用。

全局滚动条由 `src/shared/styles/scrollbars.scss` 统一着色和兼容，新增滚动区域不需要 opt-in 类。仅当几何或语义不同才允许局部变体。

### Buttons and actions

按钮按“强调级别 × 语义意图”组合：一个决策区域只保留一个安全主按钮，普通次要动作使用默认/文字形态，危险动作与安全主操作分离，并只在最终确认时使用高强调 danger。忙碌态不改变按钮宽高，图标按钮必须有中文可访问名称。

### Navigation and data display

`AppLayout` 是认证后页面的唯一生产装配，`AppShell` 是唯一壳层视觉与交互结构；认证前页面只使用 `StandaloneAuthLayout + AuthPageTemplate`。生产页面标题固定在面包屑最后一级，页面级通用动作固定在同栏右侧；无壳层 Preview 的 `PageHeader` 继续自持标题、描述与动作。列表、详情、表单、工作台、向导、仪表盘和认证页只使用 Registry 登记的 Page Template。表格优先保留列比较关系；狭窄桌面视口使用可见横向滚动或明确的详情入口，不静默隐藏关键字段。

表格普通文本统一由 `DataTable + TableCellText` 呈现：默认最多展示 20 个 Unicode 字素并以可聚焦 tooltip 暴露完整值；实际列宽不足时同样不能丢失完整值。表格行操作统一使用 `src/shared/components/RowActionGrid.vue`：每行最多并列三个动作，更多动作按原顺序向下扩展；纵向间距固定为紧凑间距 Token，避免单条数据过高。页面不得把常用行操作压入仅为规避列宽问题而创建的“更多”浮层。

需要更紧凑的用户成员表采用 `density="compact"`：三列规则不变，额外行间距为零、列间距使用 `--spacing-1`，文字按钮最小高度使用 `--spacing-6`，不缩小文字字号。

### Forms and overlays

表单、选择器、日期控件、Drawer、Dialog 与确认交互使用 Element Plus 及项目共享封装。打开态几何、中文 locale、键盘、焦点恢复、错误保留和重复提交防护属于验收范围。Toast 只通过 `src/shared/services/notification.ts` 发出；需要修正的数据错误必须留在表单或页面内，不能只显示短暂消息。

### Iconography

统一使用 Iconify Outline 图标，常用图标保持约 1.75px 的视觉笔画和 16–20px 的常规尺寸。业务动作优先保留文字标签；只有行业内足够明确且具备可访问名称/提示时才使用纯图标按钮。

### File upload

图片与文件上传复用 `FileUploader → ImageUploader → ImageAssetField`，保持既有 Element Plus 控件和 Token 密度。进度、校验、重试显示在字段内部；技术文件 ID 与兼容旧地址为次级信息，不替代业务字段标签。详细交互见 `UX-CONTRACT.md` 的 File upload。

### Motion

动效只说明状态、层级或空间关系。常规反馈约 150–250ms，浮层开合遵循 Element Plus 的统一行为；不得为每个卡片添加入场动画。`prefers-reduced-motion: reduce` 下移除位移和非必要动画，加载状态仍需可感知。

### Content and data visualization

文案直接、克制、以业务对象和真实动词命名动作；避免“确定”“完成”等含义不清的按钮。日期、时间、金额、距离和数量由共享格式化能力处理，时区/币种等业务含义必须来自 PRD 或 API 契约。图表颜色不单独传达结论，关键数值和异常必须有文本等价物。

## Do's and Don'ts

- **Do:** 先复用运行时 Token、App Shell、Page Template 和共享组件，再为真实业务差异建立命名变体。
- **Do:** 在三个标准桌面视口和实际中文回退字体下验证长文本、表格滚动、浮层打开态与关键状态。
- **Don't:** 在 Feature 页面内定义颜色、字号、间距、圆角、阴影或另一套组件视觉。
- **Don't:** 用装饰性卡片、渐变、超大标题或动效掩盖缺失的业务层级、错误恢复和权限状态。
