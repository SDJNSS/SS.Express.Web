# IAM 权限治理页面权限约束

> 来源：`docs/prd/iam/role-resource-data-permission.md` 与 `docs/api/iam-access-control-api.md`，2026-09-14 核对。应用与权限资源页面使用独立的 `iam-application-resources.md`。

- `CurrentAppMenus(app_id)` 只返回 `App → Module → Menu`，用于左侧导航和所属 Menu 解析，不返回 Page/Function。Menu 页面以 Menu 的查看权限进入；隐藏 Page 由前端静态路由登记，其入口和路由访问均以所属 Menu 的 `CurrentFunctions(menu_id)` 返回的稳定 `:view` Function 为准。
- 所有写操作仍由服务端鉴权。前端的隐藏、禁用和只读状态只用于用户体验，不构成安全边界。
- 系统、资源、角色和分配关系的写入口以响应字段 `can_maintain` 为准。
- 系统角色、集团控制角色、停用角色及当前无效资源按服务端状态只读。
- `GROUP`、`CUSTOM` 数据范围和 Tenant 管理员身份属于高风险能力；是否允许提交由服务端最终裁决。
- 401 进入统一重新认证流程；403 保留页面上下文并展示无权提示；版本冲突不得覆盖服务端新版本。
- 角色功能权限、角色数据权限、角色成员和删除均采用悲观提交，只有服务端成功后才能显示完成并刷新权威结果。
- `/iam/roles` 是唯一角色管理 Menu；角色功能权限、数据权限和角色分配是资源目录中归属于该 Menu 的隐藏 Page，但它们不会由 `CurrentAppMenus` 下发或动态注册。
- 角色功能权限页是角色管理专用编辑页：角色列表、角色详情和角色编辑抽屉中的“功能权限”入口，以及 `/iam/roles/function-permissions` 路由，统一使用 `iam:roles:function-permissions:view`；不得使用 Page 编码 `iam:roles:function-permissions` 做运行时门禁。
- 角色功能权限查询与保存均消费统一 `IamFunctionPermissionTreeResponse`，以 `subject.version` 回传 `role_version`；查看/查询使用 `iam:roles:function-permissions:view`，只有具备 `iam:roles:function-permissions:update` 时才允许提交完整 `direct_resource_ids`。
- 角色功能权限采用精确授权：编辑勾选只从 `direct_resource_ids` 初始化，`effective_resource_ids` 不得反写，`is_inherited` 不参与前端授权判断。父节点复选框仅是前端批量选择当前可维护子孙的快捷操作，最终仍逐项提交每个实际勾选 ID。
- `is_navigation_only` 只是未授权祖先的路径状态，不能据此推断后代权限；已选 Menu/Page 没有任何已选 Function 时应提示接口仍可能返回 403。
- 按钮只使用其实际能力或调用 API 对应 Function 的 `permission_code`；纯前端交互不创建 Function，Page `permission_code` 也不是按钮编号。前端门禁只改善可发现性，服务端仍执行最终授权。
- `/iam/members` 是唯一用户管理 Menu。“用户角色与权限页”以全局 `user_id` 和选定 `tenant_id` 作为页面上下文：角色页签通过 `QueryUserTenants(user_id)` 内部解析成员关系和版本，允许具备 Function 权限的管理员调用 `MemberRole/Assign`、`MemberRole/Revoke`；Function 页签使用解析出的 `tenant_user_id` 调用 `/Permission/QueryMemberFunctionPermissions`，并保持只读。禁止用户 Function 直授权、Function 保存或数据权限编辑入口。
- 成员功能权限树使用 `effective_resource_ids` 表示所选 Tenant 成员的有效权限；顶层 `roles` 与节点 `source_roles` 用于解释当前 Tenant 内的权限来源。
- `/Permission/QueryUserFunctionPermissions` 是按全局 `user_id` 跨 Tenant 聚合的 SA 专用接口，不得用于普通管理员可进入的用户角色与权限页。
- “用户角色与权限页”使用所属用户与成员 Menu 下的独立 Page 与 Function 资源：查看、Tenant 关系查询、角色候选和 Function 结果查询归入 `iam:members:permissions:view`；角色分配与撤销必须登记为该 Page 下调用实际 API 的独立 Function，并分别门禁。不得依赖角色管理 Menu 当前是否被选中，也不得以本地账号名推断能力。
