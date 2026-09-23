# 物流平台框架页 PRD

## 1. 来源与目标

本 PRD 由用户在 2026-09-04 提交并确认，并在 2026-09-05 补充生产接口。目标是为 SS.Express.Web 建立可复用的物流平台统一框架，覆盖 IAM、TMS、VMS 等子系统。TMS 运输任务仍只作为 Preview 内容样例；生产框架由唯一 `AppLayout` 装配并承载所有认证后业务路由。

用户提供的效果图是视觉参考，只用于判断桌面端的信息层级、左侧分组导航、顶部上下文区和宽屏检索的布局关系。参考图中的 TMS3.0、UNIS 品牌、英文文案、业务字段、权限和系统行为不属于本项目需求。

## 2. 使用者与任务

- 使用者：物流运营、运输调度、车务及平台管理人员。
- 当前任务：在统一平台壳层中切换 IAM、TMS、VMS 等子系统；本候选以 TMS 列表页验证壳层承载能力。
- 当前阶段：视觉方案已批准；资源目录维护 `App → Module → Menu → Page → Function`，框架运行时导航与操作权限分开装配。

## 3. 本次范围

- 复用项目 Design Token、共享 AppShell、AppPage、PageHeader 和 ListPageTemplate。
- 桌面端采用深海军蓝侧栏、浅色内容工作面，并提供平台子系统切换入口。
- 左侧导航提供一个可展开/收起的“调度中心”分组，使用路线分支线作为运输场景的克制视觉特征。
- 顶部 App 由 IAM `CurrentApps` 返回值驱动，名称使用响应中的 `app_name`；`app_code` 仅用于内部标识和路由匹配。禁止静态名称覆盖或展示接口未返回的 App。
- 默认选中与当前路由匹配的 App；无法匹配时选择接口返回的第一个 App。
- 左侧导航通过 IAM `CurrentAppMenus(app_id)` 获取当前 Tenant 下指定 App 的 `App → Module → Menu`，按服务端 `sort_order` 渲染 `Module → Menu` 两级导航；该接口不返回 Page 或 Function。
- 仍由 `FeatureScaffoldPage` 承载的入口必须声明 `meta.implementationStatus = 'placeholder'`。生产环境从左侧导航、App 默认入口和 Overview 卡片隐藏这些入口；直接访问保留并显示“功能开发中”，开发环境可继续通过 Reference 示例辅助实现。
- 隐藏 Page 使用前端静态路由并显式归属唯一 Menu；当前路由所属 Menu 从 `CurrentAppMenus` 返回树和本地归属声明中解析。解析成功后再调用 `CurrentFunctions(menu_id)` 加载该 Menu 范围内的 Function 权限。同一 Menu 内复用缓存，跨 Menu 切换时清除旧操作权限。
- 侧栏用户区通过 IAM `QueryUsers` 加载当前登录账号的头像和名称，并从认证会话读取当前 Tenant 名称；组织或岗位不得冒充会话 Tenant。
- 侧栏收起按钮固定在侧栏右侧中部，展开态显示左箭头，收起态显示右箭头，并保持 44×44px 点击区域。
- 顶部子系统入口之间使用半透明分割线，保持切换关系清晰但不过度强调。
- 用户头像、名称和下拉菜单从顶部工具区移至侧栏底部；展开态左侧显示头像、右侧上下显示用户名和当前 Tenant 名称，折叠侧栏仅保留头像入口。
- 生产页面由面包屑最后一级展示唯一可见页面标题，页面级通用动作位于同栏右侧；`PageHeader` 在无壳层 Preview 中继续展示标题、说明和动作。页面内容仍按 PageHeader → SearchPanel → TableToolbar → DataTable → Pagination 的代码结构组织，但生产内容区不重复绘制页头副本。
- 所有 `AppPage` 保留短视口纵向滚动兜底；浏览器高度动态缩短或内容超过 Pattern 上限时自动出现滚动条，页面根不得通过裁剪隐藏可达内容。
- 通过静态 Fixture 验证 ready、loading、empty 和 retryable-error 四种状态。
- Preview 继续保持静态、隔离；生产装配负责真实 API、会话、权限和路由。
- 固定验证 1366×768、1440×900、1920×1080 三个桌面视口。

