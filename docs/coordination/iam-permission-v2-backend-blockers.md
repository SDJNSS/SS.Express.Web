# IAM Permission V2 前后端联调结论与部署基线

> 状态：代码契约已闭环，待部署初始化与真实环境联调  
> 审计日期：2026-09-27  
> 最新接口附件：`C:\Users\75946\Downloads\iam-api-documentation (1).md`  
> 附件 SHA-256：`70446D8CAE6FCEE0D6C0B6C6ADE33F35827070081D4C7630751A028694987C4D`

## 1. 范围与结论

本文仅覆盖以下七个已批准页面的后端联调阻断：

- `iam-system-resource-catalog`
- `iam-permission-scheme-management`
- `iam-permission-scheme-resources`
- `iam-permission-package-management`
- `iam-permission-package-permissions`
- `iam-role-authorization`
- `iam-user-effective-permissions`

本文依据上述附件、当前后端 Controller/Contract 与前端正式实现整理。附件未导出的 FunctionResource 码以当前后端源码为准，不引用旧接口文档推断。

截至 2026-09-27，原 P0/P1 契约阻断已在代码中关闭：服务端生成 Permission/Package 编码；SaveTree 使用“一个前端资源 + 至少一个后端 Function”的语义请求；用户有效权限在单一授权快照中返回完整来源链；Permission/Package Query 支持可选 `include_details` 批量展开；VersionToken、幂等请求号和 V2 Function 目录均已固化。七页已经建立正式 Production Binding。

尚未替代部署动作：应用 DDL、部署 V3 前端资源目录与后端 Function 目录、执行 `InitSystemResource`、为角色分配相应权限包，并在真实数据库上完成联调。

## 2. 已完成的后端修改（历史问题闭环记录）

### P0-1 注册 V2 FunctionResource，并明确页面资源码

当前 Controller 已声明 V2 FunctionResource，但前后端 `iam-resource-catalog.json` 均未发现对应注册项；七个页面的页面/按钮权限码也尚未定稿。

后端需要：

1. 将第 4 节全部 FunctionResource 码注册到正式资源目录。
2. 为七个页面分别确定 Page、Button、ButtonPage 资源码及父子关系。
3. 明确页面资源码、API FunctionResource 码和业务字段 `permission_code` 是三类不同标识，不得互相替代。

建议验收响应沿用资源目录 DTO，并至少返回：

```json
{
  "resource_code": "IAM.PERMISSION_SCHEME.QUERY",
  "source": "backend",
  "resource_type": "function",
  "http_method": "POST",
  "api_path": "/iam-admin/PermissionScheme/Query",
  "function_access_mode": "read",
  "status": "active"
}
```

### P0-2 Permission、Permission Package 编码必须由服务端生成

批准页面没有编码输入，并明确展示“创建后由系统生成”；当前后端运行时却要求 `permission_code`、`package_code` 非空。前端不得自行拼接稳定业务编码。

建议调整以下接口：

- `/iam-admin/PermissionScheme/Create`
- `/iam-admin/PermissionScheme/Copy`
- `/iam-admin/PermissionPackage/Create`
- `/iam-admin/PermissionPackage/Copy`
- `/iam-admin/RolePermissionScheme/CreateDedicated`

建议请求不再要求编码字段：

```json
{
  "tenant_id": 1,
  "app_id": 10,
  "permission_name": "运单只读",
  "description": "...",
  "sort_order": 100,
  "status": "inactive",
  "remarks": "..."
}
```

建议响应必须返回服务端生成的编码和字符串版本令牌：

```json
{
  "id": 1001,
  "permission_code": "PERM-...",
  "permission_name": "运单只读",
  "status": "inactive",
  "version": "638945123456789012"
}
```

复制接口仍应提交 `source_permission_id/source_version` 或 `source_package_id/source_version`，但新对象编码由服务端生成。

### P0-3 统一 Permission 资源树语义和校验

批准页面约束为“一项前端资源 + 至少一个 Function”；当前后端允许空树、多前端根，并要求选择 Button/ButtonPage 时同时提交所属父节点，语义冲突。

后端需在下列方案中确定一种并固化 Contract：

1. 保留树入参，但明确唯一业务根，父链仅作结构节点，不计入“前端资源数量”；或
2. 提供语义化保存入参，由后端构建父链。

推荐第二种：

```json
{
  "permission_id": 1001,
  "tenant_id": 1,
  "version": "638945123456789012",
  "frontend_resource_id": 2001,
  "function_resources": [
    { "resource_id": 3001, "sort_order": 10, "status": "active", "remarks": "" }
  ]
}
```

