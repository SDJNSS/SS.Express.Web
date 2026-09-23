# IAM 框架上下文接口

## 通用约束

- Host 由 `src/shared/api/apiConfig.ts` 和环境变量统一提供，Feature 只能声明相对路径。
- IAM 基础路径固定由 `src/shared/api/backendServices.ts` 的 `/iam-admin` 管理。
- 四个接口均使用 `POST`；`CurrentAppMenus` 按服务端契约使用 `Content-Type: application/json`，其余接口使用 `Accept: text/plain`、`Content-Type: application/json-patch+json`。
- 四个接口均为受保护接口，由统一 HTTP 拦截器写入 `Authorization: Bearer <token>` 与 `X-Request-ID`。
- 成功业务数据位于平台统一响应信封的 `data` 字段；401 统一清理会话并返回登录页。
- App、Module、Menu、Page、Function 与用户数据中的并发 `version` 是 `VersionToken` 字符串，只能直接保存和传递，禁止任何数值转换。

## 当前用户可访问应用

- 路径：`/iam-admin/Permission/CurrentApps`
- 请求：`{}`
- 响应数据：`{ apps: IamApplication[] }`
- 用途：顶部 App 切换的唯一权限来源。展示文本必须使用接口返回的 `app_name`；`app_code` 只用于内部标识、权限作用域和路由匹配。客户端不得使用静态子系统名称覆盖 `app_name`，也不得补出未授权 App。

## 当前应用的模块与菜单

- 路径：`/iam-admin/Permission/CurrentAppMenus`
- 请求：`{ app_id: number }`
- 响应数据：`{ app: IamApplication, modules: IamCurrentAppModuleMenusResponse[] }`。Module 只包含自身资源字段与 `menus`；Menu 只包含自身资源字段。接口不返回 Page 或 Function。
- 用途：当前 Tenant 下指定 App 的可访问 `App → Module → Menu` 导航树。前端按 `sort_order` 排序，并过滤不可见、当前无效或路由不安全的 Menu，不补出静态导航。`is_visible=false` 的 Menu 不进入菜单栏；Module 作为分组容器时不以自身 `is_visible` 过滤整棵子树，只要当前有效且包含可用 Menu，仍需展示该分组。
- Menu 的 `permission_code` 用于其导航路由。隐藏 Page 由前端静态路由登记，并显式归属唯一 Menu；其入口和路由门禁使用该 Menu 的 `CurrentFunctions(menu_id)` 返回的 `:view` Function，而不是 Page `permission_code`。

## 当前 Menu 的 Function 权限

- 路径：`/iam-admin/Permission/CurrentFunctions`
- 请求：`{ menu_id: number }`；`menu_id` 必须来自已成功返回的 `CurrentAppMenus(app_id)`，禁止在 Menu 未解析前请求，也禁止发送 `0` 或空对象。
- 响应数据：`{ menu: IamPermissionResource, functions: IamPermissionResource[], permission_codes: string[] }`。
- 用途：提供当前 Menu 范围（包括资源目录中隐藏 Page 后代）内的有效 Function 权限。`:view` Function 同时控制隐藏 Page 的入口、路由和查询能力；`:update` 或其他专用 Function 控制写操作。Function 不动态注册路由。
- 初始化顺序固定为 `CurrentApps → CurrentAppMenus(app_id) → 解析当前路由所属 Menu → CurrentFunctions(menu_id)`；`QueryUsers` 可与这条权限链并行。
- 同一 Menu 下的 Menu/Page 路由共享按 `menu_id` 缓存的 Function 权限；切换到其他 Menu 时必须加载目标 Menu 的权限并清空旧权限，防止跨 Menu 泄漏。
- 权限结果加载失败时，前端默认隐藏受控操作并拒绝进入隐藏 Page，但继续保留已由 `CurrentAppMenus` 确认的 Menu 导航；不得使用本地静态列表补权。

## 查询当前用户资料

- 路径：`/iam-admin/Membership/QueryUsers`
- 请求：`{ page_index: 1, page_size: 20, keyword: <登录账号> }`
- 响应数据：`{ total, page_index, page_size, items }`
- 用途：侧栏底部用户头像、姓名、岗位与组织上下文。
- 示例中的 `id: 0` 只是 Swagger 占位值，生产请求不得发送；否则后端会按 ID 0 过滤。
- 查询返回后必须按 `user.user_name` 与登录账号做不区分大小写的精确匹配，禁止直接采用第一条模糊搜索结果。

## 前端归属

- 类型：`src/features/iam/shell-context/types/shellContext.ts`
- Endpoint 与调用：`src/features/iam/shell-context/api/shellContextApi.ts`
- DTO 到 AppShell 映射：`src/features/iam/shell-context/adapters/shellContextAdapter.ts`
- 生产编排：`src/app/composables/useAppShellContext.ts`
