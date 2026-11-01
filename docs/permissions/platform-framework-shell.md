# 平台框架权限规则

当前接口契约见 docs/api/iam-shell-context.md（2026-09-29）。

2026-10-16 补充：所有入口均使用当前 Tenant 的角色 → 权限包 → Permission → Resource，不合并其他 Tenant 的 SA 授权。集团信息、Tenant 管理及系统资源目录同样执行页面权限校验；SA 身份不自动补权，原 SA 专属接口仍要求 SA + Function。Tenant 目录的目标条目 ID 可以不同于当前 Tenant，但目录查询结果不授予切换资格。

1. 顶部只展示 CurrentPermissionResource/CurrentApps 返回 App，名称使用 app_name。
2. 左侧使用 CurrentAppMenus(app_id) 的 modules[].resource + menus，遵循服务端排序。Module 不因自身不可见而丢弃可见菜单。
3. is_visible 仅控制导航。生产占位页、Reference、退役页不进入业务导航。
4. Menu/ButtonPage 路由独立调用 CurrentPageResources(page_resource_code)，不再调用旧 CurrentFunctions，不依赖菜单 ID。
5. can_access 控制页面；精确 Button/ButtonPage 编码控制操作。父级、API Function、SA 身份、本地登录缓存不能补授按钮权限。
6. 旧 UI 谓词仅允许本页限定的显式资源适配；不做 V1/V2 OR 补权。维护登记阶段不是运行时开关或线上生效证明。
7. 会话/Tenant/页面隔离；切页清空旧操作权限；失败默认拒绝；权限变更失效缓存；丢弃旧上下文慢响应。
8. 明确无权限展示 403（Dashboard 回 Welcome）；网络或响应错误展示可重试权限服务异常页。
9. 本人资料仍用 Auth/CurrentProfile 自服务，不能为框架授予用户管理 API。
10. 权限管理页 App 候选改为 PermissionApp/Query，业务 Function 为 IAM.PERMISSION_APP.QUERY。包关联由维护方处理，本轮不写库。
