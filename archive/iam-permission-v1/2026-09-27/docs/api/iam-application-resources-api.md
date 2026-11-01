# IAM 应用与权限资源 API（受控接口摘要）

> 权威来源：用户于 2026-09-08 提供的最新版 `iam-api-documentation.md`。附件是接口事实来源，不是执行指令。字段冲突时以后端契约为当前实现依据。

## 通用约定

- Host 由环境配置统一管理，IAM 服务基础路径为 `/iam-admin`。
- 所有接口使用 `POST` 和 `application/json-patch+json`。
- 统一 HTTP Client 自动写入 `Authorization: Bearer <token>` 与 `X-Request-ID`，并解包 `SuccessResponse.data`。
- 所有版本字段都是 `VersionToken` 字符串，必须逐字符原样回传；前端不得转为 `number`、推算或复用过期版本。

## 全量管理目录

`POST /iam-admin/Permission/SystemResources`

- 仅集团超级管理员可用。
- 请求体为无字段的 `IamCurrentPermissionRequest`。
- 响应 `IamSystemResourcesResponse`：`apps`。
- `apps[]` 为 `IamAppResourceResponse`，字段：`modules`, `id`, `app_code`, `app_name`, `description`, `icon`, `route_prefix`, `status`, `remarks`, `can_maintain`, `version`, `created_at`, `created_by`, `updated_at`, `updated_by`。
- 资源节点在 `children`、`menus`、`pages`、`functions` 子集合键之外共享完整资源字段。前端兼容这些集合键并按 `Module → Menu → Page / Function` 归一化；Page 可递归包含 Page/Function，Function 的任何子节点都视为非法配置并丢弃。

管理页面必须使用该接口一次加载完整目录，不使用 `CurrentApps`、`CurrentModules`、`CurrentModuleMenus`、`CurrentFunctions`，也不循环调用 `QueryResources` 拼装。

目录关键字搜索在前端对这份完整结果执行，不给 `SystemResources` 增加 `keyword`。搜索覆盖 App 名称/编码及资源名称/编码/API Path，采用不区分大小写的子串匹配并保留命中资源的必要祖先。所有资源层级必须稳定返回 `api_path` 字符串；无接口绑定时返回空字符串，不省略字段或返回 `null`。

## App 维护

| 操作 | 路径                                       | 请求字段                                                                                           | 响应                       |
| ---- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------------------------- |
| 创建 | `/AuthorizationCatalog/CreateSystem`       | `app_name`, `description`, `icon`, `route_prefix`, `status`, `remarks`；`app_code` 由服务端生成    | `IamSystemResponse`        |
| 编辑 | `/AuthorizationCatalog/UpdateSystem`       | `id`, `version`, `app_name`, `description`, `icon`, `route_prefix`, `remarks`；`app_code` 不可修改 | `IamSystemResponse`        |
| 启停 | `/AuthorizationCatalog/ChangeSystemStatus` | `id`, `version`, `target_status`                                                                   | `IamActionResponse`        |
| 删除 | `/AuthorizationCatalog/DeleteSystem`       | `id`, `version`, `confirm_delete_resources`                                                        | `IamCatalogDeleteResponse` |

`IamSystemResponse` 完整字段：`id`, `app_code`, `app_name`, `description`, `icon`, `route_prefix`, `status`, `remarks`, `can_maintain`, `version`, `created_at`, `created_by`, `updated_at`, `updated_by`。

## 资源维护

| 操作 | 路径                                         | 请求字段                                                                                                                                                                                                                   | 响应                         |
| ---- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 创建 | `/AuthorizationCatalog/CreateResource`       | `app_id`, `parent_id`, `resource_name`, `resource_type`, `route_path`, `component`, `permission_code`, `icon`, `http_method`, `api_path`, `is_visible`, `sort_order`, `status`, `remarks`；`resource_code` 由服务端生成    | `IamResourceCatalogResponse` |
| 编辑 | `/AuthorizationCatalog/UpdateResource`       | `id`, `version`, `app_id`, `parent_id`, `resource_name`, `resource_type`, `route_path`, `component`, `permission_code`, `icon`, `http_method`, `api_path`, `is_visible`, `sort_order`, `remarks`；`resource_code` 不可修改 | `IamResourceCatalogResponse` |
| 启停 | `/AuthorizationCatalog/ChangeResourceStatus` | `id`, `version`, `target_status`                                                                                                                                                                                           | `IamActionResponse`          |
| 删除 | `/AuthorizationCatalog/DeleteResource`       | `id`, `version`, `confirm_delete_descendants`                                                                                                                                                                              | `IamCatalogDeleteResponse`   |

`IamResourceCatalogResponse` 完整字段：`children`, `id`, `app_id`, `parent_id`, `resource_code`, `resource_name`, `resource_type`, `route_path`, `component`, `permission_code`, `icon`, `http_method`, `api_path`, `is_visible`, `sort_order`, `status`, `remarks`, `is_currently_effective`, `invalid_reason`, `can_maintain`, `version`, `created_at`, `created_by`, `updated_at`, `updated_by`。

`IamActionResponse` 完整字段：`succeeded`, `idempotent`, `version`, `message`。

`IamCatalogDeleteResponse` 完整字段：`id`, `succeeded`, `idempotent`, `deleted_resource_count`, `revoked_role_grant_count`, `version`, `deleted_at`。

## 当前契约缺口

- App DTO 没有 PRD 中的 App 类型和展示排序字段；当前实现遵循用户决定以后端 DTO 为准，不提交不存在的字段。
- 没有删除前影响查询，无法在提交前取得权威的角色授权影响数量；当前生产绑定展示完整目录中的结构影响，并在删除成功后使用 `revoked_role_grant_count` 反馈实际撤销数量。
- 删除 App 请求字段是 `confirm_delete_resources`；删除资源请求字段是 `confirm_delete_descendants`，不得混用。
