# 组织负责人候选接口与交互契约

## 业务含义

组织负责人是可选字段。只允许选择当前租户内启用且当前有效的用户成员；设置负责人不改变用户的组织归属，也不授予额外权限。界面展示姓名及登录账号，不要求填写内部 ID。

## QueryLeaderCandidates

- 请求：`POST /iam-admin/Organization/QueryLeaderCandidates`。
- 入参：`{ tenant_id, keyword, page_index, page_size }`。
- `tenant_id` 必须与当前会话租户一致；普通组织管理按有效 `iam:organizations:view` Function、当前租户资源范围和成员有效性授权，不再要求 `is_tenant_admin=true`。
- `keyword` 搜索姓名、账号或成员显示名称；分页从 1 开始，前端每页 20 项。
- 响应采用统一成功包装，`data` 为 `{ total, page_index, page_size, items }`。
- 每个候选只包含 `tenant_user_id`、`user_id`、`user_name`、`real_name`、`display_name`，不返回完整用户资料。

新 Function 为 `IAM.ORGANIZATIONS.QUERY_LEADER_CANDIDATES`，业务权限码为 `iam:organizations:view`。需将新资源导入目标环境；只直接持有旧 Function 的角色不能因同权限码而自动获得新 ResourceId。

## 前端交互

- 创建时默认未选择。展开后才查询；输入防抖 300ms，支持分页、键盘操作、失败重试。
- 切换租户、关闭抽屉、变更搜索条件时使旧请求失效，不能回填其他租户或过期搜索结果。
- 编辑时回显既有负责人，不要求其位于当前候选页。停用组织只允许保留或清空原负责人。
- 创建/编辑仍提交既有 `leader_tenant_user_id` 字段。未选择或显式清空时按 IAM 约定提交 `0`；界面不展示 `0`。
- Preview 使用本地候选，不调用业务 API。生产页面复用共享 `PagedEntitySelect`。

验证：`tests/visual/iam-organization-leaders.spec.ts` 覆盖标准三视口的分页选择、过期响应、防抖、重试、回显与清空。
