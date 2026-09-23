# FMS-Platform-IAM-Admin-API 接口文档

> 2026-09-20 组织与岗位普通管理授权约定：`Organization/Query`、`QueryLeaderCandidates`、`Create`、`Update`、`Move`、`ChangeStatus` 及 `Position/Query`、`Create`、`Update`、`ChangeStatus` 分别按对应有效 Function、当前 Tenant/目标实体资源范围、有效成员关系和业务状态校验，不再额外要求 `is_tenant_admin=true`。请求中的 `tenant_id` 不能扩大授权范围，写操作以服务端实体真实归属为准。该约定不改变集团/平台、Tenant 生命周期、跨 Tenant 归属或管理员任命与取消等特殊治理边界。

> 2026-09-18 编码生成约定：`Group/Update` 不接收 `group_code`；`Tenant/Create`、`Tenant/Update` 不接收 `tenant_code`；`Position/Create`、`Position/Update` 不接收 `position_code`；组织创建、更新同样不接收 `org_code`；`Membership/UpdateMember` 不接收 `tenant_user_code` 与系统生成的 `display_name`。这些编码由服务端生成或由初始化流程建立并保持不可变，前端仅在列表、详情和编辑态只读展示响应值。下方历史 Schema 中若仍列出这些写入字段，以本约定为准。

> 2026-09-16 Tenant 表单约定：`Tenant/Create` 与 `Tenant/Update` 的 `company_name` 由前端统一使用 `tenant_name.trim()` 赋值，不再提供独立企业名称输入或展示。响应模型继续保留 `company_name`，避免丢失后端字段；`domain` / `subdomain` 的界面文案分别为“域名”/“子域名”。

> 2026-09-16 用户确认的字段扩展：集团/Tenant 的读写模型增加 `logo_file_id: string`；用户读写模型（含创建 Tenant 首名管理员及创建成员时的 `new_user`）增加 `avatar_file_id: string`。保存 DMS 上传返回的文件 ID；IAM 集团、Tenant、用户信息接口直接返回 `logo_url` / `avatar_url` 用于展示，前端不再调用 DMS `GetAccessUrl`。有文件 ID 时保存仅提交该引用，不回写展示 URL；无文件 ID 的历史 URL 继续兼容。详见 [DMS 文件接入](dmss.md)。下方旧 Schema 未逐表重复扩展，以本补充为准，后端上线情况仍需联调确认。

> 2026-09-08：角色管理、功能权限、数据权限和角色分配的最新版受控契约已迁移至 `docs/api/iam-access-control-api.md`；应用与权限资源契约见 `docs/api/iam-application-resources-api.md`。本文件继续作为 IAM 基础资料及其他接口的受控来源。

> 2026-09-11：并发控制字段 `version`、`role_version`、`member_version`、`session_version`、`user_version` 即使在下方旧 Schema 中仍标注为 `integer(int64)`，实际 JSON 契约已迁移为字符串；前端必须以 `VersionToken` 原样接收和提交。普通 ID、分页、排序等数值字段不受影响。

路径前缀：`/iam-admin`
接口数量：63

## 1. 根据已注册的 Swagger Doc Definition 下载对应接口 Markdown 文件。

接口名称：根据已注册的 Swagger Doc Definition 下载对应接口 Markdown 文件。
接口描述：根据已注册的 Swagger Doc Definition 下载对应接口 Markdown 文件。
请求方式：`GET`
请求路径：`/iam-admin/ApiDocumentation/ExportIam`

### 入参 Schema

#### 路由及查询参数

| 字段          | 位置  | 类型   | 必填 | 描述 |
| ------------- | ----- | ------ | ---- | ---- |
| document_name | query | string | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

无响应体

## 2. Queries authorized IAM audit events within a required, at-most-90-day range.

接口名称：Queries authorized IAM audit events within a required, at-most-90-day range.
接口描述：Queries authorized IAM audit events within a required, at-most-90-day range.
请求方式：`POST`
请求路径：`/iam-admin/Audit/Query`

### 入参 Schema

JSON Body：

#### IamAuditQueryRequest

| 字段             | 类型              | 必填 | 描述 |
| ---------------- | ----------------- | ---- | ---- |
| start_at         | string(date-time) | 否   |      |
| end_at           | string(date-time) | 否   |      |
| scope            | string            | 否   |      |
| tenant_id        | integer(int64)    | 否   |      |
| category         | string            | 否   |      |
| event_type       | string            | 否   |      |
| operator_user_id | integer(int64)    | 否   |      |
| result           | string            | 否   |      |
| target_type      | string            | 否   |      |
| target_id        | string            | 否   |      |
| page_index       | integer(int32)    | 否   |      |
| page_size        | integer(int32)    | 否   |      |
| request_id       | string            | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型             | 必填 | 描述 |
| ---------- | ---------------- | ---- | ---- |
| data       | IamPagedResponse | 否   |      |
| is_success | boolean          | 否   |      |
| status     | string           | 否   |      |
| message    | string           | 否   |      |
| code       | integer(int32)   | 否   |      |

#### IamPagedResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| total      | integer(int64) | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| items      | array          | 否   |      |

#### IamAuditEventResponse

| 字段                    | 类型              | 必填 | 描述 |
| ----------------------- | ----------------- | ---- | ---- |
| id                      | integer(int64)    | 否   |      |
| event_id                | string            | 否   |      |
| category                | string            | 否   |      |
| event_type              | string            | 否   |      |
| tenant_id               | integer(int64)    | 否   |      |
| tenant_code             | string            | 否   |      |
| operator_user_id        | integer(int64)    | 否   |      |
| operator_tenant_user_id | integer(int64)    | 否   |      |
| operator_name           | string            | 否   |      |
| target_type             | string            | 否   |      |
| target_id               | string            | 否   |      |
| result                  | string            | 否   |      |
| failure_reason          | string            | 否   |      |
| before_json             | string            | 否   |      |
| after_json              | string            | 否   |      |
| difference_json         | string            | 否   |      |
| condition_summary_json  | string            | 否   |      |
| source_ip               | string            | 否   |      |
| user_agent              | string            | 否   |      |
| device_type             | string            | 否   |      |
| request_method          | string            | 否   |      |
| request_path            | string            | 否   |      |
| occurred_at_utc         | string(date-time) | 否   |      |
| occurred_at_local       | string            | 否   |      |
| display_timezone        | string            | 否   |      |

## 3. Replaces the fixed initial password and releases the restricted login state.

接口名称：Replaces the fixed initial password and releases the restricted login state.
接口描述：Replaces the fixed initial password and releases the restricted login state.
请求方式：`POST`
请求路径：`/iam-admin/Auth/ChangeInitialPassword`

### 入参 Schema

JSON Body：

#### IamInitialPasswordChangeRequest

| 字段             | 类型           | 必填 | 描述 |
| ---------------- | -------------- | ---- | ---- |
| current_password | string         | 否   |      |
| new_password     | string         | 否   |      |
| user_version     | integer(int64) | 否   |      |
| request_id       | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| data       | LoginResponse  | 否   |      |
| is_success | boolean        | 否   |      |
| status     | string         | 否   |      |
| message    | string         | 否   |      |
| code       | integer(int32) | 否   |      |

#### LoginResponse

| 字段              | 类型                   | 必填 | 描述 |
| ----------------- | ---------------------- | ---- | ---- |
| token             | string                 | 否   |      |
| login_state       | string                 | 否   |      |
| session_id        | integer(int64)         | 否   |      |
| session_version   | integer(int64)         | 否   |      |
| expires_at        | string(date-time)      | 否   |      |
| user_version      | integer(int64)         | 否   |      |
| current_tenant    | IamLoginTenantResponse | 否   |      |
| available_tenants | array                  | 否   |      |

#### IamLoginTenantResponse

| 字段           | 类型           | 必填 | 描述 |
| -------------- | -------------- | ---- | ---- |
| tenant_id      | integer(int64) | 否   |      |
| tenant_user_id | integer(int64) | 否   |      |
| tenant_code    | string         | 否   |      |
| tenant_name    | string         | 否   |      |
| tenant_type    | string         | 否   |      |
| logo_url       | string         | 否   |      |
| timezone       | string         | 否   |      |
| is_default     | boolean        | 否   |      |

## 4. Changes the authenticated user's own password and returns a replacement token.

接口名称：Changes the authenticated user's own password and returns a replacement token.
接口描述：Changes the authenticated user's own password and returns a replacement token.
请求方式：`POST`
请求路径：`/iam-admin/Auth/ChangePassword`

### 入参 Schema

JSON Body：

#### IamSelfPasswordChangeRequest

| 字段             | 类型           | 必填 | 描述 |
| ---------------- | -------------- | ---- | ---- |
| current_password | string         | 否   |      |
| new_password     | string         | 否   |      |
| user_version     | integer(int64) | 否   |      |
| request_id       | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| data       | LoginResponse  | 否   |      |
| is_success | boolean        | 否   |      |
| status     | string         | 否   |      |
| message    | string         | 否   |      |
| code       | integer(int32) | 否   |      |

#### LoginResponse

| 字段              | 类型                   | 必填 | 描述 |
| ----------------- | ---------------------- | ---- | ---- |
| token             | string                 | 否   |      |
| login_state       | string                 | 否   |      |
| session_id        | integer(int64)         | 否   |      |
| session_version   | integer(int64)         | 否   |      |
| expires_at        | string(date-time)      | 否   |      |
| user_version      | integer(int64)         | 否   |      |
| current_tenant    | IamLoginTenantResponse | 否   |      |
| available_tenants | array                  | 否   |      |

#### IamLoginTenantResponse

| 字段           | 类型           | 必填 | 描述 |
| -------------- | -------------- | ---- | ---- |
| tenant_id      | integer(int64) | 否   |      |
| tenant_user_id | integer(int64) | 否   |      |
| tenant_code    | string         | 否   |      |
| tenant_name    | string         | 否   |      |
| tenant_type    | string         | 否   |      |
| logo_url       | string         | 否   |      |
| timezone       | string         | 否   |      |
| is_default     | boolean        | 否   |      |

## 5. Authenticates a user and returns an IAM JWT.

接口名称：Authenticates a user and returns an IAM JWT.
接口描述：Authenticates a user and returns an IAM JWT.
请求方式：`POST`
请求路径：`/iam-admin/Auth/Login`

### 入参 Schema

JSON Body：

#### LoginRequest

| 字段        | 类型   | 必填 | 描述 |
| ----------- | ------ | ---- | ---- |
| user_name   | string | 否   |      |
| password    | string | 否   |      |
| device_id   | string | 否   |      |
| device_type | string | 否   |      |
| request_id  | string | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| data       | LoginResponse  | 否   |      |
| is_success | boolean        | 否   |      |
| status     | string         | 否   |      |
| message    | string         | 否   |      |
| code       | integer(int32) | 否   |      |

#### LoginResponse

| 字段              | 类型                   | 必填 | 描述 |
| ----------------- | ---------------------- | ---- | ---- |
| token             | string                 | 否   |      |
| login_state       | string                 | 否   |      |
| session_id        | integer(int64)         | 否   |      |
| session_version   | integer(int64)         | 否   |      |
| expires_at        | string(date-time)      | 否   |      |
| user_version      | integer(int64)         | 否   |      |
| current_tenant    | IamLoginTenantResponse | 否   |      |
| available_tenants | array                  | 否   |      |

#### IamLoginTenantResponse

| 字段           | 类型           | 必填 | 描述 |
| -------------- | -------------- | ---- | ---- |
| tenant_id      | integer(int64) | 否   |      |
| tenant_user_id | integer(int64) | 否   |      |
| tenant_code    | string         | 否   |      |
| tenant_name    | string         | 否   |      |
| tenant_type    | string         | 否   |      |
| logo_url       | string         | 否   |      |
| timezone       | string         | 否   |      |
| is_default     | boolean        | 否   |      |

## 6. Revokes only the current login session. Repeated logout remains successful.

接口名称：Revokes only the current login session. Repeated logout remains successful.
接口描述：Revokes only the current login session. Repeated logout remains successful.
请求方式：`POST`
请求路径：`/iam-admin/Auth/Logout`

### 入参 Schema

JSON Body：

#### IamEntityRequest

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| id         | integer(int64) | 否   |      |
| request_id | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamLogoutResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamLogoutResponse

| 字段               | 类型    | 必填 | 描述 |
| ------------------ | ------- | ---- | ---- |
| succeeded          | boolean | 否   |      |
| already_logged_out | boolean | 否   |      |

## 7. Resets a user's password and invalidates existing login context caches.

接口名称：Resets a user's password and invalidates existing login context caches.
接口描述：Resets a user's password and invalidates existing login context caches.
请求方式：`POST`
请求路径：`/iam-admin/Auth/ResetPassword`

### 入参 Schema

JSON Body：

#### IamResetPasswordRequest

| 字段         | 类型           | 必填 | 描述 |
| ------------ | -------------- | ---- | ---- |
| id           | integer(int64) | 否   |      |
| new_password | string         | 否   |      |
| version      | integer(int64) | 否   |      |
| request_id   | string         | 否   |      |
| reason       | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                | 必填 | 描述 |
| ---------- | ------------------- | ---- | ---- |
| data       | AdminActionResponse | 否   |      |
| is_success | boolean             | 否   |      |
| status     | string              | 否   |      |
| message    | string              | 否   |      |
| code       | integer(int32)      | 否   |      |

#### AdminActionResponse

| 字段      | 类型    | 必填 | 描述 |
| --------- | ------- | ---- | ---- |
| succeeded | boolean | 否   |      |

## 8. Selects or switches the current tenant for the active login session.

接口名称：Selects or switches the current tenant for the active login session.
接口描述：Selects or switches the current tenant for the active login session.
请求方式：`POST`
请求路径：`/iam-admin/Auth/SwitchTenant`

### 入参 Schema

JSON Body：

#### IamTenantSwitchRequest

| 字段            | 类型           | 必填 | 描述 |
| --------------- | -------------- | ---- | ---- |
| tenant_id       | integer(int64) | 否   |      |
| set_as_default  | boolean        | 否   |      |
| session_version | integer(int64) | 否   |      |
| request_id      | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| data       | LoginResponse  | 否   |      |
| is_success | boolean        | 否   |      |
| status     | string         | 否   |      |
| message    | string         | 否   |      |
| code       | integer(int32) | 否   |      |

#### LoginResponse

| 字段              | 类型                   | 必填 | 描述 |
| ----------------- | ---------------------- | ---- | ---- |
| token             | string                 | 否   |      |
| login_state       | string                 | 否   |      |
| session_id        | integer(int64)         | 否   |      |
| session_version   | integer(int64)         | 否   |      |
| expires_at        | string(date-time)      | 否   |      |
| user_version      | integer(int64)         | 否   |      |
| current_tenant    | IamLoginTenantResponse | 否   |      |
| available_tenants | array                  | 否   |      |

