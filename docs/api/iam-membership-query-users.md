# IAM 用户与成员统一查询契约

本文件记录 `/iam/members` 的用户确认契约。若自动导出的旧接口文档仍包含
`QueryMembers` 或 `tenant_id` 单值筛选，以本契约为该页面的接入依据，待后端重新导出
Swagger 文档后再同步通用 API 快照。

## QueryUsers 查询契约

- 请求：`POST /iam-admin/Membership/QueryUsers`
- 用途：统一查询用户及其 Tenant 成员关系；页面不再调用 `QueryMembers`。
- `tenant_ids` 类型为 `int64[]`，请求中必须显式携带。它可以是空数组，前端不得省略、
  自动替换为全部 Tenant 或阻止查询；空数组由后端校验并返回结果。
- 其余筛选字段：`user_id`、`user_name`、`real_name`、`phone`、`email`、`org_id`、
  `position_id`、`role_id`、`user_status`、`member_status`、`page_index`、`page_size`、`status`。
- `real_name` 按用户姓名模糊查询；`user_name`、`phone`、`email` 精确查询。
- 组织、岗位、角色按所选 Tenant 范围内的当前有效关联精确过滤；角色关联还要求
  `subject_type=user`、启用且处于有效期。查询用户不会因多个有效关联而重复返回同一成员行。
- `/iam/members` 不发送 `id`、`tenant_user_id` 或 `keyword`；详情身份由
  `user_id + tenant_ids` 指定。本条限制属于成员页及其生产 DTO，不代表服务端全局删除
  `keyword`：培训运营模块的 `queryTenantEmployees` 仍可使用兼容的 `keyword` 模糊查询，
  后端保留该字段的旧筛选语义，本轮不迁移该消费者。
- 不再发送单值 `tenant_id`，也不再通过“查询对象”字段切换 `QueryMembers` 与
  `QueryUsers`。

请求示例：

```json
{
  "tenant_ids": [1, 3],
  "page_index": 1,
  "page_size": 1000,
  "real_name": "张"
}
```

用户清空 Tenant 后仍提交：

```json
{
  "tenant_ids": [],
  "page_index": 1,
  "page_size": 1000
}
```

成功响应继续使用 `SuccessResponse<IamPagedResponse<IamUserQueryResponse>>`。分页对象包含
`total`、`page_index`、`page_size`、`items`；每个 `items` 元素包含：

- 用户与成员标识：`user_id`、`tenant_user_id`、`tenant_id`、`tenant_code`、
  `tenant_user_code`、`display_name`。
- 状态与版本：`user_status`、`member_status`、`user_version`、`member_version`、
  `is_tenant_admin`、`joined_at`、`left_at`、`is_member_currently_effective`。
- 详情：`user`、`organizations`、`positions`、`memberships`。

## 按需分页的筛选候选

- 请求：`POST /iam-admin/Membership/QueryFilterOptions`。
- 入参：`{ tenant_ids, kind, keyword?, page_index, page_size }`；
  `kind` 为 `organization`、`position` 或 `role`。
- 出参：标准分页结构 `{ total, page_index, page_size, items }`，每个选项包含
  `{ id, tenant_id, code, name }`。
- 只返回所选 Tenant 范围内启用、未删除的对象；复用 `iam:members:view` 的查询授权，
  不依赖 Organization、Position、Role 管理菜单权限。
- 三种下拉分别按需加载、服务端搜索和分页；不在页面进入时加载三类全量候选。
  跨 Tenant 同名对象显示所属租户；Tenant 范围变化后清空组织、岗位、角色选择并使旧请求失效。
- Tenant 多选为空时，候选立即清空，不请求候选接口；列表查询仍原样发送空数组供后端校验。
- 用户详情的组织/岗位归属选择可复用本接口，范围固定为目标成员的单一 Tenant。

## 详情与创建

- 点击详情时重新请求 `QueryUsers`，发送 `{ user_id, tenant_ids: [row.tenantId],
page_index: 1, page_size: 1 }`，不沿用列表的姓名、状态或关系筛选条件。
- 响应必须匹配目标 `user_id + tenant_id`；抽屉对旧响应做失效校验，失败显示重试入口。
  保存组织或岗位归属成功后重新查询该成员详情，不能只刷新背后的列表。
- `CreateMember` 与创建 Tenant 的 `initial_admin` 不发送 `tenant_user_code`、
  `display_name`，由服务端统一生成。已有成员的更新继续原值发送这两个只读字段，
  不重算历史编号和显示名称。

## Tenant 选项来源与默认行为

Tenant 查询多选不调用 `/Tenant/Query`，也不把登录时缓存的
`LoginResponse.available_tenants` 当成实时归属列表。页面首次进入或显式刷新 Tenant 上下文时，
调用现有 `QueryUsers`，使用当前会话的 `tenant_ids: [currentTenantId]`、
精确 `user_name: account`、`page_index: 1`、`page_size: 1` 查询当前登录用户。
列表的查询、重置和回车查询不得在业务查询前重复执行这次本人查询；每次用户查询动作只发送
一次携带当前筛选条件的业务 `QueryUsers` 请求。

仅匹配本人 `user_name`（会话有 `userId` 时同时匹配 `user_id`）的响应可提供租户选项。
从该用户 `memberships` 中取得 `is_currently_effective: true` 且未删除的本人租户关系，
按 `tenant_id` 去重；不从其他列表用户的成员关系补充选项。后端已按当前 Function 的
Tenant 可见范围裁剪 `memberships`：SA 可查看完整关系，其他用户只获得服务端授权范围。
前端再次剔除无效关系，但不自行扩大该范围。查询失败显示错误并允许重试，不静默回退到过期缓存。

这一只读刷新不调用 `SwitchTenant`，不修改登录 Token、当前 Tenant 或会话版本。
登录响应中的时区等元数据仍可用于已知租户的展示回退。

- 选项值使用数值 `tenant_id`，显示 `tenant_name · tenant_code`。
- 页面首次进入时默认选中最新租户选项的全部 `tenant_id`；重置查询使用已加载的全部租户选项，
  不额外刷新 Tenant 上下文。
- 首次默认值建立后立即触发一次业务 `QueryUsers`；本人查询与业务查询职责分离。
- 后续刷新原来为全选时自动包含新增归属；手工选择则保留仍有效的选项，显式清空保持空数组。
- 用户可清空全部选项；点击查询时必须原样提交 `tenant_ids: []`，由后端完成边界校验。
- 点击查询、点击重置或在查询表单回车时，均只允许触发一次业务 `QueryUsers`；请求参数必须来自
  该次动作提交后的查询条件，不得先发送本人查询或旧条件查询。
