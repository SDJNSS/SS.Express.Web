# IAM 用户与成员统一查询契约

本文件记录 `/iam/members` 的查询契约。当前租户范围遵循
`docs/coordination/iam-current-tenant-scope.md`。若自动导出的旧接口文档仍包含
`QueryMembers` 或单值 `tenant_id` 筛选，仍以此处的接口字段定义为页面接入依据。

## QueryUsers 查询契约

- 请求：`POST /iam-admin/Membership/QueryUsers`
- 用途：统一查询用户及其 Tenant 成员关系；页面不再调用 `QueryMembers`。
- `tenant_ids` 类型为 `int64[]`，请求中必须显式携带，且在本页面只能是
  `[currentTenantId]`。无有效当前租户时不发起租户业务请求；不得用空数组、`0`
  或多个租户 ID 表达全局查询。
- 其余筛选字段：`user_id`、`user_name`、`tenant_user_code`、`tenant_user_code_fuzzy`、`real_name`、`phone`、`email`、`org_id`、
  `position_id`、`role_id`、`user_status`、`member_status`、`page_index`、`page_size`、`status`。
- `real_name` 按用户姓名模糊查询；`user_name`、`phone`、`email` 精确查询。
- `tenant_user_code` 按成员编号查询，去除首尾空格；默认精确匹配。选择模糊匹配时
  发送 `tenant_user_code_fuzzy: true`，非空编号至少3个字符，使用包含匹配，不解释通配符。
  编号为空时不发送这两个字段，即使界面仍选模糊模式也不触发编号筛选。