#### IamLoginTenantResponse

| 字段           | 类型           | 必填 | 描述 |
| -------------- | -------------- | ---- | ---- |
| tenant_id      | integer(int64) | 否   |      |
| tenant_user_id | integer(int64) | 否   |      |
| tenant_code    | string         | 否   |      |
| tenant_name    | string         | 否   |      |
| tenant_type    | string         | 否   |      |
| logo_url       | string         | 否   |      |
| timezone       | string         | 否   |      |
| is_default     | boolean        | 否   |      |

## 9. 启用或停用权限资源。

接口名称：启用或停用权限资源。
接口描述：启用或停用权限资源。
请求方式：`POST`
请求路径：`/iam-admin/AuthorizationCatalog/ChangeResourceStatus`

### 入参 Schema

JSON Body：

#### IamStatusChangeRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| target_status | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamActionResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamActionResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| succeeded  | boolean        | 否   |      |
| idempotent | boolean        | 否   |      |
| version    | integer(int64) | 否   |      |
| message    | string         | 否   |      |

## 10. 启用或停用系统。

接口名称：启用或停用系统。
接口描述：启用或停用系统。
请求方式：`POST`
请求路径：`/iam-admin/AuthorizationCatalog/ChangeSystemStatus`

### 入参 Schema

JSON Body：

#### IamStatusChangeRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| target_status | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamActionResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamActionResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| succeeded  | boolean        | 否   |      |
| idempotent | boolean        | 否   |      |
| version    | integer(int64) | 否   |      |
| message    | string         | 否   |      |

## 11. 查询权限资源树。

接口名称：查询权限资源树。
接口描述：查询权限资源树。
请求方式：`POST`
请求路径：`/iam-admin/AuthorizationCatalog/QueryResources`

### 入参 Schema

JSON Body：

#### IamResourceTreeQueryRequest

| 字段        | 类型           | 必填 | 描述 |
| ----------- | -------------- | ---- | ---- |
| app_id      | integer(int64) | 否   |      |
| resource_id | integer(int64) | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| data       | array          | 否   |      |
| is_success | boolean        | 否   |      |
| status     | string         | 否   |      |
| message    | string         | 否   |      |
| code       | integer(int32) | 否   |      |

#### IamResourceCatalogResponse

| 字段                         | 类型              | 必填 | 描述 |
| ---------------------------- | ----------------- | ---- | ---- |
| id                           | integer(int64)    | 否   |      |
| app_id                       | integer(int64)    | 否   |      |
| parent_id                    | integer(int64)    | 否   |      |
| resource_code                | string            | 否   |      |
| resource_name                | string            | 否   |      |
| description                  | string            | 否   |      |
| resource_type                | string            | 否   |      |
| route_path                   | string            | 否   |      |
| component                    | string            | 否   |      |
| permission_code              | string            | 否   |      |
| icon                         | string            | 否   |      |
| http_method                  | string            | 否   |      |
| api_path                     | string            | 否   |      |
| data_domain_code             | string            | 否   |      |
| requires_data_permission     | boolean           | 否   |      |
| is_configuration_valid       | boolean           | 否   |      |
| configuration_invalid_reason | string            | 否   |      |
| is_visible                   | boolean           | 否   |      |
| is_protected                 | boolean           | 否   |      |
| is_assignable                | boolean           | 否   |      |
| is_tenant_admin_fixed        | boolean           | 否   |      |
| sort_order                   | integer(int32)    | 否   |      |
| status                       | string            | 否   |      |
| is_currently_effective       | boolean           | 否   |      |
| invalid_reason               | string            | 否   |      |
| can_maintain                 | boolean           | 否   |      |
| version                      | integer(int64)    | 否   |      |
| updated_at                   | string(date-time) | 否   |      |
| children                     | array             | 否   |      |

## 12. 查询系统目录。

接口名称：查询系统目录。
接口描述：查询系统目录。
请求方式：`POST`
请求路径：`/iam-admin/AuthorizationCatalog/QuerySystems`

### 入参 Schema

JSON Body：

#### IamSystemQueryRequest

| 字段    | 类型           | 必填 | 描述 |
| ------- | -------------- | ---- | ---- |
| id      | integer(int64) | 否   |      |
| keyword | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| data       | array          | 否   |      |
| is_success | boolean        | 否   |      |
| status     | string         | 否   |      |
| message    | string         | 否   |      |
| code       | integer(int32) | 否   |      |

#### IamSystemResponse

| 字段         | 类型              | 必填 | 描述 |
| ------------ | ----------------- | ---- | ---- |
| id           | integer(int64)    | 否   |      |
| app_code     | string            | 否   |      |
| app_name     | string            | 否   |      |
| description  | string            | 否   |      |
| icon         | string            | 否   |      |
| route_prefix | string            | 否   |      |
| system_type  | string            | 否   |      |
| sort_order   | integer(int32)    | 否   |      |
| status       | string            | 否   |      |
| is_core      | boolean           | 否   |      |
| can_maintain | boolean           | 否   |      |
| version      | integer(int64)    | 否   |      |
| updated_at   | string(date-time) | 否   |      |

## 13. 更新资源展示信息。

接口名称：更新资源展示信息。
接口描述：更新资源展示信息。
请求方式：`POST`
请求路径：`/iam-admin/AuthorizationCatalog/UpdateResource`

### 入参 Schema

JSON Body：

#### IamResourceDisplayUpdateRequest

| 字段                     | 类型           | 必填 | 描述 |
| ------------------------ | -------------- | ---- | ---- |
| id                       | integer(int64) | 否   |      |
| version                  | integer(int64) | 否   |      |
| app_id                   | integer(int64) | 否   |      |
| parent_id                | integer(int64) | 否   |      |
| resource_code            | string         | 否   |      |
| resource_type            | string         | 否   |      |
| permission_code          | string         | 否   |      |
| api_path                 | string         | 否   |      |
| http_method              | string         | 否   |      |
| data_domain_code         | string         | 否   |      |
| requires_data_permission | boolean        | 否   |      |
| resource_name            | string         | 否   |      |
| description              | string         | 否   |      |
| icon                     | string         | 否   |      |
| sort_order               | integer(int32) | 否   |      |
| is_visible               | boolean        | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                       | 必填 | 描述 |
| ---------- | -------------------------- | ---- | ---- |
| data       | IamResourceCatalogResponse | 否   |      |
| is_success | boolean                    | 否   |      |
| status     | string                     | 否   |      |
| message    | string                     | 否   |      |
| code       | integer(int32)             | 否   |      |

#### IamResourceCatalogResponse

| 字段                         | 类型              | 必填 | 描述 |
| ---------------------------- | ----------------- | ---- | ---- |
| id                           | integer(int64)    | 否   |      |
| app_id                       | integer(int64)    | 否   |      |
| parent_id                    | integer(int64)    | 否   |      |
| resource_code                | string            | 否   |      |
| resource_name                | string            | 否   |      |
| description                  | string            | 否   |      |
| resource_type                | string            | 否   |      |
| route_path                   | string            | 否   |      |
| component                    | string            | 否   |      |
| permission_code              | string            | 否   |      |
| icon                         | string            | 否   |      |
| http_method                  | string            | 否   |      |
| api_path                     | string            | 否   |      |
| data_domain_code             | string            | 否   |      |
| requires_data_permission     | boolean           | 否   |      |
| is_configuration_valid       | boolean           | 否   |      |
| configuration_invalid_reason | string            | 否   |      |
| is_visible                   | boolean           | 否   |      |
| is_protected                 | boolean           | 否   |      |
| is_assignable                | boolean           | 否   |      |
| is_tenant_admin_fixed        | boolean           | 否   |      |
| sort_order                   | integer(int32)    | 否   |      |
| status                       | string            | 否   |      |
| is_currently_effective       | boolean           | 否   |      |
| invalid_reason               | string            | 否   |      |
| can_maintain                 | boolean           | 否   |      |
| version                      | integer(int64)    | 否   |      |
| updated_at                   | string(date-time) | 否   |      |
| children                     | array             | 否   |      |

## 14. 更新系统展示信息。

接口名称：更新系统展示信息。
接口描述：更新系统展示信息。
请求方式：`POST`
请求路径：`/iam-admin/AuthorizationCatalog/UpdateSystem`

### 入参 Schema

JSON Body：

#### IamSystemUpdateRequest

| 字段         | 类型           | 必填 | 描述 |
| ------------ | -------------- | ---- | ---- |
| id           | integer(int64) | 否   |      |
| version      | integer(int64) | 否   |      |
| app_code     | string         | 否   |      |
| system_type  | string         | 否   |      |
| route_prefix | string         | 否   |      |
| app_name     | string         | 否   |      |
| description  | string         | 否   |      |
| icon         | string         | 否   |      |
| sort_order   | integer(int32) | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamSystemResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamSystemResponse

| 字段         | 类型              | 必填 | 描述 |
| ------------ | ----------------- | ---- | ---- |
| id           | integer(int64)    | 否   |      |
| app_code     | string            | 否   |      |
| app_name     | string            | 否   |      |
| description  | string            | 否   |      |
| icon         | string            | 否   |      |
| route_prefix | string            | 否   |      |
| system_type  | string            | 否   |      |
| sort_order   | integer(int32)    | 否   |      |
| status       | string            | 否   |      |
| is_core      | boolean           | 否   |      |
| can_maintain | boolean           | 否   |      |
| version      | integer(int64)    | 否   |      |
| updated_at   | string(date-time) | 否   |      |

## 15. 幂等初始化集团、Tenant、IAM 模块及平台管理员。

接口名称：幂等初始化集团、Tenant、IAM 模块及平台管理员。
接口描述：幂等初始化集团、Tenant、IAM 模块及平台管理员。
请求方式：`POST`
请求路径：`/iam-admin/Development/Bootstrap`

### 入参 Schema

JSON Body：

#### DevelopmentBootstrapRequest

| 字段        | 类型   | 必填 | 描述 |
| ----------- | ------ | ---- | ---- |
| group_code  | string | 否   |      |
| group_name  | string | 否   |      |
| tenant_code | string | 否   |      |
| tenant_name | string | 否   |      |
| app_code    | string | 否   |      |
| app_name    | string | 否   |      |
| user_name   | string | 否   |      |
| real_name   | string | 否   |      |
| nick_name   | string | 否   |      |
| phone       | string | 否   |      |
| email       | string | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                         | 必填 | 描述 |
| ---------- | ---------------------------- | ---- | ---- |
| data       | DevelopmentBootstrapResponse | 否   |      |
| is_success | boolean                      | 否   |      |
| status     | string                       | 否   |      |
| message    | string                       | 否   |      |
| code       | integer(int32)               | 否   |      |

#### DevelopmentBootstrapResponse

| 字段                             | 类型           | 必填 | 描述 |
| -------------------------------- | -------------- | ---- | ---- |
| group_id                         | integer(int64) | 否   |      |
| group_code                       | string         | 否   |      |
| tenant_id                        | integer(int64) | 否   |      |
| tenant_code                      | string         | 否   |      |
| app_id                           | integer(int64) | 否   |      |
| app_code                         | string         | 否   |      |
| user_id                          | integer(int64) | 否   |      |
| user_name                        | string         | 否   |      |
| tenant_user_id                   | integer(int64) | 否   |      |
| role_id                          | integer(int64) | 否   |      |
| permission_version               | integer(int32) | 否   |      |
| initial_password_change_required | boolean        | 否   |      |

## 16. 查询集团完整信息。

接口名称：查询集团完整信息。
接口描述：查询集团完整信息。
请求方式：`POST`
请求路径：`/iam-admin/Group/Info`

### 入参 Schema

JSON Body：

#### IamEntityRequest

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| id         | integer(int64) | 否   |      |
| request_id | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型             | 必填 | 描述 |
| ---------- | ---------------- | ---- | ---- |
| data       | IamGroupResponse | 否   |      |
| is_success | boolean          | 否   |      |
| status     | string           | 否   |      |
| message    | string           | 否   |      |
| code       | integer(int32)   | 否   |      |

#### IamGroupResponse

| 字段          | 类型              | 必填 | 描述 |
| ------------- | ----------------- | ---- | ---- |
| id            | integer(int64)    | 否   |      |
| group_code    | string            | 否   |      |
| full_name     | string            | 否   |      |
| description   | string            | 否   |      |
| contact_name  | string            | 否   |      |
| contact_phone | string            | 否   |      |
| contact_email | string            | 否   |      |
| website       | string            | 否   |      |
| address       | string            | 否   |      |
| timezone      | string            | 否   |      |
| language      | string            | 否   |      |
| remarks       | string            | 否   |      |
| version       | integer(int64)    | 否   |      |
| updated_at    | string(date-time) | 否   |      |
| group_name    | string            | 否   |      |
| short_name    | string            | 否   |      |
| logo_url      | string            | 否   |      |
| platform_name | string            | 否   |      |

## 17. 查询登录页可见的集团公开信息。

接口名称：查询登录页可见的集团公开信息。
接口描述：查询登录页可见的集团公开信息。
请求方式：`POST`
请求路径：`/iam-admin/Group/PublicInfo`

### 入参 Schema

JSON Body：

#### IamEntityRequest

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| id         | integer(int64) | 否   |      |
| request_id | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                   | 必填 | 描述 |
| ---------- | ---------------------- | ---- | ---- |
| data       | IamGroupPublicResponse | 否   |      |
| is_success | boolean                | 否   |      |
| status     | string                 | 否   |      |
| message    | string                 | 否   |      |
| code       | integer(int32)         | 否   |      |

#### IamGroupPublicResponse

| 字段          | 类型   | 必填 | 描述 |
| ------------- | ------ | ---- | ---- |
| group_name    | string | 否   |      |
| short_name    | string | 否   |      |
| logo_url      | string | 否   |      |
| platform_name | string | 否   |      |

## 18. 更新集团信息。

接口名称：更新集团信息。
接口描述：更新集团信息。
请求方式：`POST`
请求路径：`/iam-admin/Group/Update`

### 入参 Schema

JSON Body：

#### IamGroupUpdateRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| group_name    | string         | 否   |      |
| full_name     | string         | 否   |      |
| short_name    | string         | 否   |      |
| logo_url      | string         | 否   |      |
| description   | string         | 否   |      |
| contact_name  | string         | 否   |      |
| contact_phone | string         | 否   |      |
| contact_email | string         | 否   |      |
| website       | string         | 否   |      |
| address       | string         | 否   |      |
| timezone      | string         | 否   |      |
| language      | string         | 否   |      |
| remarks       | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型             | 必填 | 描述 |
| ---------- | ---------------- | ---- | ---- |
| data       | IamGroupResponse | 否   |      |
| is_success | boolean          | 否   |      |
| status     | string           | 否   |      |
| message    | string           | 否   |      |
| code       | integer(int32)   | 否   |      |

