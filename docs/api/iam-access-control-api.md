# IAM 权限治理 API（受控接口摘要）

> 权威来源：用户提供的 `iam-api-documentation.md` 最新版本，2026-09-14 核对。本文收录角色管理、功能权限、数据权限、角色分配及其只读资源依赖；新的应用与权限资源管理页使用独立的 `iam-application-resources-api.md`。字段冲突时后端契约优先。

## 通用约定

- Host 由环境配置统一管理，IAM 基础路径为 `/iam-admin`。
- 请求方式均为 `POST`，`Content-Type: application/json-patch+json`。
- 统一 HTTP 客户端自动写入 `Authorization: Bearer <token>` 与 `X-Request-ID`。
- 成功响应由统一客户端解包 `SuccessResponse.data`；401、403、冲突和服务错误由统一错误模型处理。
- 所有 `version` / `role_version` / `member_version` 都是 `VersionToken` 字符串，必须逐字符原样回传，不得转为 `number` 或由前端推算。

## 系统与权限资源

| 操作     | 路径                                         | 请求 DTO                                                                                                                                                                                                                   | 响应 DTO                       |
| -------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| 查询系统 | `/AuthorizationCatalog/QuerySystems`         | `id`, `keyword`                                                                                                                                                                                                            | `IamSystemResponse[]`          |
| 创建系统 | `/AuthorizationCatalog/CreateSystem`         | `app_name`, `description`, `icon`, `route_prefix`, `status`, `remarks`；`app_code` 由服务端生成                                                                                                                            | `IamSystemResponse`            |
| 编辑系统 | `/AuthorizationCatalog/UpdateSystem`         | `id`, `version`, `app_name`, `description`, `icon`, `route_prefix`, `remarks`；`app_code` 不可修改                                                                                                                         | `IamSystemResponse`            |
| 启停系统 | `/AuthorizationCatalog/ChangeSystemStatus`   | `id`, `version`, `target_status`                                                                                                                                                                                           | `IamActionResponse`            |
| 删除系统 | `/AuthorizationCatalog/DeleteSystem`         | `id`, `version`, `confirm_delete_descendants`                                                                                                                                                                              | `IamCatalogDeleteResponse`     |
| 查询资源 | `/AuthorizationCatalog/QueryResources`       | `app_id`, `resource_id`                                                                                                                                                                                                    | `IamResourceCatalogResponse[]` |
| 创建资源 | `/AuthorizationCatalog/CreateResource`       | `app_id`, `parent_id`, `resource_name`, `resource_type`, `route_path`, `component`, `permission_code`, `icon`, `http_method`, `api_path`, `is_visible`, `sort_order`, `status`, `remarks`；`resource_code` 由服务端生成    | `IamResourceCatalogResponse`   |
| 编辑资源 | `/AuthorizationCatalog/UpdateResource`       | `id`, `version`, `app_id`, `parent_id`, `resource_name`, `resource_type`, `route_path`, `component`, `permission_code`, `icon`, `http_method`, `api_path`, `is_visible`, `sort_order`, `remarks`；`resource_code` 不可修改 | `IamResourceCatalogResponse`   |
| 启停资源 | `/AuthorizationCatalog/ChangeResourceStatus` | `id`, `version`, `target_status`                                                                                                                                                                                           | `IamActionResponse`            |
| 删除资源 | `/AuthorizationCatalog/DeleteResource`       | `id`, `version`, `confirm_delete_descendants`                                                                                                                                                                              | `IamCatalogDeleteResponse`     |

`IamSystemResponse` 完整字段：`id`, `app_code`, `app_name`, `description`, `icon`, `route_prefix`, `status`, `remarks`, `can_maintain`, `version`, `created_at`, `created_by`, `updated_at`, `updated_by`。

`IamResourceCatalogResponse` 完整字段：`id`, `app_id`, `parent_id`, `resource_code`, `resource_name`, `resource_type`, `route_path`, `component`, `permission_code`, `icon`, `http_method`, `api_path`, `is_visible`, `sort_order`, `status`, `remarks`, `is_currently_effective`, `invalid_reason`, `can_maintain`, `version`, `created_at`, `created_by`, `updated_at`, `updated_by`, `children`。

`IamCatalogDeleteResponse` 完整字段：`id`, `succeeded`, `idempotent`, `deleted_resource_count`, `revoked_role_grant_count`, `version`, `deleted_at`。接口没有删除前影响查询；前端提交前只展示当前已加载树可确定的结构范围，提交成功后展示服务端返回的删除与撤销数量。

## 角色管理

