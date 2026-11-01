# Harness 独立通信抽查（2026-09-27）

范围：只读抽查 `auth-communication.json`、`foundation-communication.json`、`permission-governance-communication.json`、`shell-communication.json` 的 22 条代表链。核对实际页面回调、宿主绑定、API 封装和 Function snapshot；不操作线上/后端，不作运行时授权或全量行为证明。没有因既有样本页面扩展业务。

## 发现与处置

1. **证据缺项，已补齐并复核**：`permission-governance-communication.json` 的 `pg.tree.retry` 原缺少 `POST /iam-admin/RolePermission/QueryRoles`、`POST /iam-admin/Membership/QueryUsers`。实际 `PermissionPackageTree.retry` 经宿主转发到 `RoleAuthorizationPage.load`（`resolveRole`）或 `UserEffectivePermissionsPage.load`（目标用户身份查询）。原专属 `pg.role-authorization.load`、`pg.user-effective.load` 已正确，缺的是共享树重试汇总。主任务已补齐；本次重新读取确认两请求及精确 Function 指纹存在。该列表是宿主条件分支，不表示每个宿主均调用全部接口。
2. **既有交互风险，本轮不改业务**：`pg.configuration.save`、`pg.package-permissions.save`、`pg.role-authorization.save` 的未知结果“重试保存”按钮直接 emit；父页面 `retryPendingSave` / `executePendingSave` 没有独立 in-flight 锁。快速重复点击可并发发送相同 `request_id` 的 HTTP 写请求。正常确认按钮有同步 `submitting` 防重；保留 request_id 也不等于前端阻止重复 HTTP。未推断重复数据库写入。依据：`RoleAuthorizationPageView.vue:268` → `RoleAuthorizationPage.vue:162`，`PermissionConfigurationPage.vue:167`，`PermissionPackagePermissionsPage.vue:167`。按主任务决定仅记录风险。

## 实际抽查链

文件列为本目录证据文件；源码均位于 `src/`。端点省略重复前缀 `/iam-admin`。