#### IamGroupResponse

| 字段          | 类型              | 必填 | 描述 |
| ------------- | ----------------- | ---- | ---- |
| id            | integer(int64)    | 否   |      |
| group_code    | string            | 否   |      |
| full_name     | string            | 否   |      |
| description   | string            | 否   |      |
| contact_name  | string            | 否   |      |
| contact_phone | string            | 否   |      |
| contact_email | string            | 否   |      |
| website       | string            | 否   |      |
| address       | string            | 否   |      |
| timezone      | string            | 否   |      |
| language      | string            | 否   |      |
| remarks       | string            | 否   |      |
| version       | integer(int64)    | 否   |      |
| updated_at    | string(date-time) | 否   |      |
| group_name    | string            | 否   |      |
| short_name    | string            | 否   |      |
| logo_url      | string            | 否   |      |
| platform_name | string            | 否   |      |

## 19. 由 SA 任命受保护 Tenant 管理员。

接口名称：由 SA 任命受保护 Tenant 管理员。
接口描述：由 SA 任命受保护 Tenant 管理员。
请求方式：`POST`
请求路径：`/iam-admin/MemberRole/AppointTenantAdmin`

### 入参 Schema

JSON Body：

#### IamTenantAdminChangeRequest

| 字段           | 类型           | 必填 | 描述 |
| -------------- | -------------- | ---- | ---- |
| tenant_id      | integer(int64) | 否   |      |
| tenant_user_id | integer(int64) | 否   |      |
| member_version | integer(int64) | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                            | 必填 | 描述 |
| ---------- | ------------------------------- | ---- | ---- |
| data       | IamRoleAssignmentDetailResponse | 否   |      |
| is_success | boolean                         | 否   |      |
| status     | string                          | 否   |      |
| message    | string                          | 否   |      |
| code       | integer(int32)                  | 否   |      |

#### IamRoleAssignmentDetailResponse

| 字段                     | 类型           | 必填 | 描述 |
| ------------------------ | -------------- | ---- | ---- |
| assignment_id            | integer(int64) | 否   |      |
| tenant_id                | integer(int64) | 否   |      |
| tenant_user_id           | integer(int64) | 否   |      |
| tenant_user_code         | string         | 否   |      |
| display_name             | string         | 否   |      |
| role_id                  | integer(int64) | 否   |      |
| role_code                | string         | 否   |      |
| role_name                | string         | 否   |      |
| role_type                | string         | 否   |      |
| is_tenant_admin_identity | boolean        | 否   |      |
| is_group_controlled      | boolean        | 否   |      |
| is_assigned              | boolean        | 否   |      |
| is_currently_effective   | boolean        | 否   |      |
| can_maintain             | boolean        | 否   |      |
| invalid_reason           | string         | 否   |      |
| member_version           | integer(int64) | 否   |      |

## 20. 为 Tenant 成员批量分配自定义角色。

接口名称：为 Tenant 成员批量分配自定义角色。
接口描述：为 Tenant 成员批量分配自定义角色。
请求方式：`POST`
请求路径：`/iam-admin/MemberRole/Assign`

### 入参 Schema

JSON Body：

#### IamMemberRoleSaveRequest

| 字段           | 类型           | 必填 | 描述 |
| -------------- | -------------- | ---- | ---- |
| tenant_user_id | integer(int64) | 否   |      |
| member_version | integer(int64) | 否   |      |
| role_ids       | array          | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| data       | array          | 否   |      |
| is_success | boolean        | 否   |      |
| status     | string         | 否   |      |
| message    | string         | 否   |      |
| code       | integer(int32) | 否   |      |

#### IamRoleAssignmentDetailResponse

| 字段                     | 类型           | 必填 | 描述 |
| ------------------------ | -------------- | ---- | ---- |
| assignment_id            | integer(int64) | 否   |      |
| tenant_id                | integer(int64) | 否   |      |
| tenant_user_id           | integer(int64) | 否   |      |
| tenant_user_code         | string         | 否   |      |
| display_name             | string         | 否   |      |
| role_id                  | integer(int64) | 否   |      |
| role_code                | string         | 否   |      |
| role_name                | string         | 否   |      |
| role_type                | string         | 否   |      |
| is_tenant_admin_identity | boolean        | 否   |      |
| is_group_controlled      | boolean        | 否   |      |
| is_assigned              | boolean        | 否   |      |
| is_currently_effective   | boolean        | 否   |      |
| can_maintain             | boolean        | 否   |      |
| invalid_reason           | string         | 否   |      |
| member_version           | integer(int64) | 否   |      |

## 21. 由 SA 取消受保护 Tenant 管理员。

接口名称：由 SA 取消受保护 Tenant 管理员。
接口描述：由 SA 取消受保护 Tenant 管理员。
请求方式：`POST`
请求路径：`/iam-admin/MemberRole/CancelTenantAdmin`

### 入参 Schema

JSON Body：

#### IamTenantAdminChangeRequest

| 字段           | 类型           | 必填 | 描述 |
| -------------- | -------------- | ---- | ---- |
| tenant_id      | integer(int64) | 否   |      |
| tenant_user_id | integer(int64) | 否   |      |
| member_version | integer(int64) | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                            | 必填 | 描述 |
| ---------- | ------------------------------- | ---- | ---- |
| data       | IamRoleAssignmentDetailResponse | 否   |      |
| is_success | boolean                         | 否   |      |
| status     | string                          | 否   |      |
| message    | string                          | 否   |      |
| code       | integer(int32)                  | 否   |      |

#### IamRoleAssignmentDetailResponse

| 字段                     | 类型           | 必填 | 描述 |
| ------------------------ | -------------- | ---- | ---- |
| assignment_id            | integer(int64) | 否   |      |
| tenant_id                | integer(int64) | 否   |      |
| tenant_user_id           | integer(int64) | 否   |      |
| tenant_user_code         | string         | 否   |      |
| display_name             | string         | 否   |      |
| role_id                  | integer(int64) | 否   |      |
| role_code                | string         | 否   |      |
| role_name                | string         | 否   |      |
| role_type                | string         | 否   |      |
| is_tenant_admin_identity | boolean        | 否   |      |
| is_group_controlled      | boolean        | 否   |      |
| is_assigned              | boolean        | 否   |      |
| is_currently_effective   | boolean        | 否   |      |
| can_maintain             | boolean        | 否   |      |
| invalid_reason           | string         | 否   |      |
| member_version           | integer(int64) | 否   |      |

## 22. 按成员或角色查询直接分配。

接口名称：按成员或角色查询直接分配。
接口描述：按成员或角色查询直接分配。
请求方式：`POST`
请求路径：`/iam-admin/MemberRole/Query`

### 入参 Schema

JSON Body：

#### IamRoleAssignmentListRequest

| 字段           | 类型           | 必填 | 描述 |
| -------------- | -------------- | ---- | ---- |
| tenant_id      | integer(int64) | 否   |      |
| tenant_user_id | integer(int64) | 否   |      |
| role_id        | integer(int64) | 否   |      |
| page_index     | integer(int32) | 否   |      |
| page_size      | integer(int32) | 否   |      |
| keyword        | string         | 否   |      |
| status         | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型             | 必填 | 描述 |
| ---------- | ---------------- | ---- | ---- |
| data       | IamPagedResponse | 否   |      |
| is_success | boolean          | 否   |      |
| status     | string           | 否   |      |
| message    | string           | 否   |      |
| code       | integer(int32)   | 否   |      |

#### IamPagedResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| total      | integer(int64) | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| items      | array          | 否   |      |

#### IamRoleAssignmentDetailResponse

| 字段                     | 类型           | 必填 | 描述 |
| ------------------------ | -------------- | ---- | ---- |
| assignment_id            | integer(int64) | 否   |      |
| tenant_id                | integer(int64) | 否   |      |
| tenant_user_id           | integer(int64) | 否   |      |
| tenant_user_code         | string         | 否   |      |
| display_name             | string         | 否   |      |
| role_id                  | integer(int64) | 否   |      |
| role_code                | string         | 否   |      |
| role_name                | string         | 否   |      |
| role_type                | string         | 否   |      |
| is_tenant_admin_identity | boolean        | 否   |      |
| is_group_controlled      | boolean        | 否   |      |
| is_assigned              | boolean        | 否   |      |
| is_currently_effective   | boolean        | 否   |      |
| can_maintain             | boolean        | 否   |      |
| invalid_reason           | string         | 否   |      |
| member_version           | integer(int64) | 否   |      |

## 23. 批量撤销 Tenant 成员自定义角色。

接口名称：批量撤销 Tenant 成员自定义角色。
接口描述：批量撤销 Tenant 成员自定义角色。
请求方式：`POST`
请求路径：`/iam-admin/MemberRole/Revoke`

### 入参 Schema

JSON Body：

#### IamMemberRoleSaveRequest

| 字段           | 类型           | 必填 | 描述 |
| -------------- | -------------- | ---- | ---- |
| tenant_user_id | integer(int64) | 否   |      |
| member_version | integer(int64) | 否   |      |
| role_ids       | array          | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| data       | array          | 否   |      |
| is_success | boolean        | 否   |      |
| status     | string         | 否   |      |
| message    | string         | 否   |      |
| code       | integer(int32) | 否   |      |

#### IamRoleAssignmentDetailResponse

| 字段                     | 类型           | 必填 | 描述 |
| ------------------------ | -------------- | ---- | ---- |
| assignment_id            | integer(int64) | 否   |      |
| tenant_id                | integer(int64) | 否   |      |
| tenant_user_id           | integer(int64) | 否   |      |
| tenant_user_code         | string         | 否   |      |
| display_name             | string         | 否   |      |
| role_id                  | integer(int64) | 否   |      |
| role_code                | string         | 否   |      |
| role_name                | string         | 否   |      |
| role_type                | string         | 否   |      |
| is_tenant_admin_identity | boolean        | 否   |      |
| is_group_controlled      | boolean        | 否   |      |
| is_assigned              | boolean        | 否   |      |
| is_currently_effective   | boolean        | 否   |      |
| can_maintain             | boolean        | 否   |      |
| invalid_reason           | string         | 否   |      |
| member_version           | integer(int64) | 否   |      |

## 24. 启用或停用租户成员。

接口名称：启用或停用租户成员。
接口描述：启用或停用租户成员。
请求方式：`POST`
请求路径：`/iam-admin/Membership/ChangeMemberStatus`

### 入参 Schema

JSON Body：

#### IamStatusChangeRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| target_status | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamActionResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamActionResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| succeeded  | boolean        | 否   |      |
| idempotent | boolean        | 否   |      |
| version    | integer(int64) | 否   |      |
| message    | string         | 否   |      |

## 25. 启用或停用全局用户。

接口名称：启用或停用全局用户。
接口描述：启用或停用全局用户。
请求方式：`POST`
请求路径：`/iam-admin/Membership/ChangeUserStatus`

### 入参 Schema

JSON Body：

#### IamStatusChangeRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| target_status | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamActionResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamActionResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| succeeded  | boolean        | 否   |      |
| idempotent | boolean        | 否   |      |
| version    | integer(int64) | 否   |      |
| message    | string         | 否   |      |

## 26. 创建用户或将已有用户加入租户。

接口名称：创建用户或将已有用户加入租户。
接口描述：创建用户或将已有用户加入租户。
请求方式：`POST`
请求路径：`/iam-admin/Membership/CreateMember`

### 入参 Schema

JSON Body：

#### IamTenantMemberCreateRequest

| 字段               | 类型              | 必填 | 描述 |
| ------------------ | ----------------- | ---- | ---- |
| tenant_id          | integer(int64)    | 否   |      |
| use_existing_user  | boolean           | 否   |      |
| existing_user_name | string            | 否   |      |
| new_user           | IamNewUserRequest | 否   |      |
| user_type          | string            | 否   |      |
| effective_start    | string(date-time) | 否   |      |
| effective_end      | string(date-time) | 否   |      |
| is_tenant_admin    | boolean           | 否   |      |
| remarks            | string            | 否   |      |
| organizations      | array             | 否   |      |
| positions          | array             | 否   |      |

#### IamNewUserRequest

| 字段       | 类型   | 必填 | 描述 |
| ---------- | ------ | ---- | ---- |
| user_name  | string | 否   |      |
| real_name  | string | 否   |      |
| nick_name  | string | 否   |      |
| phone      | string | 否   |      |
| email      | string | 否   |      |
| avatar_url | string | 否   |      |
| user_type  | string | 否   |      |
| password   | string | 否   |      |

#### IamInitialOrganizationAssignmentRequest

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| org_id     | integer(int64) | 否   |      |
| is_primary | boolean        | 否   |      |

#### IamInitialPositionAssignmentRequest

| 字段        | 类型           | 必填 | 描述 |
| ----------- | -------------- | ---- | ---- |
| position_id | integer(int64) | 否   |      |
| is_primary  | boolean        | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                    | 必填 | 描述 |
| ---------- | ----------------------- | ---- | ---- |
| data       | IamTenantMemberResponse | 否   |      |
| is_success | boolean                 | 否   |      |
| status     | string                  | 否   |      |
| message    | string                  | 否   |      |
| code       | integer(int32)          | 否   |      |

#### IamTenantMemberResponse

| 字段                   | 类型                   | 必填 | 描述 |
| ---------------------- | ---------------------- | ---- | ---- |
| id                     | integer(int64)         | 否   |      |
| tenant_id              | integer(int64)         | 否   |      |
| tenant_code            | string                 | 否   |      |
| user_id                | integer(int64)         | 否   |      |
| tenant_user_code       | string                 | 否   |      |
| display_name           | string                 | 否   |      |
| user_type              | string                 | 否   |      |
| status                 | string                 | 否   |      |
| is_tenant_admin        | boolean                | 否   |      |
| is_default_tenant      | boolean                | 否   |      |
| joined_at              | string(date-time)      | 否   |      |
| left_at                | string(date-time)      | 否   |      |
| is_currently_effective | boolean                | 否   |      |
| remarks                | string                 | 否   |      |
| version                | integer(int64)         | 否   |      |
| updated_at             | string(date-time)      | 否   |      |
| user                   | IamUserSummaryResponse | 否   |      |
| organizations          | array                  | 否   |      |
| positions              | array                  | 否   |      |

#### IamUserSummaryResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| id         | integer(int64)    | 否   |      |
| user_name  | string            | 否   |      |
| real_name  | string            | 否   |      |
| nick_name  | string            | 否   |      |
| phone      | string            | 否   |      |
| email      | string            | 否   |      |
| avatar_url | string            | 否   |      |
| user_type  | string            | 否   |      |
| status     | string            | 否   |      |
| version    | integer(int64)    | 否   |      |
| updated_at | string(date-time) | 否   |      |

#### IamMemberOrganizationResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| org_id                 | integer(int64)    | 否   |      |
| org_code               | string            | 否   |      |
| org_name               | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

#### IamMemberPositionResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| position_id            | integer(int64)    | 否   |      |
| position_code          | string            | 否   |      |
| position_name          | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

## 27. 结束成员组织归属。

接口名称：结束成员组织归属。
接口描述：结束成员组织归属。
请求方式：`POST`
请求路径：`/iam-admin/Membership/EndOrganization`

### 入参 Schema

JSON Body：

#### IamMemberRelationEndRequest

| 字段          | 类型              | 必填 | 描述 |
| ------------- | ----------------- | ---- | ---- |
| id            | integer(int64)    | 否   |      |
| version       | integer(int64)    | 否   |      |
| effective_end | string(date-time) | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamActionResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamActionResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| succeeded  | boolean        | 否   |      |
| idempotent | boolean        | 否   |      |
| version    | integer(int64) | 否   |      |
| message    | string         | 否   |      |

## 28. 结束成员岗位归属。

接口名称：结束成员岗位归属。
接口描述：结束成员岗位归属。
请求方式：`POST`
请求路径：`/iam-admin/Membership/EndPosition`

### 入参 Schema

JSON Body：

#### IamMemberRelationEndRequest

| 字段          | 类型              | 必填 | 描述 |
| ------------- | ----------------- | ---- | ---- |
| id            | integer(int64)    | 否   |      |
| version       | integer(int64)    | 否   |      |
| effective_end | string(date-time) | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamActionResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamActionResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| succeeded  | boolean        | 否   |      |
| idempotent | boolean        | 否   |      |
| version    | integer(int64) | 否   |      |
| message    | string         | 否   |      |

## 29. 查询租户成员。

接口名称：查询租户成员。
接口描述：查询租户成员。
请求方式：`POST`
请求路径：`/iam-admin/Membership/QueryMembers`

### 入参 Schema

JSON Body：

#### IamTenantMemberListRequest

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| tenant_id  | integer(int64) | 否   |      |
| id         | integer(int64) | 否   |      |
| user_name  | string         | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| keyword    | string         | 否   |      |
| status     | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型             | 必填 | 描述 |
| ---------- | ---------------- | ---- | ---- |
| data       | IamPagedResponse | 否   |      |
| is_success | boolean          | 否   |      |
| status     | string           | 否   |      |
| message    | string           | 否   |      |
| code       | integer(int32)   | 否   |      |

#### IamPagedResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| total      | integer(int64) | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| items      | array          | 否   |      |

#### IamTenantMemberResponse

| 字段                   | 类型                   | 必填 | 描述 |
| ---------------------- | ---------------------- | ---- | ---- |
| id                     | integer(int64)         | 否   |      |
| tenant_id              | integer(int64)         | 否   |      |
| tenant_code            | string                 | 否   |      |
| user_id                | integer(int64)         | 否   |      |
| tenant_user_code       | string                 | 否   |      |
| display_name           | string                 | 否   |      |
| user_type              | string                 | 否   |      |
| status                 | string                 | 否   |      |
| is_tenant_admin        | boolean                | 否   |      |
| is_default_tenant      | boolean                | 否   |      |
| joined_at              | string(date-time)      | 否   |      |
| left_at                | string(date-time)      | 否   |      |
| is_currently_effective | boolean                | 否   |      |
| remarks                | string                 | 否   |      |
| version                | integer(int64)         | 否   |      |
| updated_at             | string(date-time)      | 否   |      |
| user                   | IamUserSummaryResponse | 否   |      |
| organizations          | array                  | 否   |      |
| positions              | array                  | 否   |      |

#### IamUserSummaryResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| id         | integer(int64)    | 否   |      |
| user_name  | string            | 否   |      |
| real_name  | string            | 否   |      |
| nick_name  | string            | 否   |      |
| phone      | string            | 否   |      |
| email      | string            | 否   |      |
| avatar_url | string            | 否   |      |
| user_type  | string            | 否   |      |
| status     | string            | 否   |      |
| version    | integer(int64)    | 否   |      |
| updated_at | string(date-time) | 否   |      |

#### IamMemberOrganizationResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| org_id                 | integer(int64)    | 否   |      |
| org_code               | string            | 否   |      |
| org_name               | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

#### IamMemberPositionResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| position_id            | integer(int64)    | 否   |      |
| position_code          | string            | 否   |      |
| position_name          | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

## 30. 查询成员组织归属与历史。

接口名称：查询成员组织归属与历史。
接口描述：查询成员组织归属与历史。
请求方式：`POST`
请求路径：`/iam-admin/Membership/QueryOrganizations`

### 入参 Schema

JSON Body：

#### IamMemberRelationQueryRequest

| 字段            | 类型           | 必填 | 描述 |
| --------------- | -------------- | ---- | ---- |
| tenant_user_id  | integer(int64) | 否   |      |
| include_history | boolean        | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| data       | array          | 否   |      |
| is_success | boolean        | 否   |      |
| status     | string         | 否   |      |
| message    | string         | 否   |      |
| code       | integer(int32) | 否   |      |

#### IamMemberOrganizationResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| org_id                 | integer(int64)    | 否   |      |
| org_code               | string            | 否   |      |
| org_name               | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

## 31. 查询成员岗位归属与历史。

接口名称：查询成员岗位归属与历史。
接口描述：查询成员岗位归属与历史。
请求方式：`POST`
请求路径：`/iam-admin/Membership/QueryPositions`

### 入参 Schema

JSON Body：

#### IamMemberRelationQueryRequest

| 字段            | 类型           | 必填 | 描述 |
| --------------- | -------------- | ---- | ---- |
| tenant_user_id  | integer(int64) | 否   |      |
| include_history | boolean        | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| data       | array          | 否   |      |
| is_success | boolean        | 否   |      |
| status     | string         | 否   |      |
| message    | string         | 否   |      |
| code       | integer(int32) | 否   |      |

#### IamMemberPositionResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| position_id            | integer(int64)    | 否   |      |
| position_code          | string            | 否   |      |
| position_name          | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

## 32. 查询全局用户；租户管理员仅支持按完整账号检索。

接口名称：查询全局用户；租户管理员仅支持按完整账号检索。
接口描述：查询全局用户；租户管理员仅支持按完整账号检索。
请求方式：`POST`
请求路径：`/iam-admin/Membership/QueryUsers`

### 入参 Schema

JSON Body：

#### IamUserListRequest

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| id         | integer(int64) | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| keyword    | string         | 否   |      |
| status     | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型             | 必填 | 描述 |
| ---------- | ---------------- | ---- | ---- |
| data       | IamPagedResponse | 否   |      |
| is_success | boolean          | 否   |      |
| status     | string           | 否   |      |
| message    | string           | 否   |      |
| code       | integer(int32)   | 否   |      |

#### IamPagedResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| total      | integer(int64) | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| items      | array          | 否   |      |

#### IamUserDetailResponse

| 字段        | 类型                   | 必填 | 描述 |
| ----------- | ---------------------- | ---- | ---- |
| user        | IamUserSummaryResponse | 否   |      |
| memberships | array                  | 否   |      |

#### IamUserSummaryResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| id         | integer(int64)    | 否   |      |
| user_name  | string            | 否   |      |
| real_name  | string            | 否   |      |
| nick_name  | string            | 否   |      |
| phone      | string            | 否   |      |
| email      | string            | 否   |      |
| avatar_url | string            | 否   |      |
| user_type  | string            | 否   |      |
| status     | string            | 否   |      |
| version    | integer(int64)    | 否   |      |
| updated_at | string(date-time) | 否   |      |

#### IamTenantMemberResponse

| 字段                   | 类型                   | 必填 | 描述 |
| ---------------------- | ---------------------- | ---- | ---- |
| id                     | integer(int64)         | 否   |      |
| tenant_id              | integer(int64)         | 否   |      |
| tenant_code            | string                 | 否   |      |
| user_id                | integer(int64)         | 否   |      |
| tenant_user_code       | string                 | 否   |      |
| display_name           | string                 | 否   |      |
| user_type              | string                 | 否   |      |
| status                 | string                 | 否   |      |
| is_tenant_admin        | boolean                | 否   |      |
| is_default_tenant      | boolean                | 否   |      |
| joined_at              | string(date-time)      | 否   |      |
| left_at                | string(date-time)      | 否   |      |
| is_currently_effective | boolean                | 否   |      |
| remarks                | string                 | 否   |      |
| version                | integer(int64)         | 否   |      |
| updated_at             | string(date-time)      | 否   |      |
| user                   | IamUserSummaryResponse | 否   |      |
| organizations          | array                  | 否   |      |
| positions              | array                  | 否   |      |

#### IamMemberOrganizationResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| org_id                 | integer(int64)    | 否   |      |
| org_code               | string            | 否   |      |
| org_name               | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

#### IamMemberPositionResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| position_id            | integer(int64)    | 否   |      |
| position_code          | string            | 否   |      |
| position_name          | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

## 33. 新增或更新成员组织归属。

接口名称：新增或更新成员组织归属。
接口描述：新增或更新成员组织归属。
请求方式：`POST`
请求路径：`/iam-admin/Membership/SaveOrganization`

### 入参 Schema

JSON Body：

#### IamMemberOrganizationSaveRequest

| 字段            | 类型              | 必填 | 描述 |
| --------------- | ----------------- | ---- | ---- |
| id              | integer(int64)    | 否   |      |
| version         | integer(int64)    | 否   |      |
| tenant_user_id  | integer(int64)    | 否   |      |
| org_id          | integer(int64)    | 否   |      |
| is_primary      | boolean           | 否   |      |
| effective_start | string(date-time) | 否   |      |
| effective_end   | string(date-time) | 否   |      |
| remarks         | string            | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                          | 必填 | 描述 |
| ---------- | ----------------------------- | ---- | ---- |
| data       | IamMemberOrganizationResponse | 否   |      |
| is_success | boolean                       | 否   |      |
| status     | string                        | 否   |      |
| message    | string                        | 否   |      |
| code       | integer(int32)                | 否   |      |

#### IamMemberOrganizationResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| org_id                 | integer(int64)    | 否   |      |
| org_code               | string            | 否   |      |
| org_name               | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

## 34. 新增或更新成员岗位归属。

接口名称：新增或更新成员岗位归属。
接口描述：新增或更新成员岗位归属。
请求方式：`POST`
请求路径：`/iam-admin/Membership/SavePosition`

### 入参 Schema

JSON Body：

#### IamMemberPositionSaveRequest

| 字段            | 类型              | 必填 | 描述 |
| --------------- | ----------------- | ---- | ---- |
| id              | integer(int64)    | 否   |      |
| version         | integer(int64)    | 否   |      |
| tenant_user_id  | integer(int64)    | 否   |      |
| position_id     | integer(int64)    | 否   |      |
| is_primary      | boolean           | 否   |      |
| effective_start | string(date-time) | 否   |      |
| effective_end   | string(date-time) | 否   |      |
| remarks         | string            | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                      | 必填 | 描述 |
| ---------- | ------------------------- | ---- | ---- |
| data       | IamMemberPositionResponse | 否   |      |
| is_success | boolean                   | 否   |      |
| status     | string                    | 否   |      |
| message    | string                    | 否   |      |
| code       | integer(int32)            | 否   |      |

#### IamMemberPositionResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| position_id            | integer(int64)    | 否   |      |
| position_code          | string            | 否   |      |
| position_name          | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

## 35. 更新租户成员资料与有效期。

接口名称：更新租户成员资料与有效期。
接口描述：更新租户成员资料与有效期。
请求方式：`POST`
请求路径：`/iam-admin/Membership/UpdateMember`

### 入参 Schema

JSON Body：

#### IamTenantMemberUpdateRequest

| 字段             | 类型              | 必填 | 描述 |
| ---------------- | ----------------- | ---- | ---- |
| id               | integer(int64)    | 否   |      |
| version          | integer(int64)    | 否   |      |
| tenant_id        | integer(int64)    | 否   |      |
| user_id          | integer(int64)    | 否   |      |
| effective_start  | string(date-time) | 否   |      |
| effective_end    | string(date-time) | 否   |      |
| remarks          | string            | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                    | 必填 | 描述 |
| ---------- | ----------------------- | ---- | ---- |
| data       | IamTenantMemberResponse | 否   |      |
| is_success | boolean                 | 否   |      |
| status     | string                  | 否   |      |
| message    | string                  | 否   |      |
| code       | integer(int32)          | 否   |      |

#### IamTenantMemberResponse

| 字段                   | 类型                   | 必填 | 描述 |
| ---------------------- | ---------------------- | ---- | ---- |
| id                     | integer(int64)         | 否   |      |
| tenant_id              | integer(int64)         | 否   |      |
| tenant_code            | string                 | 否   |      |
| user_id                | integer(int64)         | 否   |      |
| tenant_user_code       | string                 | 否   |      |
| display_name           | string                 | 否   |      |
| user_type              | string                 | 否   |      |
| status                 | string                 | 否   |      |
| is_tenant_admin        | boolean                | 否   |      |
| is_default_tenant      | boolean                | 否   |      |
| joined_at              | string(date-time)      | 否   |      |
| left_at                | string(date-time)      | 否   |      |
| is_currently_effective | boolean                | 否   |      |
| remarks                | string                 | 否   |      |
| version                | integer(int64)         | 否   |      |
| updated_at             | string(date-time)      | 否   |      |
| user                   | IamUserSummaryResponse | 否   |      |
| organizations          | array                  | 否   |      |
| positions              | array                  | 否   |      |

#### IamUserSummaryResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| id         | integer(int64)    | 否   |      |
| user_name  | string            | 否   |      |
| real_name  | string            | 否   |      |
| nick_name  | string            | 否   |      |
| phone      | string            | 否   |      |
| email      | string            | 否   |      |
| avatar_url | string            | 否   |      |
| user_type  | string            | 否   |      |
| status     | string            | 否   |      |
| version    | integer(int64)    | 否   |      |
| updated_at | string(date-time) | 否   |      |

#### IamMemberOrganizationResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| org_id                 | integer(int64)    | 否   |      |
| org_code               | string            | 否   |      |
| org_name               | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

#### IamMemberPositionResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_user_id         | integer(int64)    | 否   |      |
| position_id            | integer(int64)    | 否   |      |
| position_code          | string            | 否   |      |
| position_name          | string            | 否   |      |
| is_primary             | boolean           | 否   |      |
| effective_start        | string(date-time) | 否   |      |
| effective_end          | string(date-time) | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| status                 | string            | 否   |      |
| remarks                | string            | 否   |      |
| version                | integer(int64)    | 否   |      |
| updated_at             | string(date-time) | 否   |      |

## 36. 更新全局用户资料。