| 操作 | 路径                               | 请求字段                                                                                                 | 响应                         |
| ---- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 查询 | `/RolePermission/QueryRoles`       | `tenant_id`, `id`, `role_type`, `page_index`, `page_size`, `keyword`, `status`                           | 分页 `IamRoleDetailResponse` |
| 创建 | `/RolePermission/CreateRole`       | `tenant_id`, `role_name`, `description`, `remarks`, `sort_order`                                         | `IamRoleDetailResponse`      |
| 编辑 | `/RolePermission/UpdateRole`       | `id`, `version`, `tenant_id`, `role_type`, `status`, `role_name`, `description`, `remarks`, `sort_order` | `IamRoleDetailResponse`      |
| 启停 | `/RolePermission/ChangeRoleStatus` | `tenant_id`, `id`, `version`, `target_status`                                                            | `IamActionResponse`          |

`IamRoleDetailResponse` 完整字段：`id`, `tenant_id`, `tenant_code`, `role_code`, `role_name`, `role_type`, `sort_order`, `status`, `description`, `remarks`, `is_currently_effective`, `is_group_controlled`, `can_maintain`, `version`, `created_at`, `updated_at`。

`role_code` 由服务端在创建成功后生成，编辑时不可变；前端只读展示响应值，CreateRole 与 UpdateRole 均不提交该字段。

## 功能权限

角色功能权限查询与保存使用相同的统一权限树响应：

| 操作 | 路径                                       | 请求字段                                         | 响应                                |
| ---- | ------------------------------------------ | ------------------------------------------------ | ----------------------------------- |
| 查询 | `/RolePermission/QueryFunctionPermissions` | `role_id`                                        | `IamFunctionPermissionTreeResponse` |
| 保存 | `/RolePermission/SaveFunctionPermissions`  | `role_id`, `role_version`, `direct_resource_ids` | `IamFunctionPermissionTreeResponse` |

`IamFunctionPermissionTreeResponse` 完整字段：

- `subject`：`subject_type`, `subject_id`, `tenant_id`, `subject_code`, `subject_name`, `is_currently_effective`, `invalid_reason`, `version`。
- `roles`：角色来源数组；元素为 `id`, `tenant_id`, `tenant_code`, `role_code`, `role_name`, `role_type`。
- `direct_resource_ids`：数据库中明确保存且目录中仍存在的完整精确授权资源 ID；是角色编辑页勾选状态的唯一来源。
- `effective_resource_ids`：`direct_resource_ids` 中当前有效的资源 ID；资源或其任一祖先停用时不在此集合中，不包含未明确授权的后代或仅导航祖先。
- `resource_tree`：`App → Module → Menu → Page / Function` 统一资源树；节点为 `resource`, `children`。

资源节点 `resource` 完整字段：`is_direct`, `is_inherited`, `is_navigation_only`, `source_roles`, `id`, `app_id`, `parent_id`, `resource_code`, `resource_name`, `resource_type`, `route_path`, `component`, `permission_code`, `icon`, `http_method`, `api_path`, `is_visible`, `sort_order`, `status`, `remarks`, `is_currently_effective`, `invalid_reason`, `can_maintain`, `version`, `created_at`, `created_by`, `updated_at`, `updated_by`。

`is_inherited` 在精确授权模式下固定为 `false`，仅为兼容保留，前端不得依赖；`is_navigation_only` 表示节点未获授权、仅为还原已授权后代的导航路径。角色页编辑时以 `subject.version` 作为最新 `role_version`，提交去重后的完整 `direct_resource_ids` 替换集合；不得继续读取旧响应中的顶层 `role_id`, `role_version` 或 `resources`，也不得要求后端展开父节点。

角色功能权限页对该完整树做前端本地搜索，不向查询接口增加 `keyword`。搜索覆盖 `resource_name`、`resource_code`、`permission_code`、`route_path`、`http_method`、`api_path`，采用不区分大小写的子串匹配并保留命中节点祖先。为保证普通有权管理员也可按接口路径定位资源，`QueryFunctionPermissions` 及 `SaveFunctionPermissions` 返回的每个资源节点必须稳定包含原始 `http_method`、`api_path`；无绑定时返回空字符串。

## 数据权限

- 查询域目录 `/RolePermission/QueryDataDomains`：请求 `app_id`, `domain_code`；响应 `domains`, `invalid_resources`。
- 查询角色配置 `/RolePermission/QueryDataPermissions`：请求 `role_id`；响应 `role_id`, `role_version`, `domains`。
- 保存 `/RolePermission/SaveDataPermission`：请求 `role_id`, `role_version`, `domain_code`, `scope_mode`, `clear`, `target_tenant_ids`。

域完整字段：`id`, `app_id`, `app_code`, `domain_code`, `domain_name`, `supported_scopes`, `self_definition`, `status`, `linked_resource_ids`, `is_configuration_valid`, `invalid_reason`。

异常资源完整字段：`resource_id`, `app_id`, `resource_code`, `resource_name`, `invalid_reason`。

角色域完整字段：`domain_code`, `domain_name`, `is_configured`, `scope_mode`, `target_tenant_ids`, `is_currently_effective`, `invalid_reason`, `version`。

## 角色分配

