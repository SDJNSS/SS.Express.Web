# 平台框架权限规则

1. 顶部只展示 `CurrentApps` 返回的 App，并使用响应中的 `app_name` 作为显示名称；`app_code` 只作为内部标识和路由匹配依据。静态 `subsystems.ts` 只提供已知 App 的路由首页与本地图标回退，不能覆盖名称或授予权限。
2. 左侧模块与菜单只展示当前 App 的 `CurrentAppMenus(app_id)` 返回结果；前端先按 `sort_order` 排序并过滤不可见、当前无效或路由不安全的 Menu，再在生产环境过滤本地 `meta.implementationStatus = 'placeholder'` 的未实现入口，不补回静态导航。后者只是实现可用性过滤，不授予或撤销权限，直接地址仍显示“功能开发中”。`is_visible` 只控制 Menu 是否进入菜单栏，不得作为路由或 Function 权限判断；Module 作为分组容器时不以自身 `is_visible` 过滤整棵子树，当前有效且含有可用、已实现 Menu 才展示。若原有可见 Menu 全部因占位状态被过滤，不得退化为 Module 路由前缀链接。
3. App 切换后必须按目标 `app_id` 重新加载模块与菜单；缓存仅限当前登录会话。
4. `CurrentAppMenus` 只生成 `App → Module → Menu` 导航，不返回 Page 或 Function。隐藏 Page 由前端静态路由登记，不进入左侧导航；每个隐藏 Page 必须显式归属唯一 Menu。
5. 隐藏 Page 的所有可发现入口（例如列表、详情、编辑抽屉）与路由访问必须使用同一个稳定 `:view` Function `permission_code`。资源目录中的 Page `permission_code` 只表达目录层级，不是前端按钮编号，也不作为运行时入口或路由授权依据。
6. `CurrentFunctions` 必须在 `CurrentAppMenus` 之后，以当前路由或隐藏 Page 所属 Menu 的真实 `menu_id` 调用；它返回该 Menu 范围内的有效 Function 权限。无法解析所属 Menu 时默认拒绝，不得猜测或发送 `menu_id=0`。
7. 按钮只使用其实际能力或 API 对应 Function 的 `permission_code`：查看/进入隐藏 Page 使用 `:view`，保存使用 `:update`，其他写操作使用各自专用 Function。进入其他 Menu 时先清空旧 Function 权限，权限尚未加载或接口失败时默认隐藏。
8. 同一 Menu 下的 Menu/隐藏 Page 可复用 `menu_id` 级缓存；切换 App、权限目录变更或显式重试时必须失效相关缓存。
9. App、菜单或功能权限加载失败时不回退到静态授权数据。App/菜单失败必须显示持久错误和重新加载入口；Function 失败保留已授权导航并隐藏受控操作。
10. `src/features/reference/**` 只提供开发期标准实现；生产 Router 与权限动态页面模块映射均不得注册 Reference 页面，服务端资源目录也不得把 `/reference/*` 作为业务导航下发。