接口名称：更新全局用户资料。
接口描述：更新全局用户资料。
请求方式：`POST`
请求路径：`/iam-admin/Membership/UpdateUser`

### 入参 Schema

JSON Body：

#### IamUserProfileUpdateRequest

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| id         | integer(int64) | 否   |      |
| version    | integer(int64) | 否   |      |
| user_name  | string         | 否   |      |
| real_name  | string         | 否   |      |
| nick_name  | string         | 否   |      |
| phone      | string         | 否   |      |
| email      | string         | 否   |      |
| avatar_url | string         | 否   |      |
| user_type  | string         | 否   |      |
| remarks    | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                   | 必填 | 描述 |
| ---------- | ---------------------- | ---- | ---- |
| data       | IamUserSummaryResponse | 否   |      |
| is_success | boolean                | 否   |      |
| status     | string                 | 否   |      |
| message    | string                 | 否   |      |
| code       | integer(int32)         | 否   |      |

#### IamUserSummaryResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| id         | integer(int64)    | 否   |      |
| user_name  | string            | 否   |      |
| real_name  | string            | 否   |      |
| nick_name  | string            | 否   |      |
| phone      | string            | 否   |      |
| email      | string            | 否   |      |
| avatar_url | string            | 否   |      |
| user_type  | string            | 否   |      |
| status     | string            | 否   |      |
| version    | integer(int64)    | 否   |      |
| updated_at | string(date-time) | 否   |      |

## 37. 启用或停用组织。

接口名称：启用或停用组织。
接口描述：启用或停用组织。
请求方式：`POST`
请求路径：`/iam-admin/Organization/ChangeStatus`

### 入参 Schema

JSON Body：

#### IamStatusChangeRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| target_status | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamActionResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamActionResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| succeeded  | boolean        | 否   |      |
| idempotent | boolean        | 否   |      |
| version    | integer(int64) | 否   |      |
| message    | string         | 否   |      |

## 38. 创建组织。

接口名称：创建组织。
接口描述：创建组织。
请求方式：`POST`
请求路径：`/iam-admin/Organization/Create`

### 入参 Schema

JSON Body：

#### IamOrganizationCreateRequest

| 字段                  | 类型           | 必填 | 描述 |
| --------------------- | -------------- | ---- | ---- |
| tenant_id             | integer(int64) | 否   |      |
| parent_id             | integer(int64) | 否   |      |
| org_name              | string         | 否   |      |
| org_type              | string         | 否   |      |
| leader_tenant_user_id | integer(int64) | 否   |      |
| sort_order            | integer(int32) | 否   |      |
| remarks               | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                    | 必填 | 描述 |
| ---------- | ----------------------- | ---- | ---- |
| data       | IamOrganizationResponse | 否   |      |
| is_success | boolean                 | 否   |      |
| status     | string                  | 否   |      |
| message    | string                  | 否   |      |
| code       | integer(int32)          | 否   |      |

#### IamOrganizationResponse

| 字段                  | 类型              | 必填 | 描述 |
| --------------------- | ----------------- | ---- | ---- |
| id                    | integer(int64)    | 否   |      |
| tenant_id             | integer(int64)    | 否   |      |
| tenant_code           | string            | 否   |      |
| parent_id             | integer(int64)    | 否   |      |
| org_code              | string            | 否   |      |
| org_name              | string            | 否   |      |
| org_type              | string            | 否   |      |
| leader_tenant_user_id | integer(int64)    | 否   |      |
| leader_display_name   | string            | 否   |      |
| path                  | string            | 否   |      |
| level                 | integer(int32)    | 否   |      |
| sort_order            | integer(int32)    | 否   |      |
| status                | string            | 否   |      |
| remarks               | string            | 否   |      |
| active_member_count   | integer(int32)    | 否   |      |
| version               | integer(int64)    | 否   |      |
| updated_at            | string(date-time) | 否   |      |
| children              | array             | 否   |      |

## 39. 移动组织及其完整子树。

接口名称：移动组织及其完整子树。
接口描述：移动组织及其完整子树。
请求方式：`POST`
请求路径：`/iam-admin/Organization/Move`

### 入参 Schema

JSON Body：

#### IamOrganizationMoveRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| new_parent_id | integer(int64) | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                    | 必填 | 描述 |
| ---------- | ----------------------- | ---- | ---- |
| data       | IamOrganizationResponse | 否   |      |
| is_success | boolean                 | 否   |      |
| status     | string                  | 否   |      |
| message    | string                  | 否   |      |
| code       | integer(int32)          | 否   |      |

#### IamOrganizationResponse

| 字段                  | 类型              | 必填 | 描述 |
| --------------------- | ----------------- | ---- | ---- |
| id                    | integer(int64)    | 否   |      |
| tenant_id             | integer(int64)    | 否   |      |
| tenant_code           | string            | 否   |      |
| parent_id             | integer(int64)    | 否   |      |
| org_code              | string            | 否   |      |
| org_name              | string            | 否   |      |
| org_type              | string            | 否   |      |
| leader_tenant_user_id | integer(int64)    | 否   |      |
| leader_display_name   | string            | 否   |      |
| path                  | string            | 否   |      |
| level                 | integer(int32)    | 否   |      |
| sort_order            | integer(int32)    | 否   |      |
| status                | string            | 否   |      |
| remarks               | string            | 否   |      |
| active_member_count   | integer(int32)    | 否   |      |
| version               | integer(int64)    | 否   |      |
| updated_at            | string(date-time) | 否   |      |
| children              | array             | 否   |      |

## 40. 按树形、列表或详情模式查询组织。

接口名称：按树形、列表或详情模式查询组织。
接口描述：按树形、列表或详情模式查询组织。
请求方式：`POST`
请求路径：`/iam-admin/Organization/Query`

### 入参 Schema

JSON Body：

#### IamOrganizationQueryRequest

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| tenant_id  | integer(int64) | 否   |      |
| id         | integer(int64) | 否   |      |
| parent_id  | integer(int64) | 否   |      |
| query_type | string         | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| keyword    | string         | 否   |      |
| status     | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型             | 必填 | 描述 |
| ---------- | ---------------- | ---- | ---- |
| data       | IamPagedResponse | 否   |      |
| is_success | boolean          | 否   |      |
| status     | string           | 否   |      |
| message    | string           | 否   |      |
| code       | integer(int32)   | 否   |      |

#### IamPagedResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| total      | integer(int64) | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| items      | array          | 否   |      |

#### IamOrganizationResponse

| 字段                  | 类型              | 必填 | 描述 |
| --------------------- | ----------------- | ---- | ---- |
| id                    | integer(int64)    | 否   |      |
| tenant_id             | integer(int64)    | 否   |      |
| tenant_code           | string            | 否   |      |
| parent_id             | integer(int64)    | 否   |      |
| org_code              | string            | 否   |      |
| org_name              | string            | 否   |      |
| org_type              | string            | 否   |      |
| leader_tenant_user_id | integer(int64)    | 否   |      |
| leader_display_name   | string            | 否   |      |
| path                  | string            | 否   |      |
| level                 | integer(int32)    | 否   |      |
| sort_order            | integer(int32)    | 否   |      |
| status                | string            | 否   |      |
| remarks               | string            | 否   |      |
| active_member_count   | integer(int32)    | 否   |      |
| version               | integer(int64)    | 否   |      |
| updated_at            | string(date-time) | 否   |      |
| children              | array             | 否   |      |

## 41. 更新组织信息。

接口名称：更新组织信息。
接口描述：更新组织信息。
请求方式：`POST`
请求路径：`/iam-admin/Organization/Update`

### 入参 Schema

JSON Body：

#### IamOrganizationUpdateRequest

| 字段                  | 类型           | 必填 | 描述 |
| --------------------- | -------------- | ---- | ---- |
| id                    | integer(int64) | 否   |      |
| version               | integer(int64) | 否   |      |
| tenant_id             | integer(int64) | 否   |      |
| parent_id             | integer(int64) | 否   |      |
| org_name              | string         | 否   |      |
| org_type              | string         | 否   |      |
| leader_tenant_user_id | integer(int64) | 否   |      |
| sort_order            | integer(int32) | 否   |      |
| remarks               | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                    | 必填 | 描述 |
| ---------- | ----------------------- | ---- | ---- |
| data       | IamOrganizationResponse | 否   |      |
| is_success | boolean                 | 否   |      |
| status     | string                  | 否   |      |
| message    | string                  | 否   |      |
| code       | integer(int32)          | 否   |      |

#### IamOrganizationResponse

| 字段                  | 类型              | 必填 | 描述 |
| --------------------- | ----------------- | ---- | ---- |
| id                    | integer(int64)    | 否   |      |
| tenant_id             | integer(int64)    | 否   |      |
| tenant_code           | string            | 否   |      |
| parent_id             | integer(int64)    | 否   |      |
| org_code              | string            | 否   |      |
| org_name              | string            | 否   |      |
| org_type              | string            | 否   |      |
| leader_tenant_user_id | integer(int64)    | 否   |      |
| leader_display_name   | string            | 否   |      |
| path                  | string            | 否   |      |
| level                 | integer(int32)    | 否   |      |
| sort_order            | integer(int32)    | 否   |      |
| status                | string            | 否   |      |
| remarks               | string            | 否   |      |
| active_member_count   | integer(int32)    | 否   |      |
| version               | integer(int64)    | 否   |      |
| updated_at            | string(date-time) | 否   |      |
| children              | array             | 否   |      |

## 42. 计算当前资源对应域的有效数据范围。

接口名称：计算当前资源对应域的有效数据范围。
接口描述：计算当前资源对应域的有效数据范围。
请求方式：`POST`
请求路径：`/iam-admin/Permission/CalculateDataPermission`

### 入参 Schema

JSON Body：

#### IamDataPermissionCalculationRequest

| 字段          | 类型   | 必填 | 描述 |
| ------------- | ------ | ---- | ---- |
| resource_code | string | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                                 | 必填 | 描述 |
| ---------- | ------------------------------------ | ---- | ---- |
| data       | IamDataPermissionCalculationResponse | 否   |      |
| is_success | boolean                              | 否   |      |
| status     | string                               | 否   |      |
| message    | string                               | 否   |      |
| code       | integer(int32)                       | 否   |      |

#### IamDataPermissionCalculationResponse

| 字段                          | 类型    | 必填 | 描述 |
| ----------------------------- | ------- | ---- | ---- |
| allowed                       | boolean | 否   |      |
| resource_code                 | string  | 否   |      |
| domain_code                   | string  | 否   |      |
| scope_modes                   | array   | 否   |      |
| tenant_ids                    | array   | 否   |      |
| organization_ids              | array   | 否   |      |
| tenant_user_ids               | array   | 否   |      |
| requires_self_ownership_check | boolean | 否   |      |
| is_empty                      | boolean | 否   |      |
| denial_reason                 | string  | 否   |      |

## 43. 按稳定资源编码判断当前操作功能权限。

接口名称：按稳定资源编码判断当前操作功能权限。
接口描述：按稳定资源编码判断当前操作功能权限。
请求方式：`POST`
请求路径：`/iam-admin/Permission/CheckFunction`

### 入参 Schema

JSON Body：

#### IamFunctionPermissionCheckRequest

| 字段          | 类型   | 必填 | 描述 |
| ------------- | ------ | ---- | ---- |
| resource_code | string | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                               | 必填 | 描述 |
| ---------- | ---------------------------------- | ---- | ---- |
| data       | IamFunctionPermissionCheckResponse | 否   |      |
| is_success | boolean                            | 否   |      |
| status     | string                             | 否   |      |
| message    | string                             | 否   |      |
| code       | integer(int32)                     | 否   |      |

#### IamFunctionPermissionCheckResponse

| 字段                     | 类型           | 必填 | 描述 |
| ------------------------ | -------------- | ---- | ---- |
| allowed                  | boolean        | 否   |      |
| resource_id              | integer(int64) | 否   |      |
| resource_code            | string         | 否   |      |
| requires_data_permission | boolean        | 否   |      |
| data_domain_code         | string         | 否   |      |
| denial_reason            | string         | 否   |      |

## 44. 查询本人当前 Menu 下的有效功能权限（旧快照）

> 本节所附旧 Schema 已由 2026-09-11 的 Menu 级契约取代。当前前端受控契约见 `docs/api/iam-shell-context.md#当前-menu-的-function-权限`：请求为 `{ menu_id }`，响应为 `{ menu, functions, permission_codes }`。不得继续使用下方旧的全局 `systems/navigation` 结构。

接口名称：查询本人当前 Tenant 的有效功能权限。
接口描述：查询本人当前 Tenant 的有效功能权限。
请求方式：`POST`
请求路径：`/iam-admin/Permission/CurrentFunctions`

### 入参 Schema

JSON Body：

#### IamCurrentPermissionRequest

类型：`IamCurrentPermissionRequest`

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                                 | 必填 | 描述 |
| ---------- | ------------------------------------ | ---- | ---- |
| data       | IamCurrentFunctionPermissionResponse | 否   |      |
| is_success | boolean                              | 否   |      |
| status     | string                               | 否   |      |
| message    | string                               | 否   |      |
| code       | integer(int32)                       | 否   |      |

#### IamCurrentFunctionPermissionResponse

| 字段             | 类型  | 必填 | 描述 |
| ---------------- | ----- | ---- | ---- |
| systems          | array | 否   |      |
| navigation       | array | 否   |      |
| navigation_tree  | array | 否   |      |
| permissions      | array | 否   |      |
| permission_codes | array | 否   |      |

#### IamSystemResponse

| 字段         | 类型              | 必填 | 描述 |
| ------------ | ----------------- | ---- | ---- |
| id           | integer(int64)    | 否   |      |
| app_code     | string            | 否   |      |
| app_name     | string            | 否   |      |
| description  | string            | 否   |      |
| icon         | string            | 否   |      |
| route_prefix | string            | 否   |      |
| system_type  | string            | 否   |      |
| sort_order   | integer(int32)    | 否   |      |
| status       | string            | 否   |      |
| is_core      | boolean           | 否   |      |
| can_maintain | boolean           | 否   |      |
| version      | integer(int64)    | 否   |      |
| updated_at   | string(date-time) | 否   |      |

#### IamRolePermissionResourceResponse