| 文件                  | chain_id                       | 源码核查结果                                                                                                                                                                                   |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| auth                  | `auth.login`                   | `LoginPage.submitLogin` → `Auth/Login`；同步 submitting 阻挡重复常规提交，保存会话后导航；找回密码仅本地提示。                                                                                 |
| auth                  | `auth.switch-tenant`           | `TenantContextPage.switchTenant` → `foundationSession.switchFoundationTenant` → `Auth/SwitchTenant`；包含 session_version/request_id，成功替换会话。                                           |
| auth                  | `auth.tenant-selection-logout` | 页面取消 → `Auth/Logout`，finally 清会话；不能标成纯本地登出。                                                                                                                                 |
| foundation            | `foundation.group.load`        | `GroupProfilePage` 挂载/刷新 → `Group/Info`。                                                                                                                                                  |
| foundation            | `foundation.group.save`        | `Group/Update` 响应直接映射 profile，没有虚构 `Group/Info` 回读。                                                                                                                              |
| foundation            | `foundation.tenants.load`      | `Tenant/Query` 加载全量列表；视图搜索/重置是本地 committedQuery 过滤，没有额外请求。                                                                                                           |
| foundation            | `foundation.tenants.create`    | 向导前两步仅校验推进；确认步 `Tenant/Create` 携初始管理员子结构，随后 `Tenant/Query`。                                                                                                         |
| foundation            | `foundation.tenants.save`      | 编辑确认 → `Tenant/Update` → `load` / `Tenant/Query`；提交前同步阻挡重复和上传未完成。                                                                                                         |
| permission-governance | `pg.packages.query`            | `queryPackages` → `PermissionPackage/Query`；`ensureApps` 仅缓存未命中时 `AuthorizationCatalog/QuerySystems`。                                                                                 |
| permission-governance | `pg.packages.save`             | create/edit 互斥 → `PermissionPackage/Create` 或 `Update`；回填响应、不追加列表 Query；App 查询有缓存条件。                                                                                    |
| permission-governance | `pg.configuration.load`        | QuerySystems + PermissionScheme/Get，再按实体 app_id 分页查询 PermissionResource/Query；无效 ID 提前返回。                                                                                     |
| permission-governance | `pg.configuration.save`        | 仅 PermissionScheme/SaveTree，映射返回实体；没有成功后的额外 load。未知结果重试见风险 2。                                                                                                      |
| permission-governance | `pg.package-permissions.load`  | QuerySystems + PermissionPackage/Get，再按 app_id 分页 PermissionScheme/Query（include_details）。                                                                                             |
| permission-governance | `pg.package-permissions.save`  | 仅 PermissionPackage/SavePermissions，回填响应；未知结果保留原 request_id，见风险 2。                                                                                                          |
| permission-governance | `pg.role-authorization.load`   | QuerySystems、RolePermission/QueryRoles、RolePermissionScheme/Query、分页 PermissionPackage/Query；不查询 MemberRole。                                                                         |
| permission-governance | `pg.role-authorization.save`   | RolePermissionScheme/Save 成功后 load 回读上述四组；没有遗漏保存后刷新。未知结果重试见风险 2。                                                                                                 |
| permission-governance | `pg.user-effective.load`       | QuerySystems + QueryUserPermissions + Membership/QueryUsers；后者带目标 user_id、tenant_ids，匹配返回用户和 membership。                                                                       |
| permission-governance | `pg.tree.retry`                | 逐宿主 retry → load 的汇总；发现并补齐的两个请求见发现 1。                                                                                                                                     |
| shell                 | `shell.bootstrap`              | `useAppShellContext` 挂载加载 Apps/Profile，App 上下文加载 Menus；CurrentFunctions 仅 Legacy 且正 menu_id，V2 清空旧 Function。                                                                |
| shell                 | `shell.api.currentProfile`     | `loadUserProfile` → Auth/CurrentProfile；按 accessToken/currentTenant/isUnmounted 丢弃迟到响应，不再借 QueryUsers 加载普通 Shell 身份。                                                        |
| shell                 | `shell.file-provider`          | AppLayout provide(fileTransferKey) → FileUploader 注入 gateway → 用户选择/重试才 Upload；仅 VIDEO 验证 ValidateVideo；GetAccessUrl 是独立 access 调用。ImageAssetField 不自动发 GetAccessUrl。 |
| shell                 | `shell.error-navigation`       | 重试/返回触发路由守卫；V2 CurrentPageResources 使用 sessionID/version/tenant/page 精确缓存键、5 秒 TTL、并发合并；失败不缓存，响应页面 code 不匹配不放行。                                     |

补充静态交叉核查：foundation + permission-governance 共 12 个 registry 页面映射中，未发现写 Function 挂在 page 只读入口，或未被 Function `allowed_consumer_app_codes` 许可的跨 App 引用。DMS Upload 是 write 且允许 IAM 消费；GetAccessUrl/ValidateVideo 是 read。此结论仅针对本次 snapshot/声明，不等于数据库授权有效。

在所抽查的回调范围内，除上述已修证据缺项外，未发现真实请求错误标 local，或把未被回调调用的 API 无条件声明为该操作。树本地筛选/选中/DOM 恢复、租户本地筛选和上传结果字段更新均与纯本地分类吻合。

## 辅助脚本收尾

仅修改 `build-routes-evidence.mjs`：删除自动生成/批准回调映射逻辑，读取既有 `routes-communication.json` 作为审核锁，所有输出前先验证候选、源码、完整依赖、精确 Function code 和 `function_sha256`。不重算已批准哈希、不提升 pending、不写中央 inventory 或最终 artifact；旧 source-only lock 不再被脚本用作批准依据。

验证：Node 语法检查、ESLint `--no-ignore --max-warnings=0`、Prettier check、保存证据验证均通过（69 sources / 834 candidates / 298 chains）。默认导出与已保存 JSON 规范化内容完全相同。内存负例确认拒绝：共享 provider 哈希变化、Function 策略变化、缺 Function 指纹、新扫描候选、新 route source、pending 证据。没有为测试修改正式源码或冻结证据。
