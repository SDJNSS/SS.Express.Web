# 当前租户成员、管理员与组织岗位归属

2026-10-17。正式页面 `/iam/members`，实现目录 `src/features/iam/foundation/`。
权威后端契约：`D:/project/SS.Express.Platform/Doc/Engineering/iam-membership-followup-contract-2026-10-17.md`。

## 当前租户边界

SA 也只操作当前登录 Tenant。关联已有账号只新增当前 Tenant 成员，不移除其他 Tenant；停用是可恢复冻结，结束有效期保留历史，不是永久清退。
共享用户资料/状态另行授权，可能影响该账号全部 Tenant。旧 UpdateUserTenants 已退役，前端没有入口或请求。

## 管理员专用操作

| POST 路径                                  | 权威 Function                          |
| ------------------------------------------ | -------------------------------------- |
| `/iam-admin/MemberRole/AppointTenantAdmin` | `IAM.MEMBER_ROLE.APPOINT_TENANT_ADMIN` |
| `/iam-admin/MemberRole/CancelTenantAdmin`  | `IAM.MEMBER_ROLE.CANCEL_TENANT_ADMIN`  |

Body：`tenant_id`、`user_id`、`member_version`（字符串）、`request_id`。通过 QueryUsers 获取当前成员版本，不用全局用户版本，不传 tenant_user_id。
请求号为一个操作意图生成一次；网络结果不确定时显式重试保留完整原载荷。刷新状态意味着建立新意图，不自动重放旧请求。
成功 data 含目标身份、is_tenant_admin、member_version、changed、idempotent。幂等重放返回最新状态，不保证仍是旧目标身份，必须回读。

业务 JWT + SA + 当前 Tenant 精确 Function + 高危闸门由服务端执行。前端只按精确 Button 授权展示，不以 SA 身份补权。仅有效成员可操作，取消必须保留一名有效管理员。本人变更后清理页面资源快照并重新装载整个会话上下文。
错误 envelope 的顶层 `reason_code` 由共享 ApiError.reasonCode 保留；HTTP 200 不代表成功。最后管理员使用 IAM_LAST_EFFECTIVE_TENANT_ADMIN；版本冲突 IAM_MEMBERSHIP_VERSION_CONFLICT。版本/业务拒绝需重新加载后人工确认，认证/403 仍按既有处理。

## 组织/岗位关系

保存使用 `/iam-admin/Membership/SaveOrganization`、`SavePosition`：更新传原关系 id/version、tenant_user_id、org_id/position_id、is_primary、effective_start、effective_end、remarks。新增不携带旧 id/version。结束使用 `/iam-admin/Membership/EndOrganization`、`EndPosition`：id/version/effective_end。

编辑/结束先回读 QueryUsers（user_id + 单值 tenant_ids），其嵌套关系有 id/version。候选复用当前 Tenant 的 QueryFilterOptions，保留服务端分页、搜索及选中标签；成功后刷新列表和详情。有效期完整赋值，空结束值提交 null。无偏移墙钟按 Tenant 时区输入，带偏移响应先转换为该时区。
历史已结束/停用只读；同目标区间不能重叠；仅当前有效归属可设为主要。原主要归属由服务端事务降级。结束保留历史，不自动选择新主要；空时间表示 Tenant 当前时间，不可早于开始或延长原结束日期。
失败保留草稿但禁用再次提交，需显式重新加载并检查最新快照，避免旧版本重复覆盖。切换 Tenant 由框架重建页面，局部请求代次及共享会话守卫丢弃旧响应。

## 资源与交付边界

注册源：`src/features/iam/foundation/iam-resource.registry.ts`。新增 Button：

- `IAM.MEMBERS.BUTTON.APPOINT_ADMIN` / `CANCEL_ADMIN`
- `IAM.MEMBERS.BUTTON.END_ORGANIZATION` / `END_POSITION`

编辑继续复用 `IAM.MEMBERS.BUTTON.ORGANIZATION` / `POSITION`，但 editOrganization/editPosition 为独立元素标记。新 Permission 模板键为 iam.members.appoint-admin、cancel-admin、end-organization、end-position；归入既有页面 Package 模板 `iam.members.manage`，不固化数据库实例 ID。
维护方需要按批准范围增量同步新资源、Permission/Package 成员与授权，先读取既有完整集合；不要重建包或覆盖已有授权。前端本次不写数据库，不恢复旧 Button，不改 Tenant 首名管理员事务。

验收：`tests/visual/iam-membership-followup.spec.ts`、`tests/visual/http-client.spec.ts`。浏览器使用项目 Playwright（Browser plugin not available，Ego CLI 未安装）；模拟接口行为与真实数据库/JWT/Redis 联调分开记载。用户已告知后端部署，本次不把部署通知当作真实管理员写入验收。