| 字段                         | 类型              | 必填 | 描述 |
| ---------------------------- | ----------------- | ---- | ---- |
| is_direct                    | boolean           | 否   |      |
| is_inherited                 | boolean           | 否   |      |
| is_navigation_only           | boolean           | 否   |      |
| id                           | integer(int64)    | 否   |      |
| app_id                       | integer(int64)    | 否   |      |
| parent_id                    | integer(int64)    | 否   |      |
| resource_code                | string            | 否   |      |
| resource_name                | string            | 否   |      |
| description                  | string            | 否   |      |
| resource_type                | string            | 否   |      |
| route_path                   | string            | 否   |      |
| component                    | string            | 否   |      |
| permission_code              | string            | 否   |      |
| icon                         | string            | 否   |      |
| http_method                  | string            | 否   |      |
| api_path                     | string            | 否   |      |
| data_domain_code             | string            | 否   |      |
| requires_data_permission     | boolean           | 否   |      |
| is_configuration_valid       | boolean           | 否   |      |
| configuration_invalid_reason | string            | 否   |      |
| is_visible                   | boolean           | 否   |      |
| is_protected                 | boolean           | 否   |      |
| is_assignable                | boolean           | 否   |      |
| is_tenant_admin_fixed        | boolean           | 否   |      |
| sort_order                   | integer(int32)    | 否   |      |
| status                       | string            | 否   |      |
| is_currently_effective       | boolean           | 否   |      |
| invalid_reason               | string            | 否   |      |
| can_maintain                 | boolean           | 否   |      |
| version                      | integer(int64)    | 否   |      |
| updated_at                   | string(date-time) | 否   |      |
| children                     | array             | 否   |      |

#### IamRolePermissionTreeNodeResponse

| 字段     | 类型                              | 必填 | 描述 |
| -------- | --------------------------------- | ---- | ---- |
| resource | IamRolePermissionResourceResponse | 否   |      |
| children | array                             | 否   |      |

#### IamResourceCatalogResponse

| 字段                         | 类型              | 必填 | 描述 |
| ---------------------------- | ----------------- | ---- | ---- |
| id                           | integer(int64)    | 否   |      |
| app_id                       | integer(int64)    | 否   |      |
| parent_id                    | integer(int64)    | 否   |      |
| resource_code                | string            | 否   |      |
| resource_name                | string            | 否   |      |
| description                  | string            | 否   |      |
| resource_type                | string            | 否   |      |
| route_path                   | string            | 否   |      |
| component                    | string            | 否   |      |
| permission_code              | string            | 否   |      |
| icon                         | string            | 否   |      |
| http_method                  | string            | 否   |      |
| api_path                     | string            | 否   |      |
| data_domain_code             | string            | 否   |      |
| requires_data_permission     | boolean           | 否   |      |
| is_configuration_valid       | boolean           | 否   |      |
| configuration_invalid_reason | string            | 否   |      |
| is_visible                   | boolean           | 否   |      |
| is_protected                 | boolean           | 否   |      |
| is_assignable                | boolean           | 否   |      |
| is_tenant_admin_fixed        | boolean           | 否   |      |
| sort_order                   | integer(int32)    | 否   |      |
| status                       | string            | 否   |      |
| is_currently_effective       | boolean           | 否   |      |
| invalid_reason               | string            | 否   |      |
| can_maintain                 | boolean           | 否   |      |
| version                      | integer(int64)    | 否   |      |
| updated_at                   | string(date-time) | 否   |      |
| children                     | array             | 否   |      |

## 45. 按模块稳定编码查询本人当前 Tenant 下的有效菜单权限。

接口名称：按模块稳定编码查询本人当前 Tenant 下的有效菜单权限。
接口描述：按模块稳定编码查询本人当前 Tenant 下的有效菜单权限。
请求方式：`POST`
请求路径：`/iam-admin/Permission/CurrentModuleMenus`

### 入参 Schema

JSON Body：

#### IamCurrentModuleMenuPermissionRequest

| 字段     | 类型   | 必填 | 描述 |
| -------- | ------ | ---- | ---- |
| app_code | string | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                                   | 必填 | 描述 |
| ---------- | -------------------------------------- | ---- | ---- |
| data       | IamCurrentModuleMenuPermissionResponse | 否   |      |
| is_success | boolean                                | 否   |      |
| status     | string                                 | 否   |      |
| message    | string                                 | 否   |      |
| code       | integer(int32)                         | 否   |      |

#### IamCurrentModuleMenuPermissionResponse

| 字段      | 类型              | 必填 | 描述 |
| --------- | ----------------- | ---- | ---- |
| module    | IamSystemResponse | 否   |      |
| menus     | array             | 否   |      |
| menu_tree | array             | 否   |      |

#### IamSystemResponse

| 字段         | 类型              | 必填 | 描述 |
| ------------ | ----------------- | ---- | ---- |
| id           | integer(int64)    | 否   |      |
| app_code     | string            | 否   |      |
| app_name     | string            | 否   |      |
| description  | string            | 否   |      |
| icon         | string            | 否   |      |
| route_prefix | string            | 否   |      |
| system_type  | string            | 否   |      |
| sort_order   | integer(int32)    | 否   |      |
| status       | string            | 否   |      |
| is_core      | boolean           | 否   |      |
| can_maintain | boolean           | 否   |      |
| version      | integer(int64)    | 否   |      |
| updated_at   | string(date-time) | 否   |      |

#### IamRolePermissionResourceResponse

| 字段                         | 类型              | 必填 | 描述 |
| ---------------------------- | ----------------- | ---- | ---- |
| is_direct                    | boolean           | 否   |      |
| is_inherited                 | boolean           | 否   |      |
| is_navigation_only           | boolean           | 否   |      |
| id                           | integer(int64)    | 否   |      |
| app_id                       | integer(int64)    | 否   |      |
| parent_id                    | integer(int64)    | 否   |      |
| resource_code                | string            | 否   |      |
| resource_name                | string            | 否   |      |
| description                  | string            | 否   |      |
| resource_type                | string            | 否   |      |
| route_path                   | string            | 否   |      |
| component                    | string            | 否   |      |
| permission_code              | string            | 否   |      |
| icon                         | string            | 否   |      |
| http_method                  | string            | 否   |      |
| api_path                     | string            | 否   |      |
| data_domain_code             | string            | 否   |      |
| requires_data_permission     | boolean           | 否   |      |
| is_configuration_valid       | boolean           | 否   |      |
| configuration_invalid_reason | string            | 否   |      |
| is_visible                   | boolean           | 否   |      |
| is_protected                 | boolean           | 否   |      |
| is_assignable                | boolean           | 否   |      |
| is_tenant_admin_fixed        | boolean           | 否   |      |
| sort_order                   | integer(int32)    | 否   |      |
| status                       | string            | 否   |      |
| is_currently_effective       | boolean           | 否   |      |
| invalid_reason               | string            | 否   |      |
| can_maintain                 | boolean           | 否   |      |
| version                      | integer(int64)    | 否   |      |
| updated_at                   | string(date-time) | 否   |      |
| children                     | array             | 否   |      |

#### IamRolePermissionTreeNodeResponse

| 字段     | 类型                              | 必填 | 描述 |
| -------- | --------------------------------- | ---- | ---- |
| resource | IamRolePermissionResourceResponse | 否   |      |
| children | array                             | 否   |      |

#### IamResourceCatalogResponse

| 字段                         | 类型              | 必填 | 描述 |
| ---------------------------- | ----------------- | ---- | ---- |
| id                           | integer(int64)    | 否   |      |
| app_id                       | integer(int64)    | 否   |      |
| parent_id                    | integer(int64)    | 否   |      |
| resource_code                | string            | 否   |      |
| resource_name                | string            | 否   |      |
| description                  | string            | 否   |      |
| resource_type                | string            | 否   |      |
| route_path                   | string            | 否   |      |
| component                    | string            | 否   |      |
| permission_code              | string            | 否   |      |
| icon                         | string            | 否   |      |
| http_method                  | string            | 否   |      |
| api_path                     | string            | 否   |      |
| data_domain_code             | string            | 否   |      |
| requires_data_permission     | boolean           | 否   |      |
| is_configuration_valid       | boolean           | 否   |      |
| configuration_invalid_reason | string            | 否   |      |
| is_visible                   | boolean           | 否   |      |
| is_protected                 | boolean           | 否   |      |
| is_assignable                | boolean           | 否   |      |
| is_tenant_admin_fixed        | boolean           | 否   |      |
| sort_order                   | integer(int32)    | 否   |      |
| status                       | string            | 否   |      |
| is_currently_effective       | boolean           | 否   |      |
| invalid_reason               | string            | 否   |      |
| can_maintain                 | boolean           | 否   |      |
| version                      | integer(int64)    | 否   |      |
| updated_at                   | string(date-time) | 否   |      |
| children                     | array             | 否   |      |

## 46. 查询本人当前 Tenant 下具有功能权限的模块。

接口名称：查询本人当前 Tenant 下具有功能权限的模块。
接口描述：查询本人当前 Tenant 下具有功能权限的模块。
请求方式：`POST`
请求路径：`/iam-admin/Permission/CurrentModules`

### 入参 Schema

JSON Body：

#### IamCurrentPermissionRequest

类型：`IamCurrentPermissionRequest`

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                               | 必填 | 描述 |
| ---------- | ---------------------------------- | ---- | ---- |
| data       | IamCurrentModulePermissionResponse | 否   |      |
| is_success | boolean                            | 否   |      |
| status     | string                             | 否   |      |
| message    | string                             | 否   |      |
| code       | integer(int32)                     | 否   |      |

#### IamCurrentModulePermissionResponse

| 字段    | 类型  | 必填 | 描述 |
| ------- | ----- | ---- | ---- |
| modules | array | 否   |      |

#### IamSystemResponse

| 字段         | 类型              | 必填 | 描述 |
| ------------ | ----------------- | ---- | ---- |
| id           | integer(int64)    | 否   |      |
| app_code     | string            | 否   |      |
| app_name     | string            | 否   |      |
| description  | string            | 否   |      |
| icon         | string            | 否   |      |
| route_prefix | string            | 否   |      |
| system_type  | string            | 否   |      |
| sort_order   | integer(int32)    | 否   |      |
| status       | string            | 否   |      |
| is_core      | boolean           | 否   |      |
| can_maintain | boolean           | 否   |      |
| version      | integer(int64)    | 否   |      |
| updated_at   | string(date-time) | 否   |      |

## 47. 启用或停用岗位。

接口名称：启用或停用岗位。
接口描述：启用或停用岗位。
请求方式：`POST`
请求路径：`/iam-admin/Position/ChangeStatus`

### 入参 Schema

JSON Body：

#### IamStatusChangeRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| target_status | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamActionResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamActionResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| succeeded  | boolean        | 否   |      |
| idempotent | boolean        | 否   |      |
| version    | integer(int64) | 否   |      |
| message    | string         | 否   |      |

## 48. 创建岗位。

接口名称：创建岗位。
接口描述：创建岗位。
请求方式：`POST`
请求路径：`/iam-admin/Position/Create`

### 入参 Schema

JSON Body：

#### IamPositionCreateRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| tenant_id     | integer(int64) | 否   |      |
| position_name | string         | 否   |      |
| position_type | string         | 否   |      |
| sort_order    | integer(int32) | 否   |      |
| remarks       | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                      | 必填 | 描述 |
| ---------- | ------------------------- | ---- | ---- |
| data       | IamPositionDetailResponse | 否   |      |
| is_success | boolean                   | 否   |      |
| status     | string                    | 否   |      |
| message    | string                    | 否   |      |
| code       | integer(int32)            | 否   |      |

#### IamPositionDetailResponse

| 字段                | 类型              | 必填 | 描述 |
| ------------------- | ----------------- | ---- | ---- |
| id                  | integer(int64)    | 否   |      |
| tenant_id           | integer(int64)    | 否   |      |
| tenant_code         | string            | 否   |      |
| position_code       | string            | 否   |      |
| position_name       | string            | 否   |      |
| position_type       | string            | 否   |      |
| sort_order          | integer(int32)    | 否   |      |
| status              | string            | 否   |      |
| remarks             | string            | 否   |      |
| active_member_count | integer(int32)    | 否   |      |
| version             | integer(int64)    | 否   |      |
| updated_at          | string(date-time) | 否   |      |

## 49. 查询岗位。

接口名称：查询岗位。
接口描述：查询岗位。
请求方式：`POST`
请求路径：`/iam-admin/Position/Query`

### 入参 Schema

JSON Body：

#### IamPositionQueryV2Request

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| tenant_id  | integer(int64) | 否   |      |
| id         | integer(int64) | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| keyword    | string         | 否   |      |
| status     | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型             | 必填 | 描述 |
| ---------- | ---------------- | ---- | ---- |
| data       | IamPagedResponse | 否   |      |
| is_success | boolean          | 否   |      |
| status     | string           | 否   |      |
| message    | string           | 否   |      |
| code       | integer(int32)   | 否   |      |

#### IamPagedResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| total      | integer(int64) | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| items      | array          | 否   |      |

#### IamPositionDetailResponse

| 字段                | 类型              | 必填 | 描述 |
| ------------------- | ----------------- | ---- | ---- |
| id                  | integer(int64)    | 否   |      |
| tenant_id           | integer(int64)    | 否   |      |
| tenant_code         | string            | 否   |      |
| position_code       | string            | 否   |      |
| position_name       | string            | 否   |      |
| position_type       | string            | 否   |      |
| sort_order          | integer(int32)    | 否   |      |
| status              | string            | 否   |      |
| remarks             | string            | 否   |      |
| active_member_count | integer(int32)    | 否   |      |
| version             | integer(int64)    | 否   |      |
| updated_at          | string(date-time) | 否   |      |

## 50. 更新岗位信息。

接口名称：更新岗位信息。
接口描述：更新岗位信息。
请求方式：`POST`
请求路径：`/iam-admin/Position/Update`

### 入参 Schema

JSON Body：

#### IamPositionUpdateV2Request

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| tenant_id     | integer(int64) | 否   |      |
| position_name | string         | 否   |      |
| position_type | string         | 否   |      |
| sort_order    | integer(int32) | 否   |      |
| remarks       | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                      | 必填 | 描述 |
| ---------- | ------------------------- | ---- | ---- |
| data       | IamPositionDetailResponse | 否   |      |
| is_success | boolean                   | 否   |      |
| status     | string                    | 否   |      |
| message    | string                    | 否   |      |
| code       | integer(int32)            | 否   |      |

#### IamPositionDetailResponse

| 字段                | 类型              | 必填 | 描述 |
| ------------------- | ----------------- | ---- | ---- |
| id                  | integer(int64)    | 否   |      |
| tenant_id           | integer(int64)    | 否   |      |
| tenant_code         | string            | 否   |      |
| position_code       | string            | 否   |      |
| position_name       | string            | 否   |      |
| position_type       | string            | 否   |      |
| sort_order          | integer(int32)    | 否   |      |
| status              | string            | 否   |      |
| remarks             | string            | 否   |      |
| active_member_count | integer(int32)    | 否   |      |
| version             | integer(int64)    | 否   |      |
| updated_at          | string(date-time) | 否   |      |

## 51. 启用或停用自定义角色。

接口名称：启用或停用自定义角色。
接口描述：启用或停用自定义角色。
请求方式：`POST`
请求路径：`/iam-admin/RolePermission/ChangeRoleStatus`