响应应继续返回完整 `IamPermissionSchemeResponse.resource_tree` 及新 `version`。后端必须拒绝空 Function、多个业务前端根、跨 App 资源和不允许的 read/write 组合。

### P0-4 用户有效权限必须提供同一快照内的完整来源链

`/iam-admin/CurrentPermissionResource/QueryUserPermissions` 当前只返回角色中的 Package/Permission ID 和最终资源，不能满足批准页面的“角色 → 权限包 → Permission → Resource”展示。前端 N+1 无法保证结果与 `authorization_version` 属于同一快照。

现有请求可保持：

```json
{ "tenant_id": 1, "user_id": 100 }
```

建议在同一响应中补充：

```json
{
  "tenant_id": 1,
  "user_id": 100,
  "roles": [],
  "permission_packages": [],
  "permissions": [],
  "effective_resources": [],
  "effective_resource_tree": [],
  "authorization_version": "638945123456789012"
}
```

`permission_packages`、`permissions` 应使用与 Role Permission Scheme 相同的完整 DTO，并保留每项来源 ID。

### P1-1 补齐资源检索和父节点摘要

`PermissionResource/Query.keyword` 当前只匹配 `resource_code/resource_name`，配置页无法按 API path 搜索 Function；分页响应也没有父节点摘要。

建议请求增加显式字段：

```json
{
  "app_id": 10,
  "keyword": "CreateOrder",
  "api_path": "/api/orders",
  "http_method": "POST",
  "resource_type": "function",
  "page_index": 1,
  "page_size": 20
}
```

建议列表项增加：

```json
{
  "parent": { "id": 20, "resource_code": "...", "resource_name": "运单管理" },
  "app": { "id": 10, "app_code": "TMS", "app_name": "运输管理" }
}
```

### P1-2 为列表提供摘要，消除强制 N+1

当前 `PermissionScheme/Query` 的 `resource_tree` 实际恒为空，`PermissionPackage/Query` 的 `permissions` 实际恒为空，但文档复用了详情 DTO，容易误接。

建议分别增加稳定摘要：

```json
// PermissionScheme/Query item
{
  "frontend_resource_count": 1,
  "function_resource_count": 4,
  "frontend_resource": { "id": 2001, "resource_code": "...", "resource_name": "..." }
}

// PermissionPackage/Query item
{
  "permission_count": 6,
  "active_permission_count": 6,
  "active_role_count": 3
}
```

列表接口应明确不返回完整嵌套树，完整数据仅由 Get 返回。

### P1-3 修正文档中的必填项、枚举和 VersionToken

最新附件几乎把所有字段标为非必填，并把版本标成 `integer(int64)`；运行时实际强制 tenant、id、code、version 等字段，且 `IamVersionJsonConverter` 将版本写为 JSON string。

后端 OpenAPI/导出文档必须统一为：

- `version`、`source_version`、`role_version`、`authorization_version`：不透明字符串。
- `status`：`active | inactive`。
- `source`：`frontend | backend`。
- `resource_type`：`module | menu | button | button_page | function`。
- `function_access_mode`：`read | write`。

### P1-4 关键写接口已实现未知结果安全恢复

`PermissionScheme` 和 `PermissionPackage` 的 Create/Update/Copy，以及 `SaveTree`、`SavePermissions`、Role `Save` 均已固化 `request_id`。同一 `request_id` 与相同载荷可安全重放并返回同一结果；同一 `request_id` 用于不同载荷会被服务端拒绝。前端在超时或结果未知时保留原请求号，只允许用原请求号显式重试或刷新核对。

请求公共字段：

```json
{
  "request_id": "01K...",
  "version": "638945123456789012"
}
```

响应公共字段：

```json
{
  "request_id": "01K...",
  "idempotent": false,
  "version": "638945123456789013"
}
```

## 3. 历史过渡方案（当前正式实现不再使用）

以下是早期评估过的联调过渡方案。当前后端已提供 `include_details`、单一授权快照和幂等写入契约，七个正式页不再使用这些 N+1 聚合方案：