## 4. 不在本次范围

- 不定义运输任务样例内容的真实字段、状态机、时区、接口、权限或数据生命周期。
- 不根据 Menu/Page 权限推断按钮或 API 操作权限；隐藏 Page 的入口和路由使用所属 Menu 下稳定的 `:view` Function，写操作使用 `:update` 或专用 Function。Page `permission_code` 不作为按钮编号；`CurrentFunctions(menu_id)` 加载失败时默认隐藏相关入口和操作。
- 不写入仅服务 Legacy v0 的 `UIDesign/approved-prototypes.json`。
- `/reference/*` 只在开发环境注册，Reference 源码继续保留供复用，不作为生产权限资源。
- 人工批准记录与三视口基线由 Approval Store 保存；生产框架以 `AppLayout` 作为唯一 Owner。
- 不实现移动端、暗色主题或参考图中的第三方品牌视觉。

## 5. 候选交互

- 展开/收起“调度中心”导航分组，状态和 `aria-expanded` 同步。
- 收起/展开整个侧栏，图标保留可访问名称。
- 打开侧栏底部用户菜单，菜单继续提供个人设置、切换组织和退出登录入口。
- 提交列表筛选后仅过滤本地 Fixture；重置后恢复默认结果。
- 刷新与失败重试只恢复本地 ready 状态，不产生网络请求。
- 子系统、Tenant 上下文、通知与用户菜单入口在 Preview 中提供可观察反馈，但不执行真实跳转或账户操作。

## 6. 候选验收

- 已批准入口显示完整平台壳层和 TMS 列表样例，明确属于平台级框架设计。
- 页面复用共享 AppShell 与 ListPageTemplate，不复制生产路由绑定。
- 三个标准桌面视口无页面级横向溢出，侧栏、顶栏、列表和页脚均可见。
- ready、loading、empty、retryable-error 状态可通过 `scenario` 查询参数复现。
- 所有可点击控件具备真实的本地预览动作、键盘语义和中文可访问名称。
- 侧栏中部折叠按钮、子系统分割线和侧栏底部“头像 + 用户名 + 当前 Tenant”账户区在三个桌面视口均不遮挡导航或内容。
- 生产壳层以面包屑最后一级作为唯一页面 `h1`，PageHeader 动作位于面包屑右侧；无壳层 Preview 仍可独立评审完整 PageHeader。
- 浏览器高度低于标准视口（包括打开开发者工具）时，`AppPage` 自动提供纵向滚动且全部页面内容仍可到达。
- 浏览器控制台无 error/warning，Preview 不发起外部或业务 API 请求。

## 7. 生产验收

- 所有框架接口通过统一 IAM 基础路径和 HTTP 客户端调用，并自动携带 Bearer Token。
- 登录后并行加载授权 App 和用户资料；选定 App 后先通过 `CurrentAppMenus(app_id)` 加载资源树，再按当前路由所属 `menu_id` 加载 Function 权限。
- 切换 App 时按目标 `app_id` 加载模块与菜单；App 或菜单为空、失败时不泄露静态权限数据。
- 切换 Menu 或进入其隐藏 Page 时，请求体必须为 `{ menu_id }`；不得在 `CurrentAppMenus` 返回并解析所属 Menu 前调用 `CurrentFunctions`，同一 Menu 的隐藏 Page 可复用该 Menu 权限缓存。
- 权限失败状态在侧栏持续可见并提供重新加载；用户资料失败时保留登录账号作为安全降级。
- 即使 `CurrentAppMenus` 返回占位路由，生产导航与 App 首入口也不得暴露；若 Module 的可见 Menu 全部未实现，不得把 Module 路由前缀作为降级入口。
- 生产构建访问 `/reference/*` 必须进入 404；直接访问占位路由必须显示“功能开发中”且不得出现 Reference 悬空链接。
- 三个标准桌面视口内，所有生产业务页仍由同一个 `AppShell` 的内容容器承载；动态压缩高度时由 `AppPage` 接管纵向兜底滚动，`app-shell__content` 不形成竞争滚动。