### 入参 Schema

JSON Body：

#### IamRoleStatusChangeRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| tenant_id     | integer(int64) | 否   |      |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| target_status | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamActionResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamActionResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| succeeded  | boolean        | 否   |      |
| idempotent | boolean        | 否   |      |
| version    | integer(int64) | 否   |      |
| message    | string         | 否   |      |

## 52. 创建自定义角色。

接口名称：创建自定义角色。
接口描述：创建自定义角色。
请求方式：`POST`
请求路径：`/iam-admin/RolePermission/CreateRole`

### 入参 Schema

JSON Body：

#### IamCustomRoleCreateRequest

| 字段        | 类型           | 必填 | 描述 |
| ----------- | -------------- | ---- | ---- |
| tenant_id   | integer(int64) | 否   |      |
| role_name   | string         | 否   |      |
| description | string         | 否   |      |
| remarks     | string         | 否   |      |
| sort_order  | integer(int32) | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                  | 必填 | 描述 |
| ---------- | --------------------- | ---- | ---- |
| data       | IamRoleDetailResponse | 否   |      |
| is_success | boolean               | 否   |      |
| status     | string                | 否   |      |
| message    | string                | 否   |      |
| code       | integer(int32)        | 否   |      |

#### IamRoleDetailResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_id              | integer(int64)    | 否   |      |
| tenant_code            | string            | 否   |      |
| role_code              | string            | 否   |      |
| role_name              | string            | 否   |      |
| role_type              | string            | 否   |      |
| sort_order             | integer(int32)    | 否   |      |
| status                 | string            | 否   |      |
| description            | string            | 否   |      |
| remarks                | string            | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| is_group_controlled    | boolean           | 否   |      |
| can_maintain           | boolean           | 否   |      |
| version                | integer(int64)    | 否   |      |
| created_at             | string(date-time) | 否   |      |
| updated_at             | string(date-time) | 否   |      |

## 53. 查询系统预注册数据权限域。

接口名称：查询系统预注册数据权限域。
接口描述：查询系统预注册数据权限域。
请求方式：`POST`
请求路径：`/iam-admin/RolePermission/QueryDataDomains`

### 入参 Schema

JSON Body：

#### IamDataPermissionDomainQueryRequest

| 字段        | 类型           | 必填 | 描述 |
| ----------- | -------------- | ---- | ---- |
| app_id      | integer(int64) | 否   |      |
| domain_code | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                                   | 必填 | 描述 |
| ---------- | -------------------------------------- | ---- | ---- |
| data       | IamDataPermissionDomainCatalogResponse | 否   |      |
| is_success | boolean                                | 否   |      |
| status     | string                                 | 否   |      |
| message    | string                                 | 否   |      |
| code       | integer(int32)                         | 否   |      |

#### IamDataPermissionDomainCatalogResponse

| 字段              | 类型  | 必填 | 描述 |
| ----------------- | ----- | ---- | ---- |
| domains           | array | 否   |      |
| invalid_resources | array | 否   |      |

#### IamDataPermissionDomainResponse

| 字段                   | 类型           | 必填 | 描述 |
| ---------------------- | -------------- | ---- | ---- |
| id                     | integer(int64) | 否   |      |
| app_id                 | integer(int64) | 否   |      |
| app_code               | string         | 否   |      |
| domain_code            | string         | 否   |      |
| domain_name            | string         | 否   |      |
| supported_scopes       | array          | 否   |      |
| self_definition        | string         | 否   |      |
| status                 | string         | 否   |      |
| linked_resource_ids    | array          | 否   |      |
| is_configuration_valid | boolean        | 否   |      |
| invalid_reason         | string         | 否   |      |

#### IamDataPermissionResourceIssueResponse

| 字段           | 类型           | 必填 | 描述 |
| -------------- | -------------- | ---- | ---- |
| resource_id    | integer(int64) | 否   |      |
| app_id         | integer(int64) | 否   |      |
| resource_code  | string         | 否   |      |
| resource_name  | string         | 否   |      |
| invalid_reason | string         | 否   |      |

## 54. 查询角色各数据权限域配置。

接口名称：查询角色各数据权限域配置。
接口描述：查询角色各数据权限域配置。
请求方式：`POST`
请求路径：`/iam-admin/RolePermission/QueryDataPermissions`

### 入参 Schema

JSON Body：

#### IamRoleDataPermissionQueryRequest

| 字段    | 类型           | 必填 | 描述 |
| ------- | -------------- | ---- | ---- |
| role_id | integer(int64) | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                          | 必填 | 描述 |
| ---------- | ----------------------------- | ---- | ---- |
| data       | IamRoleDataPermissionResponse | 否   |      |
| is_success | boolean                       | 否   |      |
| status     | string                        | 否   |      |
| message    | string                        | 否   |      |
| code       | integer(int32)                | 否   |      |

#### IamRoleDataPermissionResponse

| 字段         | 类型           | 必填 | 描述 |
| ------------ | -------------- | ---- | ---- |
| role_id      | integer(int64) | 否   |      |
| role_version | integer(int64) | 否   |      |
| domains      | array          | 否   |      |

#### IamRoleDataPermissionItemResponse

| 字段                   | 类型           | 必填 | 描述 |
| ---------------------- | -------------- | ---- | ---- |
| domain_code            | string         | 否   |      |
| domain_name            | string         | 否   |      |
| is_configured          | boolean        | 否   |      |
| scope_mode             | string         | 否   |      |
| target_tenant_ids      | array          | 否   |      |
| is_currently_effective | boolean        | 否   |      |
| invalid_reason         | string         | 否   |      |
| version                | integer(int64) | 否   |      |

## 55. 查询角色直接、继承及导航资源。

接口名称：查询角色直接、继承及导航资源。
接口描述：查询角色直接、继承及导航资源。
请求方式：`POST`
请求路径：`/iam-admin/RolePermission/QueryFunctionPermissions`

### 入参 Schema

JSON Body：

#### IamRoleFunctionPermissionQueryRequest

| 字段    | 类型           | 必填 | 描述 |
| ------- | -------------- | ---- | ---- |
| role_id | integer(int64) | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                              | 必填 | 描述 |
| ---------- | --------------------------------- | ---- | ---- |
| data       | IamRoleFunctionPermissionResponse | 否   |      |
| is_success | boolean                           | 否   |      |
| status     | string                            | 否   |      |
| message    | string                            | 否   |      |
| code       | integer(int32)                    | 否   |      |

#### IamRoleFunctionPermissionResponse

| 字段                   | 类型           | 必填 | 描述 |
| ---------------------- | -------------- | ---- | ---- |
| role_id                | integer(int64) | 否   |      |
| role_version           | integer(int64) | 否   |      |
| direct_resource_ids    | array          | 否   |      |
| effective_resource_ids | array          | 否   |      |
| resources              | array          | 否   |      |
| resource_tree          | array          | 否   |      |

#### IamRolePermissionResourceResponse

| 字段                         | 类型              | 必填 | 描述 |
| ---------------------------- | ----------------- | ---- | ---- |
| is_direct                    | boolean           | 否   |      |
| is_inherited                 | boolean           | 否   |      |
| is_navigation_only           | boolean           | 否   |      |
| id                           | integer(int64)    | 否   |      |
| app_id                       | integer(int64)    | 否   |      |
| parent_id                    | integer(int64)    | 否   |      |
| resource_code                | string            | 否   |      |
| resource_name                | string            | 否   |      |
| description                  | string            | 否   |      |
| resource_type                | string            | 否   |      |
| route_path                   | string            | 否   |      |
| component                    | string            | 否   |      |
| permission_code              | string            | 否   |      |
| icon                         | string            | 否   |      |
| http_method                  | string            | 否   |      |
| api_path                     | string            | 否   |      |
| data_domain_code             | string            | 否   |      |
| requires_data_permission     | boolean           | 否   |      |
| is_configuration_valid       | boolean           | 否   |      |
| configuration_invalid_reason | string            | 否   |      |
| is_visible                   | boolean           | 否   |      |
| is_protected                 | boolean           | 否   |      |
| is_assignable                | boolean           | 否   |      |
| is_tenant_admin_fixed        | boolean           | 否   |      |
| sort_order                   | integer(int32)    | 否   |      |
| status                       | string            | 否   |      |
| is_currently_effective       | boolean           | 否   |      |
| invalid_reason               | string            | 否   |      |
| can_maintain                 | boolean           | 否   |      |
| version                      | integer(int64)    | 否   |      |
| updated_at                   | string(date-time) | 否   |      |
| children                     | array             | 否   |      |

#### IamRolePermissionTreeNodeResponse

| 字段     | 类型                              | 必填 | 描述 |
| -------- | --------------------------------- | ---- | ---- |
| resource | IamRolePermissionResourceResponse | 否   |      |
| children | array                             | 否   |      |

#### IamResourceCatalogResponse

| 字段                         | 类型              | 必填 | 描述 |
| ---------------------------- | ----------------- | ---- | ---- |
| id                           | integer(int64)    | 否   |      |
| app_id                       | integer(int64)    | 否   |      |
| parent_id                    | integer(int64)    | 否   |      |
| resource_code                | string            | 否   |      |
| resource_name                | string            | 否   |      |
| description                  | string            | 否   |      |
| resource_type                | string            | 否   |      |
| route_path                   | string            | 否   |      |
| component                    | string            | 否   |      |
| permission_code              | string            | 否   |      |
| icon                         | string            | 否   |      |
| http_method                  | string            | 否   |      |
| api_path                     | string            | 否   |      |
| data_domain_code             | string            | 否   |      |
| requires_data_permission     | boolean           | 否   |      |
| is_configuration_valid       | boolean           | 否   |      |
| configuration_invalid_reason | string            | 否   |      |
| is_visible                   | boolean           | 否   |      |
| is_protected                 | boolean           | 否   |      |
| is_assignable                | boolean           | 否   |      |
| is_tenant_admin_fixed        | boolean           | 否   |      |
| sort_order                   | integer(int32)    | 否   |      |
| status                       | string            | 否   |      |
| is_currently_effective       | boolean           | 否   |      |
| invalid_reason               | string            | 否   |      |
| can_maintain                 | boolean           | 否   |      |
| version                      | integer(int64)    | 否   |      |
| updated_at                   | string(date-time) | 否   |      |
| children                     | array             | 否   |      |

## 56. 查询目标 Tenant 角色。

接口名称：查询目标 Tenant 角色。
接口描述：查询目标 Tenant 角色。
请求方式：`POST`
请求路径：`/iam-admin/RolePermission/QueryRoles`

### 入参 Schema

JSON Body：

#### IamRoleListRequest

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| tenant_id  | integer(int64) | 否   |      |
| id         | integer(int64) | 否   |      |
| role_type  | string         | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| keyword    | string         | 否   |      |
| status     | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型             | 必填 | 描述 |
| ---------- | ---------------- | ---- | ---- |
| data       | IamPagedResponse | 否   |      |
| is_success | boolean          | 否   |      |
| status     | string           | 否   |      |
| message    | string           | 否   |      |
| code       | integer(int32)   | 否   |      |

#### IamPagedResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| total      | integer(int64) | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| items      | array          | 否   |      |

#### IamRoleDetailResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_id              | integer(int64)    | 否   |      |
| tenant_code            | string            | 否   |      |
| role_code              | string            | 否   |      |
| role_name              | string            | 否   |      |
| role_type              | string            | 否   |      |
| sort_order             | integer(int32)    | 否   |      |
| status                 | string            | 否   |      |
| description            | string            | 否   |      |
| remarks                | string            | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| is_group_controlled    | boolean           | 否   |      |
| can_maintain           | boolean           | 否   |      |
| version                | integer(int64)    | 否   |      |
| created_at             | string(date-time) | 否   |      |
| updated_at             | string(date-time) | 否   |      |

## 57. 配置或清除角色单个数据权限域。

接口名称：配置或清除角色单个数据权限域。
接口描述：配置或清除角色单个数据权限域。
请求方式：`POST`
请求路径：`/iam-admin/RolePermission/SaveDataPermission`

### 入参 Schema

JSON Body：

#### IamRoleDataPermissionSaveRequest

| 字段              | 类型           | 必填 | 描述 |
| ----------------- | -------------- | ---- | ---- |
| role_id           | integer(int64) | 否   |      |
| role_version      | integer(int64) | 否   |      |
| domain_code       | string         | 否   |      |
| scope_mode        | string         | 否   |      |
| clear             | boolean        | 否   |      |
| target_tenant_ids | array          | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                          | 必填 | 描述 |
| ---------- | ----------------------------- | ---- | ---- |
| data       | IamRoleDataPermissionResponse | 否   |      |
| is_success | boolean                       | 否   |      |
| status     | string                        | 否   |      |
| message    | string                        | 否   |      |
| code       | integer(int32)                | 否   |      |

#### IamRoleDataPermissionResponse

| 字段         | 类型           | 必填 | 描述 |
| ------------ | -------------- | ---- | ---- |
| role_id      | integer(int64) | 否   |      |
| role_version | integer(int64) | 否   |      |
| domains      | array          | 否   |      |

#### IamRoleDataPermissionItemResponse

| 字段                   | 类型           | 必填 | 描述 |
| ---------------------- | -------------- | ---- | ---- |
| domain_code            | string         | 否   |      |
| domain_name            | string         | 否   |      |
| is_configured          | boolean        | 否   |      |
| scope_mode             | string         | 否   |      |
| target_tenant_ids      | array          | 否   |      |
| is_currently_effective | boolean        | 否   |      |
| invalid_reason         | string         | 否   |      |
| version                | integer(int64) | 否   |      |

## 58. 以完整直接选择集合替换角色功能权限。

接口名称：以完整直接选择集合替换角色功能权限。
接口描述：以完整直接选择集合替换角色功能权限。
请求方式：`POST`
请求路径：`/iam-admin/RolePermission/SaveFunctionPermissions`

### 入参 Schema

JSON Body：

#### IamRoleFunctionPermissionSaveRequest

| 字段                | 类型           | 必填 | 描述 |
| ------------------- | -------------- | ---- | ---- |
| role_id             | integer(int64) | 否   |      |
| role_version        | integer(int64) | 否   |      |
| direct_resource_ids | array          | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                              | 必填 | 描述 |
| ---------- | --------------------------------- | ---- | ---- |
| data       | IamRoleFunctionPermissionResponse | 否   |      |
| is_success | boolean                           | 否   |      |
| status     | string                            | 否   |      |
| message    | string                            | 否   |      |
| code       | integer(int32)                    | 否   |      |

#### IamRoleFunctionPermissionResponse

