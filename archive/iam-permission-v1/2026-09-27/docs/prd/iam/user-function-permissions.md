# IAM 用户功能权限（受控需求）

> 来源：用户在 2026-09-14 当前任务中的明确要求，以及同次提供的最新版 `iam-api-documentation.md`。原始附件只作为需求证据；本文件是该页面进入 Page Contract 的项目内受控来源。

## 页面目标

在“用户与成员”Menu 下提供独立的隐藏 Page，统一承载“当前 Tenant 角色关系维护”与“当前 Tenant 成员 Function 权限核查”。角色页签允许具备权限的管理员分配或撤销角色；Function 页签只读展示选定 Tenant 成员通过当前有效角色获得的功能权限，不提供用户直授权或任何 Function 保存能力。

角色功能权限与用户功能权限是两个独立 Page：

- 角色功能权限页服务于角色管理，可在具备保存 Function 时维护角色的直接资源集合。
- 用户角色与权限页服务于用户管理；角色关系和 Function 结果均以当前 Tenant 成员为边界，Function 结果固定只读，只展示服务端计算后的有效权限及来源角色。

两页可以复用同一个无路由依赖的权限树组件，但各自拥有独立的页面装配、Page Contract、权限资源和后端查询接口。

## 用户与权限边界

- 页面路由使用全局 `user_id + tenant_id`；通过 `QueryUserTenants(user_id)` 在内部解析选定 Tenant 对应的 `tenant_user_id` 与 `member_version`，不得将 `tenant_user_id` 暴露为全局用户业务主键。
- Function 查询以解析出的 `tenant_user_id` 为入参，只返回所选 Tenant 成员的有效角色权限。
- 页面供获得对应 Page/Function 权限的管理员使用，不以 SA 作为前端或接口的额外先决条件。
- 服务端仍是授权边界；直接访问无权路由或接口时必须按统一 403 流程处理。
- 用户不能被直接授予功能权限。Function 页签不得出现勾选、取消更改或保存；角色页签可出现角色分配与撤销，二者不得混淆。

## 接口契约

查询调用：

```text
POST /iam-admin/Permission/QueryMemberFunctionPermissions
```

请求体：

```json
{
  "tenant_user_id": 1
}
```

`tenant_user_id` 为必填正整数。响应使用统一 `IamFunctionPermissionTreeResponse`：

- `subject`：当前 Tenant 成员编码、名称、有效性、异常原因和成员版本；
- `roles`：当前 Tenant 成员的权限来源角色；
- `effective_resource_ids`：当前 Tenant 成员的有效权限资源 ID；
- `resource_tree`：App 下的 Module、Menu、Page、Function 完整树；
- 资源节点的 `source_roles`：该资源在当前 Tenant 中的来源角色。

页面只消费服务端返回的有效集合，不从 `direct_resource_ids` 推导用户直授权，也不在前端按父子关系扩展权限。

## 页面结构

- 页头：标题“用户角色与权限”，提供返回用户列表和刷新操作。
- 用户上下文：展示成员名称、成员编码、所选 Tenant 和当前有效性。
- 角色页签：选择用户所属的有效 Tenant，展示该成员的直接角色，并提供受权限控制的分配与撤销入口。
- 来源摘要：展示当前 Tenant 内的有效来源角色数量。
- App 分组：沿用角色功能权限页的系统分组和资源树工作区。
- 权限树：展示 Module、Menu、Page、Function 层级；树节点只展示完整资源名称，允许换行且不得以资源编码或状态标签挤占名称空间；所有选择控件固定只读。
- 权限树搜索：在当前 App 范围内按资源名称、资源编码、权限标识、路由地址、请求方法和 API Path 做不区分大小写的模糊包含匹配，并保留命中节点祖先。搜索和清空都不改变服务端有效权限集合或只读状态。
- 资源详情：展示资源编码、权限标识、接口路径、类型、有效性、异常原因、备注和 `tenant_code + role_name` 来源。

## 状态与交互

- Loading：保持工作区几何稳定，不展示旧用户的权限结果。
- Ready：展示用户上下文、有效权限树和可追溯来源。
- Empty：明确说明该用户当前未通过有效角色获得功能权限。
- RetryableError：清空目标用户的旧结果，展示失败信息和重新加载入口。
- ReadOnly：Function 结果始终只读可观察，不以禁用但可被绕过的保存控件冒充授权能力；角色变更采用悲观提交并在成功后刷新。
- 切换 App 只切换当前展示分组；点击资源名称只选择详情，不改变树节点展开状态；展开/收起仅由节点箭头控制。
- 搜索无结果时保留关键词并提供清空入口；清空后恢复原树、展开状态和滚动位置。

## 生产集成

用户已批准原只读 Function Candidate。本次范围调整后，沿用同一隐藏路由 `/iam/members/permissions`，更新 Canonical Page View、Fixture、Page Contract 与生产绑定；既有 Approval Record 和长期基线不得由 Agent 自动覆盖，页面重新进入 `reviewing` 等待人工复核。
