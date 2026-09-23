# IAM 用户租户归属管理契约

本文件记录 `/iam/members` 用户详情中“跨 Tenant 成员关系”的前后端协同契约。

## 查询完整快照

- 请求：`POST /iam-admin/Membership/QueryUserTenants`
- 入参：`{ "user_id": int64 }`
- 出参：`{ user_id, user_version, memberships }`
- `memberships` 复用用户成员关系字段，并包含：
  - `member_version: string`
  - `membership_is_currently_effective: boolean`（仅按成员状态与有效期计算）
  - `tenant_status`
  - `tenant_is_deleted`

打开“编辑用户租户归属”时必须重新查询本接口，列表查询结果不能作为并发更新快照。

## 保存显式变更

- 请求：`POST /iam-admin/Membership/UpdateUserTenants`
- 入参：

```json
{
  "user_id": 1001,
  "user_version": "63924670932147368",
  "original_memberships": [{ "tenant_user_id": 301, "member_version": "63924670932147369" }],
  "tenants": [{ "tenant_id": 7, "is_tenant_admin": false, "restore": false }],
  "remove_tenant_user_ids": [],
  "request_id": "client-generated-request-id"
}
```

规则：

- `original_memberships` 是查询接口返回的完整并发快照。
- `tenants` 是显式新增、管理员身份调整或恢复项，不是完整替换集合。
- 历史无效关系只有 `restore: true` 才恢复；遗漏时保持原状。
- 当前/历史分组与恢复资格使用 `membership_is_currently_effective`，不得使用包含全局用户和
  Tenant 状态的综合 `is_currently_effective` 替代。
- 只有 `remove_tenant_user_ids` 中的关系才正式移除；遗漏时保持原状。
- `user_version`、`member_version` 在 JSON 中均按字符串处理。
- 同一未确认结果的精确重试复用 `request_id`；变更内容改变时使用新的 `request_id`。

## 候选 Tenant

候选 Tenant 使用 `POST /iam-admin/Tenant/Query` 的完整分页结果，不使用登录会话的
`available_tenants` 充当管理全集。只有启用且未删除的 Tenant 可新增；历史关系的恢复资格由
快照中的 Tenant 状态和服务端最终校验共同决定。

## 权限与交互

- 编辑权限：`iam:members:update-user-tenants`，仅 SA 分配。
- 无权限用户只读查看，不显示编辑入口。
- 恢复、正式移除和管理员身份变化必须经过应用内复核对话框。
- 保存采用 pessimistic 策略；失败保留草稿，冲突时重新加载完整快照后再处理。