| 字段                   | 类型           | 必填 | 描述 |
| ---------------------- | -------------- | ---- | ---- |
| role_id                | integer(int64) | 否   |      |
| role_version           | integer(int64) | 否   |      |
| direct_resource_ids    | array          | 否   |      |
| effective_resource_ids | array          | 否   |      |
| resources              | array          | 否   |      |
| resource_tree          | array          | 否   |      |

#### IamRolePermissionResourceResponse

| 字段                         | 类型              | 必填 | 描述 |
| ---------------------------- | ----------------- | ---- | ---- |
| is_direct                    | boolean           | 否   |      |
| is_inherited                 | boolean           | 否   |      |
| is_navigation_only           | boolean           | 否   |      |
| id                           | integer(int64)    | 否   |      |
| app_id                       | integer(int64)    | 否   |      |
| parent_id                    | integer(int64)    | 否   |      |
| resource_code                | string            | 否   |      |
| resource_name                | string            | 否   |      |
| description                  | string            | 否   |      |
| resource_type                | string            | 否   |      |
| route_path                   | string            | 否   |      |
| component                    | string            | 否   |      |
| permission_code              | string            | 否   |      |
| icon                         | string            | 否   |      |
| http_method                  | string            | 否   |      |
| api_path                     | string            | 否   |      |
| data_domain_code             | string            | 否   |      |
| requires_data_permission     | boolean           | 否   |      |
| is_configuration_valid       | boolean           | 否   |      |
| configuration_invalid_reason | string            | 否   |      |
| is_visible                   | boolean           | 否   |      |
| is_protected                 | boolean           | 否   |      |
| is_assignable                | boolean           | 否   |      |
| is_tenant_admin_fixed        | boolean           | 否   |      |
| sort_order                   | integer(int32)    | 否   |      |
| status                       | string            | 否   |      |
| is_currently_effective       | boolean           | 否   |      |
| invalid_reason               | string            | 否   |      |
| can_maintain                 | boolean           | 否   |      |
| version                      | integer(int64)    | 否   |      |
| updated_at                   | string(date-time) | 否   |      |
| children                     | array             | 否   |      |

#### IamRolePermissionTreeNodeResponse

| 字段     | 类型                              | 必填 | 描述 |
| -------- | --------------------------------- | ---- | ---- |
| resource | IamRolePermissionResourceResponse | 否   |      |
| children | array                             | 否   |      |

#### IamResourceCatalogResponse

| 字段                         | 类型              | 必填 | 描述 |
| ---------------------------- | ----------------- | ---- | ---- |
| id                           | integer(int64)    | 否   |      |
| app_id                       | integer(int64)    | 否   |      |
| parent_id                    | integer(int64)    | 否   |      |
| resource_code                | string            | 否   |      |
| resource_name                | string            | 否   |      |
| description                  | string            | 否   |      |
| resource_type                | string            | 否   |      |
| route_path                   | string            | 否   |      |
| component                    | string            | 否   |      |
| permission_code              | string            | 否   |      |
| icon                         | string            | 否   |      |
| http_method                  | string            | 否   |      |
| api_path                     | string            | 否   |      |
| data_domain_code             | string            | 否   |      |
| requires_data_permission     | boolean           | 否   |      |
| is_configuration_valid       | boolean           | 否   |      |
| configuration_invalid_reason | string            | 否   |      |
| is_visible                   | boolean           | 否   |      |
| is_protected                 | boolean           | 否   |      |
| is_assignable                | boolean           | 否   |      |
| is_tenant_admin_fixed        | boolean           | 否   |      |
| sort_order                   | integer(int32)    | 否   |      |
| status                       | string            | 否   |      |
| is_currently_effective       | boolean           | 否   |      |
| invalid_reason               | string            | 否   |      |
| can_maintain                 | boolean           | 否   |      |
| version                      | integer(int64)    | 否   |      |
| updated_at                   | string(date-time) | 否   |      |
| children                     | array             | 否   |      |

## 59. 更新自定义角色展示信息。

接口名称：更新自定义角色展示信息。
接口描述：更新自定义角色展示信息。
请求方式：`POST`
请求路径：`/iam-admin/RolePermission/UpdateRole`

### 入参 Schema

JSON Body：

#### IamCustomRoleUpdateRequest

| 字段        | 类型           | 必填 | 描述 |
| ----------- | -------------- | ---- | ---- |
| id          | integer(int64) | 否   |      |
| version     | integer(int64) | 否   |      |
| tenant_id   | integer(int64) | 否   |      |
| role_type   | string         | 否   |      |
| status      | string         | 否   |      |
| role_name   | string         | 否   |      |
| description | string         | 否   |      |
| remarks     | string         | 否   |      |
| sort_order  | integer(int32) | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型                  | 必填 | 描述 |
| ---------- | --------------------- | ---- | ---- |
| data       | IamRoleDetailResponse | 否   |      |
| is_success | boolean               | 否   |      |
| status     | string                | 否   |      |
| message    | string                | 否   |      |
| code       | integer(int32)        | 否   |      |

#### IamRoleDetailResponse

| 字段                   | 类型              | 必填 | 描述 |
| ---------------------- | ----------------- | ---- | ---- |
| id                     | integer(int64)    | 否   |      |
| tenant_id              | integer(int64)    | 否   |      |
| tenant_code            | string            | 否   |      |
| role_code              | string            | 否   |      |
| role_name              | string            | 否   |      |
| role_type              | string            | 否   |      |
| sort_order             | integer(int32)    | 否   |      |
| status                 | string            | 否   |      |
| description            | string            | 否   |      |
| remarks                | string            | 否   |      |
| is_currently_effective | boolean           | 否   |      |
| is_group_controlled    | boolean           | 否   |      |
| can_maintain           | boolean           | 否   |      |
| version                | integer(int64)    | 否   |      |
| created_at             | string(date-time) | 否   |      |
| updated_at             | string(date-time) | 否   |      |

## 60. 启用或停用租户。

接口名称：启用或停用租户。
接口描述：启用或停用租户。
请求方式：`POST`
请求路径：`/iam-admin/Tenant/ChangeStatus`

### 入参 Schema

JSON Body：

#### IamStatusChangeRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| target_status | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamActionResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamActionResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| succeeded  | boolean        | 否   |      |
| idempotent | boolean        | 否   |      |
| version    | integer(int64) | 否   |      |
| message    | string         | 否   |      |

## 61. 创建租户并设置首名管理员。

接口名称：创建租户并设置首名管理员。
接口描述：创建租户并设置首名管理员。
请求方式：`POST`
请求路径：`/iam-admin/Tenant/Create`

### 入参 Schema

JSON Body：

#### IamTenantCreateRequest

| 字段          | 类型                         | 必填 | 描述 |
| ------------- | ---------------------------- | ---- | ---- |
| tenant_name   | string                       | 否   |      |
| tenant_type   | string                       | 否   |      |
| company_name  | string                       | 否   |      |
| contact_name  | string                       | 否   |      |
| contact_phone | string                       | 否   |      |
| contact_email | string                       | 否   |      |
| address       | string                       | 否   |      |
| domain        | string                       | 否   |      |
| subdomain     | string                       | 否   |      |
| logo_url      | string                       | 否   |      |
| timezone      | string                       | 否   |      |
| language      | string                       | 否   |      |
| sort_order    | integer(int32)               | 否   |      |
| remarks       | string                       | 否   |      |
| initial_admin | IamTenantMemberCreateRequest | 否   |      |

#### IamTenantMemberCreateRequest

| 字段               | 类型              | 必填 | 描述 |
| ------------------ | ----------------- | ---- | ---- |
| tenant_id          | integer(int64)    | 否   |      |
| use_existing_user  | boolean           | 否   |      |
| existing_user_name | string            | 否   |      |
| new_user           | IamNewUserRequest | 否   |      |
| user_type          | string            | 否   |      |
| effective_start    | string(date-time) | 否   |      |
| effective_end      | string(date-time) | 否   |      |
| is_tenant_admin    | boolean           | 否   |      |
| remarks            | string            | 否   |      |
| organizations      | array             | 否   |      |
| positions          | array             | 否   |      |

#### IamNewUserRequest

| 字段       | 类型   | 必填 | 描述 |
| ---------- | ------ | ---- | ---- |
| user_name  | string | 否   |      |
| real_name  | string | 否   |      |
| nick_name  | string | 否   |      |
| phone      | string | 否   |      |
| email      | string | 否   |      |
| avatar_url | string | 否   |      |
| user_type  | string | 否   |      |
| password   | string | 否   |      |

#### IamInitialOrganizationAssignmentRequest

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| org_id     | integer(int64) | 否   |      |
| is_primary | boolean        | 否   |      |

#### IamInitialPositionAssignmentRequest

| 字段        | 类型           | 必填 | 描述 |
| ----------- | -------------- | ---- | ---- |
| position_id | integer(int64) | 否   |      |
| is_primary  | boolean        | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamTenantResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamTenantResponse

| 字段           | 类型              | 必填 | 描述 |
| -------------- | ----------------- | ---- | ---- |
| group_id       | integer(int64)    | 否   |      |
| id             | integer(int64)    | 否   |      |
| tenant_code    | string            | 否   |      |
| tenant_name    | string            | 否   |      |
| tenant_type    | string            | 否   |      |
| status         | string            | 否   |      |
| company_name   | string            | 否   |      |
| address        | string            | 否   |      |
| contact_name   | string            | 否   |      |
| contact_phone  | string            | 否   |      |
| contact_email  | string            | 否   |      |
| domain         | string            | 否   |      |
| subdomain      | string            | 否   |      |
| logo_url       | string            | 否   |      |
| timezone       | string            | 否   |      |
| language       | string            | 否   |      |
| sort_order     | integer(int32)    | 否   |      |
| version        | integer(int64)    | 否   |      |
| isolation_mode | string            | 否   |      |
| db_key         | string            | 否   |      |
| schema_name    | string            | 否   |      |
| remarks        | string            | 否   |      |
| created_at     | string(date-time) | 否   |      |
| updated_at     | string(date-time) | 否   |      |
| created_by     | string            | 否   |      |
| updated_by     | string            | 否   |      |

## 62. 查询租户。

接口名称：查询租户。
接口描述：查询租户。
请求方式：`POST`
请求路径：`/iam-admin/Tenant/Query`

### 入参 Schema

JSON Body：

#### IamTenantListRequest

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| id         | integer(int64) | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| keyword    | string         | 否   |      |
| status     | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型             | 必填 | 描述 |
| ---------- | ---------------- | ---- | ---- |
| data       | IamPagedResponse | 否   |      |
| is_success | boolean          | 否   |      |
| status     | string           | 否   |      |
| message    | string           | 否   |      |
| code       | integer(int32)   | 否   |      |

#### IamPagedResponse

| 字段       | 类型           | 必填 | 描述 |
| ---------- | -------------- | ---- | ---- |
| total      | integer(int64) | 否   |      |
| page_index | integer(int32) | 否   |      |
| page_size  | integer(int32) | 否   |      |
| items      | array          | 否   |      |

#### IamTenantResponse

| 字段           | 类型              | 必填 | 描述 |
| -------------- | ----------------- | ---- | ---- |
| group_id       | integer(int64)    | 否   |      |
| id             | integer(int64)    | 否   |      |
| tenant_code    | string            | 否   |      |
| tenant_name    | string            | 否   |      |
| tenant_type    | string            | 否   |      |
| status         | string            | 否   |      |
| company_name   | string            | 否   |      |
| address        | string            | 否   |      |
| contact_name   | string            | 否   |      |
| contact_phone  | string            | 否   |      |
| contact_email  | string            | 否   |      |
| domain         | string            | 否   |      |
| subdomain      | string            | 否   |      |
| logo_url       | string            | 否   |      |
| timezone       | string            | 否   |      |
| language       | string            | 否   |      |
| sort_order     | integer(int32)    | 否   |      |
| version        | integer(int64)    | 否   |      |
| isolation_mode | string            | 否   |      |
| db_key         | string            | 否   |      |
| schema_name    | string            | 否   |      |
| remarks        | string            | 否   |      |
| created_at     | string(date-time) | 否   |      |
| updated_at     | string(date-time) | 否   |      |
| created_by     | string            | 否   |      |
| updated_by     | string            | 否   |      |

## 63. 更新租户信息。

接口名称：更新租户信息。
接口描述：更新租户信息。
请求方式：`POST`
请求路径：`/iam-admin/Tenant/Update`

### 入参 Schema

JSON Body：

#### IamTenantUpdateRequest

| 字段          | 类型           | 必填 | 描述 |
| ------------- | -------------- | ---- | ---- |
| id            | integer(int64) | 否   |      |
| version       | integer(int64) | 否   |      |
| group_id      | integer(int64) | 否   |      |
| tenant_name   | string         | 否   |      |
| tenant_type   | string         | 否   |      |
| company_name  | string         | 否   |      |
| contact_name  | string         | 否   |      |
| contact_phone | string         | 否   |      |
| contact_email | string         | 否   |      |
| address       | string         | 否   |      |
| domain        | string         | 否   |      |
| subdomain     | string         | 否   |      |
| logo_url      | string         | 否   |      |
| timezone      | string         | 否   |      |
| language      | string         | 否   |      |
| sort_order    | integer(int32) | 否   |      |
| remarks       | string         | 否   |      |

### 出参 Schema

HTTP 状态码：`200`

#### SuccessResponse

| 字段       | 类型              | 必填 | 描述 |
| ---------- | ----------------- | ---- | ---- |
| data       | IamTenantResponse | 否   |      |
| is_success | boolean           | 否   |      |
| status     | string            | 否   |      |
| message    | string            | 否   |      |
| code       | integer(int32)    | 否   |      |

#### IamTenantResponse

| 字段           | 类型              | 必填 | 描述 |
| -------------- | ----------------- | ---- | ---- |
| group_id       | integer(int64)    | 否   |      |
| id             | integer(int64)    | 否   |      |
| tenant_code    | string            | 否   |      |
| tenant_name    | string            | 否   |      |
| tenant_type    | string            | 否   |      |
| status         | string            | 否   |      |
| company_name   | string            | 否   |      |
| address        | string            | 否   |      |
| contact_name   | string            | 否   |      |
| contact_phone  | string            | 否   |      |
| contact_email  | string            | 否   |      |
| domain         | string            | 否   |      |
| subdomain      | string            | 否   |      |
| logo_url       | string            | 否   |      |
| timezone       | string            | 否   |      |
| language       | string            | 否   |      |
| sort_order     | integer(int32)    | 否   |      |
| version        | integer(int64)    | 否   |      |
| isolation_mode | string            | 否   |      |
| db_key         | string            | 否   |      |
| schema_name    | string            | 否   |      |
| remarks        | string            | 否   |      |
| created_at     | string(date-time) | 否   |      |
| updated_at     | string(date-time) | 否   |      |
| created_by     | string            | 否   |      |
| updated_by     | string            | 否   |      |
