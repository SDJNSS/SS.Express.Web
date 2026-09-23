# IAM 资源树搜索——后端配合说明

## 1. 目标

以下三个生产页面新增资源树关键词搜索，并支持用 API Path 的任意片段、不区分大小写地定位资源：

| 页面                                        | 数据接口                                                    |
| ------------------------------------------- | ----------------------------------------------------------- |
| `/iam/application-resources`                | `POST /iam-admin/Permission/SystemResources`                |
| `/iam/roles/function-permissions`           | `POST /iam-admin/RolePermission/QueryFunctionPermissions`   |
| `/iam/members/permissions` 的 Function 页签 | `POST /iam-admin/Permission/QueryMemberFunctionPermissions` |

示例：输入 `QueryDataPermissions` 必须能定位 `api_path = /iam-admin/RolePermission/QueryDataPermissions` 的资源。

## 2. 已确定的实现边界

- 搜索由前端在已加载的完整树上执行，不新增搜索接口，也不为上述接口增加 `keyword`。
- 匹配规则为 `trim` 后、不区分大小写的子串匹配。
- 匹配字段包括 `resource_name`、`resource_code`、`permission_code`、`route_path`、`http_method`、`api_path`。
- 前端保留命中节点的完整祖先链；搜索不改变角色的 `direct_resource_ids`、成员的 `effective_resource_ids` 或保存集合。
- 不采用服务端裁剪树。角色功能权限保存是全量替换；裁剪会使父级批量选择和未显示授权存在误删风险。

## 3. 后端必须修改

### 3.1 `QueryFunctionPermissions`

`POST /iam-admin/RolePermission/QueryFunctionPermissions`

现状审计：统一资源 DTO 和树构造器具备 `api_path`，但非 SA 调用时绑定字段会因 `includeBinding = IsSA` 被清空。

要求：

1. 调用者通过现有页面/接口授权后，`resource_tree[].resource.http_method` 与 `resource_tree[].resource.api_path` 必须原样返回，不再以 `IsSA` 作为是否返回绑定字段的条件。
2. `can_maintain`、可编辑范围和接口授权继续沿用现有规则；本次不得扩大写权限。
3. 请求体保持 `{ role_id }`，响应树结构保持不变。

### 3.2 `QueryMemberFunctionPermissions`

`POST /iam-admin/Permission/QueryMemberFunctionPermissions`

现状审计：该页面按需求允许普通有权管理员访问，但当前同样以 `includeBinding = IsSA` 清空非 SA 响应中的 API 绑定字段。

要求：

1. 调用者通过现有接口授权后，稳定返回 `resource_tree[].resource.http_method` 和 `resource_tree[].resource.api_path`。
2. 不得要求 SA；未授权调用仍由现有授权机制返回 403。
3. 请求体保持 `{ tenant_user_id }`，响应继续使用完整 `IamFunctionPermissionTreeResponse`。

### 3.3 `SaveFunctionPermissions` 响应一致性

`POST /iam-admin/RolePermission/SaveFunctionPermissions`

该接口返回与查询相同的 `IamFunctionPermissionTreeResponse`。保存成功后的响应也必须遵循相同字段契约，避免页面刷新前后 API Path 消失。保存请求和授权逻辑不变。

## 4. 无需修改协议的接口

### `SystemResources`

`POST /iam-admin/Permission/SystemResources`

该接口已经是 SA 完整目录数据源，现有 DTO 与映射能够返回 `api_path`，无需新增参数或新接口。请补充回归测试，确保 `children`、`menus`、`pages`、`functions` 等所有资源集合中的节点都满足字段契约。

### `QueryDataPermissions`

`/iam-admin/RolePermission/QueryDataPermissions` 是本次可能被搜索到的资源数据，不是需要改造的搜索接口。

### `CurrentFunctions`

运行时授权查询不用于上述管理树搜索，其现有脱敏规则保持不变。

## 5. 统一响应字段契约

三个完整树数据源中的每个资源节点应满足：

```json
{
  "id": 1001,
  "resource_name": "查询角色数据权限",
  "resource_code": "IAM.ROLE.DATA_PERMISSION.QUERY",
  "permission_code": "iam:roles:data-permissions:view",
  "http_method": "POST",
  "api_path": "/iam-admin/RolePermission/QueryDataPermissions"
}
```

- `api_path`、`http_method` 始终序列化为字符串。
- 无接口绑定的 Module/Menu/Page 返回空字符串 `""`，不要省略字段或返回 `null`。
- Function 返回数据库保存的完整原始路径，不做大小写转换、截断或路径改写。
- 保持现有 Tenant、角色、资源可见性和授权边界；搜索不能成为越权读取资源的入口。

## 6. 后端验收用例

1. 非 SA、但具备角色功能权限页面查询权限的管理员调用 `QueryFunctionPermissions`，目标 Function 的 `api_path` 完整返回。
2. 非 SA、但具备用户角色与权限页面查询权限的管理员调用 `QueryMemberFunctionPermissions`，目标 Function 的 `api_path` 完整返回。
3. 未授权用户调用上述接口仍返回 403。
4. `SaveFunctionPermissions` 成功响应与重新查询响应的 `http_method`、`api_path` 一致。
5. `SystemResources` 对嵌套 Page/Function 返回完整 `api_path`。
6. 测试数据包含 `/iam-admin/RolePermission/QueryDataPermissions`，供前端验证 `QueryDataPermissions`、`querydatapermissions` 和路径中间片段均可命中。

## 7. 完成定义

- 不新增接口，不修改请求体。
- 修复两个查询接口及保存响应的绑定字段返回策略。
- 补齐后端自动化测试并提供三个接口的实际响应样例。
- 前后端联调时用非 SA 管理员和 SA 各验证一次，确认搜索可用且权限边界未扩大。
