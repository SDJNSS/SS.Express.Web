# IAM 框架上下文接口

2026-09-29 按后端 `Doc/Engineering/iam-deprecated-api-route-mapping.md` 迁移。

## 统一约束

Host/服务前缀仍由统一配置管理。以下接口均 POST，经统一拦截器携带 Authorization、X-Request-ID，解包成功信封 data。所有版本值均为 VersionToken 字符串，不做数字转换。CurrentPermissionResource 三个接口属于会话自服务，不加入业务 Permission。

2026-10-16：上述导航与页面资源接口均以当前 Tenant 授权为准；无有效当前 Tenant 时不发起请求。集团信息、Tenant 管理和系统资源目录也使用同一页面守卫，不因 SA、共享数据或旧 `global` 元信息豁免授权。不合并其他 Tenant 的 SA 角色资源。SA 专属后端操作仍需 SA 身份 + 对应 Function。

Tenant/Query 是目录查询，经 Function 授权后可以返回非本人所属租户；其 Update/ChangeStatus 的目标 `id` 原样提交，允许不同于当前 Tenant。目录结果不得充当切换候选，候选仍只取登录/切换响应的 `available_tenants`。

## 顶部 App 与导航

- `/iam-admin/CurrentPermissionResource/CurrentApps`，请求 `{}`，响应 `{ apps, authorization_version }`。App 为 id/app_code/app_name/icon/route_prefix；顶部显示 app_name，不补静态授权。
- `/iam-admin/CurrentPermissionResource/CurrentAppMenus`，请求 `{ app_id }`。
- 响应 `{ app, modules: [{ resource: Module资源, menus: Menu资源[] }], authorization_version }`。读取 module.resource，按 sort_order/id 排序；Module 不因自身 is_visible=false 而丢弃可见菜单。
- 仅导航 Menu；不从导航推断按钮权限。继续过滤不安全路由、退役入口和生产占位页。

## 页面与按钮权限

- `/iam-admin/CurrentPermissionResource/CurrentPageResources`，请求 `{ page_resource_code }`，编码来自正式路由注册，不再发送 menu_id。
- 响应 `{ page_resource_code, can_access, button_resource_codes, button_page_resource_codes, read_function_resource_codes, authorization_version }`。
- 所有已登记受保护页面进入前校验 can_access；按钮使用返回的精确前端资源集合，不从父节点、后端 Function、SA 身份或登录缓存推导写权限。
- Menu 与 ButtonPage 独立校验，不复用旧 Menu Function 缓存。无需先取得菜单 ID；导航链仍为 CurrentApps → CurrentAppMenus，本人资料可并行。
- 响应编码不匹配/结构错误/服务失败进入权限服务异常页；明确无权限进入 403，Dashboard 无权限回 Welcome。Welcome 保留会话可访问规则。
- 缓存按 token、session/version、Tenant、页面编码隔离，短 TTL；权限刷新清空缓存，旧响应不得覆盖新上下文。
- 旧 UI 判断常量通过 `src/shared/services/pageResourceAliases.ts` 显式投影到本页精确 V2 资源；不请求 V1、不读取登录权限补权、不按前缀猜编码。培训成员新增/单个退出/批量退出/重入已分为独立资源。
- 这个运行时适配不代表维护 rollout、通信证据或线上授权已全部验收。

## 权限管理页 App 候选

- `/iam-admin/PermissionApp/Query`，请求支持 id/app_code/managed_key/include_deleted。
- 返回 `{ apps, snapshot_version, scope_complete, scope }`，不是旧直接数组。API 层解出 apps；不完整范围或非法结构作为错误。
- Function 为 `IAM.PERMISSION_APP.QUERY`，后端已改为 business/read/composable=true。现有业务包需维护方引用新 Function；前端接口替换不自动写库。

## 本人资料与品牌配置

`/iam-admin/Auth/CurrentProfile` 无请求体。返回本人及当前 Tenant、组织、岗位显示信息和 avatar_url/avatar_file_id；直接使用 IAM 图片 URL。失败保留登录账号，旧会话慢响应丢弃。不得为显示头像补授 Membership/QueryUsers。

生产框架已预接可选 `data.branding: { brand_name, platform_name, logo_url }`；后端尚待按 [品牌配置契约](../coordination/platform-shell-branding-backend-contract.md) 增量返回。字段缺失分别使用默认品牌、平台名及本地图标，不增加任何网络请求或业务权限。

## Owner

- DTO/API：src/features/iam/shell-context/{types,api}
- 导航：src/features/iam/shell-context/adapters/shellContextAdapter.ts
- 页面守卫/缓存：src/app/router/index.ts、src/features/iam/shell-context/services/currentPageResourceAccess.ts
- Shell：src/app/composables/useAppShellContext.ts；状态：src/app/store/session.ts

## 本轮验证与交接（2026-09-29）

- 已通过代码 Lint、应用/测试 TypeCheck、生产 Build；构建仍有既有大分包提示。
- 框架、新权限页、接口迁移与缓存隔离：三视口 126 项通过；基础页、成员查询、角色分配抽屉及资源标记另 34 项通过；培训生产页 13 项通过。
- 浏览器用项目 Playwright 和契约模拟响应验证（Browser plugin / ego-browser CLI 不可用）；已查看三视口截图。未使用真实账号验收业务授权、未更新任何视觉基线。
- 全量 `pnpm quality` 未通过：在 `iam:maintenance:check` 因 `Changed/incomplete communication chain dependencies: foundation.group.load` 阻断。单跑治理测试 90/91 通过，唯一失败为同一过期通信证据。不是将旧审查 hash 刷新后即可放行。
- 系统资源维护方需重新核对受共享守卫/API 变更影响的通信链，更新 Permission 模板对 `IAM.PERMISSION_APP.QUERY` 的引用及运行时迁移证据，再生成维护清单；此前清单不可直接同步。本轮仅导入权威 Function 定义快照、更新前端声明，没有初始化数据库或分配授权。