- 组织、岗位、角色按当前 Tenant 范围内的当前有效关联精确过滤；角色关联还要求
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
  "tenant_ids": [3],
  "page_index": 1,
  "page_size": 1000,
  "real_name": "张"
}
```

成功响应继续使用 `SuccessResponse<IamPagedResponse<IamUserQueryResponse>>`。分页对象包含
`total`、`page_index`、`page_size`、`items`；每个 `items` 元素包含：

- 用户与成员标识：`user_id`、`tenant_user_id`、`tenant_id`、`tenant_code`、
  `tenant_user_code`、`display_name`。
- 状态与版本：`user_status`、`member_status`、`user_version`、`member_version`、
  `is_tenant_admin`、`joined_at`、`left_at`、`is_member_currently_effective`。
- 详情：`user`、`organizations`、`positions`、`memberships`。
- 角色：根级 `roles: string[]`，当前 Tenant 内直接分配且未撤销的角色名称，去重；
  包含已停用或尚未生效的分配，不代表实际有效权限。无角色时返回 `[]`。
  前端角色列直接展示该数组，空数组或部署过渡期字段缺省时显示 `—`，不逐成员查询角色，
  不从管理员标识、权限树或其他 Tenant 关系推断角色。长文本沿用表格统一省略及完整提示。

## 2026-10-21 姓名统一与普通筛选

- 表格移除 Tenant、昵称列，仅固定 `realName` 用户名称首列，操作列不固定。
  人员标题、头像文字及状态确认统一以 `realName` 展示，缺失时显示“未设置姓名”，
  不使用 `nick_name`、成员 `display_name` 或登录账号冒充姓名。
- 昵称、成员显示名字段保留在响应与类型中，列表/详情/新建/编辑不再展示或采集。
  UpdateUser 原样回传已有 `nick_name`，不清空历史数据，不使用 real_name 覆盖它；
  CreateMember 的新用户昵称保持空值。登录账号仍只读可复制。
- 完整登录账号和成员状态移到普通筛选，无“更多筛选”；移除用户 ID、用户状态查询输入，
  列表不再提交 `user_id`、`user_status`。详情读取仍使用原 `user_id + tenant_ids`，
  不改变后端 DTO 或其他消费者的接口能力。姓名筛选继续发送 `real_name`。
- 后端已确认并实现 `tenant_user_code` 与 `tenant_user_code_fuzzy`。普通筛选新增成员编号和
  编号匹配模式（默认精确），模糊模式不足3个字符时显示可访问的字段错误并聚焦编号输入，
  不提交查询、不清空旧结果；编号为空忽略匹配模式。重置清空编号并恢复精确模式。
  生产数据交由 QueryUsers 筛选，不对已加载的1000行做客户端过滤冒充全量查询。
- 通信增量逐项核对删除的昵称/成员显示名输入及用户ID/状态筛选、移动的普通筛选。
  新增编号和匹配模式草稿、校验及Enter事件仍复用页面查询资源，不新建Button/Function。
  保留 QueryUsers、UpdateUser、CreateMember 等既有 Function 映射、查询/回车单次提交、
  当前租户隔离和写后详情回读；只更新已审核来源、候选集合和依赖闭包，不写数据库。

## 2026-10-21 基本信息编辑与账号只读

- “编辑用户/编辑全局用户”统一为“编辑基本信息”，对应保存为“保存基本信息”；
  登录账号只读可复制，仍以原 `user_name` 提交 UpdateUser。新增用户账号输入不受影响，
  原资源码、权限、接口、请求结构、保存与回读流程均保持不变。
- 本次两个生产源码仅调整显示名称、资源用途说明和输入框 `readonly`；通信候选
  去除行号后逐项相同，无新增/删除/改名的请求或回调。中央 inventory 仅在上述核对后
  重绑这两个来源及其受影响的依赖指纹，保留原候选分类和 Function 映射，不写数据库。

## 2026-10-21 列表与详情入口调整

- 列表只保留“详情”和当前成员“停用/启用”，操作列按实际可见按钮测宽。
- “编辑用户”和“编辑成员资料”移至详情“全局用户”和“当前 Tenant 成员”标题旁；
  复用原编辑抽屉、权限、对象 ID 和版本，不新增资源或改变写入范围。保存后列表及详情回读，
  取消编辑保持详情可见。角色分配/撤销成功后刷新列表，使角色列反映服务端最新返回。
- 停用全局用户入口及前端调用已移除；全局用户状态仍展示。删除前端 Button 声明
  `IAM.MEMBERS.BUTTON.USER_STATUS`、元素 `iam.members.userStatus` 和模板
  `iam.members.user-status`；两个编辑资源码不变。后端 `ChangeUserStatus` Function
  不随此 UI 决策删除。本轮仅维护代码与离线声明，数据库资源交由专门维护会话处理。
- 通信核对：移动编辑回调不新增请求；成员状态只走 `ChangeMemberStatus → QueryUsers`；
  角色写入后仍使用已声明的 `QueryUsers` 回读。共享别名/常量只移除已退役全局状态按钮，
  其他页面、接口及授权语义不变。通信 inventory 按候选与链差异复核，不以刷新哈希替代审查。

## 按需分页的筛选候选

- 请求：`POST /iam-admin/Membership/QueryFilterOptions`。
- 入参：`{ tenant_ids: [currentTenantId], kind, keyword?, page_index, page_size }`；
  `kind` 为 `organization`、`position` 或 `role`。
- 出参：标准分页结构 `{ total, page_index, page_size, items }`，每个选项包含
  `{ id, tenant_id, code, name }`。
- 只返回当前 Tenant 范围内启用、未删除的对象；复用 `iam:members:view` 的查询授权，
  不依赖 Organization、Position、Role 管理菜单权限。
- 三种下拉分别按需加载、服务端搜索和分页；不在页面进入时加载三类全量候选。
  切换当前租户后清空组织、岗位、角色选择并使旧请求失效。
- 无有效当前租户时不请求候选接口。
- 用户详情的组织/岗位归属选择可复用本接口，范围固定为目标成员的单一 Tenant。

## 详情与创建

- 点击详情时重新请求 `QueryUsers`，发送 `{ user_id, tenant_ids: [row.tenantId],
page_index: 1, page_size: 1 }`，不沿用列表的姓名、状态或关系筛选条件。
- 响应必须匹配目标 `user_id + tenant_id`；抽屉对旧响应做失效校验，失败显示重试入口。
  保存组织或岗位归属成功后重新查询该成员详情，不能只刷新背后的列表。
- `CreateMember` 与创建 Tenant 的 `initial_admin` 不发送 `tenant_user_code`、
  `display_name`，由服务端统一生成。已有成员的更新继续原值发送这两个只读字段，
  不重算历史编号和显示名称。

## 当前租户来源与页面行为

- 本页不显示 Tenant 查询单选或多选。当前租户来自登录会话或最近一次成功的框架租户切换；
  `available_tenants` 只用于框架切换候选，不作为本页批量查询范围。
- 页面首次进入、查询、重置和回车，每次只发送一次携带当前筛选条件的业务
  `QueryUsers` 请求；`tenant_ids` 始终为当前租户的单元素数组。
- 服务端如在嵌套 `memberships` 中返回其他租户关系，本页只呈现当前租户关系。
- 切换租户后清空旧列表、详情、候选和未提交表单；旧请求晚到不得覆盖新上下文。
- 集团共享记录和 Tenant 目录是对象范围例外，入口及操作仍按当前 Tenant 授权，SA 不自动补权；目录结果不作为本页查询范围或本人切换候选。