| 页面需求                          | 过渡方案                                                                 | 限制                                       |
| --------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------ |
| App code/name                     | `/CurrentPermissionResource/CurrentApps` 建立 `app_id` 映射              | 仅返回当前操作者可访问 App                 |
| Resource 父节点名称               | 对 distinct `parent_id` 调 `/PermissionResource/Get`                     | 当前页 N+1；需缓存和限流                   |
| Permission 的入口与 Function 数   | 当前页逐项 `/PermissionScheme/Get`                                       | Query 本身不展开资源树                     |
| Package 的 Permission 数          | 当前页逐项 `/PermissionPackage/Get`                                      | Query 本身不展开 Permissions               |
| Package 绑定角色明细              | `/PermissionPackage/Impact`                                              | 仅用于展示影响，不代替授权保存             |
| Role 授权候选包                   | `/PermissionPackage/Query`，所需项再 Get                                 | Role Query 只返回已绑定包                  |
| User Effective 包/Permission 名称 | 按角色调用 `/CurrentPermissionResource/QueryRolePermissions`，或按包 Get | 非原子快照，仅可临时使用                   |
| 状态、资源类型大小写              | adapter 映射后端小写枚举与当前 UI 枚举                                   | 出站必须使用后端小写值                     |
| Package 保存 ref 元数据           | 从 Package Get 保留 `sort_order/status/remarks` 后完整提交               | `SavePermissions` 是目标全量状态，不是增量 |

前端正式页已使用实际异步保存回调，并在提交前展示变更摘要与版本确认。

## 4. 精确 FunctionResource 码

### PermissionResource

```text
IAM.PERMISSION_RESOURCE.QUERY
IAM.PERMISSION_RESOURCE.GET
IAM.PERMISSION_RESOURCE.CREATE
IAM.PERMISSION_RESOURCE.UPDATE
IAM.PERMISSION_RESOURCE.STATUS
IAM.PERMISSION_RESOURCE.IMPACT
IAM.PERMISSION_RESOURCE.DELETE
```

### PermissionScheme

```text
IAM.PERMISSION_SCHEME.QUERY
IAM.PERMISSION_SCHEME.GET
IAM.PERMISSION_SCHEME.CREATE
IAM.PERMISSION_SCHEME.UPDATE
IAM.PERMISSION_SCHEME.STATUS
IAM.PERMISSION_SCHEME.SAVE_TREE
IAM.PERMISSION_SCHEME.COPY
IAM.PERMISSION_SCHEME.IMPACT
IAM.PERMISSION_SCHEME.DELETE
```

### PermissionPackage

```text
IAM.PERMISSION_PACKAGE.QUERY
IAM.PERMISSION_PACKAGE.GET
IAM.PERMISSION_PACKAGE.CREATE
IAM.PERMISSION_PACKAGE.UPDATE
IAM.PERMISSION_PACKAGE.STATUS
IAM.PERMISSION_PACKAGE.SAVE_PERMISSIONS
IAM.PERMISSION_PACKAGE.COPY
IAM.PERMISSION_PACKAGE.IMPACT
IAM.PERMISSION_PACKAGE.DELETE
```

### RolePermissionScheme

```text
IAM.ROLE_PERMISSION_SCHEME.QUERY
IAM.ROLE_PERMISSION_SCHEME.SAVE
IAM.ROLE_PERMISSION_SCHEME.CREATE_DEDICATED
```

### CurrentPermissionResource

```text
IAM.CURRENT_PERMISSION.APPS
IAM.CURRENT_PERMISSION.APP_MENUS
IAM.CURRENT_PERMISSION.PAGE_RESOURCES
IAM.PERMISSION_SCHEME.ROLE_RESULT
IAM.PERMISSION_SCHEME.USER_RESULT
```

## 5. 验收条件

- 最新接口文档重新导出后，SHA 更新并由前后端共同确认；字段必填性、枚举和字符串 VersionToken 与运行时一致。
- 第 4 节所有 FunctionResource 均存在于正式资源目录，且可以通过初始化/同步流程重复执行而不产生重复记录。
- 七个页面的 Page、Button、ButtonPage 资源码及层级已定稿，并与 API FunctionResource、业务 `permission_code` 明确区分。
- Permission、Permission Package 创建和复制不依赖前端生成编码；响应始终返回服务端编码和新版本令牌。
- `SaveTree` 的唯一前端业务根、父链、Function 数量、跨 App 和 read/write 规则已文档化，并有成功与失败用例。
- Permission/Package Query 的“列表摘要”与 Get 的“完整详情”边界明确，列表页不再依赖无界 N+1。
- Role Save 使用 Query 返回的原始 `role_version`，冲突时返回可识别的并发错误；成功后返回新 `role_version`。
- User Effective 在单次响应中提供批准页面所需的完整来源链，且全部内容对应同一 `authorization_version`。
- 关键写接口具备幂等请求号或明确的未知结果核对流程，前端无需盲目重试。
- 七页完成正常、空态、无权限、版本冲突、超时未知、后端校验失败的联调验收后，才可解除 `backend-contract-pending`。