| 操作       | 路径                             | 请求字段                                                                                             | 响应                                   |
| ---------- | -------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 查询       | `/MemberRole/Query`              | `tenant_id`, `tenant_user_id` 或 `role_id`（二选一）, `page_index`, `page_size`, `keyword`, `status` | 分页 `IamRoleAssignmentDetailResponse` |
| 分配       | `/MemberRole/Assign`             | `tenant_user_id`, `member_version`, `role_ids`                                                       | `IamRoleAssignmentDetailResponse[]`    |
| 撤销       | `/MemberRole/Revoke`             | `tenant_user_id`, `member_version`, `role_ids`                                                       | `IamRoleAssignmentDetailResponse[]`    |
| 任命管理员 | `/MemberRole/AppointTenantAdmin` | `tenant_id`, `tenant_user_id`, `member_version`                                                      | `IamRoleAssignmentDetailResponse`      |
| 取消管理员 | `/MemberRole/CancelTenantAdmin`  | `tenant_id`, `tenant_user_id`, `member_version`                                                      | `IamRoleAssignmentDetailResponse`      |

分配明细完整字段：`assignment_id`, `tenant_id`, `tenant_user_id`, `tenant_user_code`, `display_name`, `role_id`, `role_code`, `role_name`, `role_type`, `is_tenant_admin_identity`, `is_group_controlled`, `is_assigned`, `is_currently_effective`, `can_maintain`, `invalid_reason`, `member_version`。

角色成员工作区固定以角色为主视角，请求只提交 `role_id`，不得同时提交 `tenant_user_id`。添加/移除成员分别调用 `Assign`/`Revoke`，两者都是角色关系级变更。当前接口未提供独立的角色成员关系启停操作；`Membership/ChangeMemberStatus` 会影响整个 Tenant 成员，禁止在角色成员页用于启停角色关系。

Tenant 选择器复用已受控的 `/Tenant/Query`；成员选择器调用
`/Membership/QueryUsers`，请求使用当前 Tenant 的单元素数组
`tenant_ids: [tenant_id]`，并消费统一用户成员响应。QueryUsers 契约见
`docs/api/iam-membership-query-users.md`。

用户角色与权限页以 `user_id + tenant_id` 为页面上下文，先调用 `Membership/QueryUserTenants` 解析目标 Tenant 的 `tenant_user_id` 和 `member_version`，再复用 `Query`、`Assign`、`Revoke`。路由不得把 `tenant_user_id` 作为新的长期业务主键。

## Tenant 成员功能权限只读查询

`POST /Permission/QueryMemberFunctionPermissions` 使用 `{ tenant_user_id }` 请求体，是“用户角色与权限页”Function 页签的唯一数据源。页面先根据 `user_id + tenant_id` 解析成员关系，不得将 `tenant_user_id` 持久到路由中作为全局用户 ID。

响应为 `IamFunctionPermissionTreeResponse`：

- `subject.subject_id` 是所选 Tenant 下的 `tenant_user_id`，`subject.tenant_id` 是当前 Tenant。
- `roles` 是该 Tenant 成员的有效角色。
- `effective_resource_ids` 是该 Tenant 成员的有效功能权限资源 ID 集合。
- 每个资源节点的 `source_roles` 标识权限来源角色。
- 接口只读，不提供用户直授权或 Function 保存能力。

“用户角色与权限页”作为“用户与成员”Menu 下的隐藏 Page 进入资源目录；Function 查询使用 `iam:members:permissions:view`，角色分配与撤销使用该 Page 下分别绑定 `MemberRole/Assign`、`MemberRole/Revoke` 的独立 Function。运行时仍以服务端 `CurrentFunctions(menu_id)` 返回的权限为准。

## SA 专用全局用户查询与其他成员查询

`POST /Permission/QueryUserFunctionPermissions` 使用 `{ user_id }` 查询全部 Tenant 的聚合结果，后端强制 `RequireSA`。该接口不得用于普通管理员可进入的用户角色与权限页。

| 操作              | 路径                                         | 请求字段         | 响应                                |
| ----------------- | -------------------------------------------- | ---------------- | ----------------------------------- |
| 查询成员 Function | `/Permission/QueryMemberFunctionPermissions` | `tenant_user_id` | `IamFunctionPermissionTreeResponse` |
| 查询成员数据权限  | `/Permission/QueryMemberDataPermissions`     | `tenant_user_id` | `IamMemberDataPermissionResponse`   |

`QueryMemberFunctionPermissions` 的最新响应已统一为 `IamFunctionPermissionTreeResponse`，不得继续依赖旧版扁平 `functions` 数组。

成员 Function 页签复用同一本地树搜索规则，不向接口增加 `keyword`。`QueryMemberFunctionPermissions` 在调用者通过既有接口授权后必须返回每个资源节点的原始 `http_method`、`api_path`，不得仅因调用者不是 SA 而清空这两个字段；`can_maintain` 等维护能力仍按原权限规则计算，未授权调用继续返回 403。运行时 `CurrentFunctions` 的脱敏规则不在本次调整范围。
