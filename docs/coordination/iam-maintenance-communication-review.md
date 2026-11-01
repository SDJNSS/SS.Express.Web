# 首批自动维护通信链核对记录

日期：2026-09-27。范围：新七个权限治理页面、用户管理及其上传/远程选项/角色抽屉。

这是已核实的调用链证据，不是全量通信验收。源码指纹以 `standards/iam/communication-inventory.json` 为准；当前仍保留 pending，不据此设置 `complete=true` 或执行远程维护。

## 1. 精确接口和来源

下表端点均为 POST；省略的服务前缀为 `/iam-admin`。后端 Function 编码不在本文另造一份：通过注册表的 Method/Path 与 `standards/iam/backend-functions.snapshot.json` 精确匹配，最终展开在 `artifacts/iam-maintenance.frontend.json`。

新七页入口均在 `src/features/iam/permission-governance/pages/`，绑定层将回调传给同 Feature 的 `components/*PageView.vue`。Permission/Package 名称沿用业务新模型；API Controller 名称仍使用 PermissionScheme，不据此改回旧模型。

## 2. 新七页行为链

| 入口/行为                                    | 实际回调链与接口                                                                                                                                                                   | 不应额外增加的权限                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 系统资源目录首次加载、查询、分页、重置、刷新 | `SystemResourceCatalogPage → useSystemResourceCatalog.queryResources → ensureApps → AuthorizationCatalog/QuerySystems（缓存未命中）→ PermissionResource/Query`                     | 无资源新增、编辑、删除能力                   |
| 系统资源详情                                 | View 的 `openDetail → loadResourceDetail → PermissionResource/Get`，必要时 `ensureApps`                                                                                            | 无反向方案引用查询                           |
| 权限列表加载、查询、分页、刷新               | `PermissionManagementPage → usePermissionManagement.queryPermissions → ensureApps → PermissionScheme/Query`                                                                        | 不把配置页读取和保存接口混进列表读取         |
| 权限详情                                     | `openDetail → loadPermissionDetail → PermissionScheme/Get → ensureApps`；返回树在本地展开                                                                                          | 不为本地展开额外声明查询                     |
| 创建/复制权限                                | `openForm` 仅初始化本地表单；`savePermission → submitPermission → PermissionScheme/Create 或 Copy → ensureApps`；响应直接更新本地记录                                              | 成功后没有再次查询列表；不能虚构一次 Query   |
| 权限包列表/详情                              | `PermissionPackageManagementPage → usePermissionPackageManagement`；列表 `PermissionPackage/Query + ensureApps`，详情 `PermissionPackage/Get + ensureApps`                         | 不与 Package 配置页接口混为一组              |
| 创建/编辑权限包                              | `openForm` 使用空表单或当前记录，无详情请求；`savePackage → submitPackage → PermissionPackage/Create 或 Update → ensureApps`                                                       | 没有独立编辑详情查询和成功列表回读           |
| 权限功能配置加载/刷新                        | `PermissionConfigurationPage.load` 并行 `QuerySystems + PermissionScheme/Get`，之后按所属 App 分页遍历 `PermissionResource/Query`                                                  | 树搜索、选择父资源、勾选后端资源均是本地草稿 |
| 保存权限功能配置                             | 确认弹窗 → `saveComposition → executePendingSave → PermissionScheme/SaveTree`；响应更新页面                                                                                        | 无额外详情/列表回读                          |
| 权限包配置加载/刷新                          | `PermissionPackagePermissionsPage.load → QuerySystems + PermissionPackage/Get → PermissionScheme/Query(include_details=true)`，循环获取全部候选                                    | 本地树搜索、勾选 Permission 不请求后端       |
| 保存权限包配置                               | 确认弹窗 → `savePermissions → executePendingSave → PermissionPackage/SavePermissions`                                                                                              | 响应直接更新，不虚构成功刷新                 |
| 角色授权加载/刷新                            | `RoleAuthorizationPage.load → QuerySystems + resolveRole → RolePermission/QueryRoles + RolePermissionScheme/Query + PermissionPackage/Query(include_details=true)`；包候选完整分页 | 不是 MemberRole/Query；不发送 tenant_user_id |
| 保存角色授权                                 | 确认弹窗 → `savePackages → RolePermissionScheme/Save → load`，因此包含上行四个必要读接口                                                                                           | 不可只声明 Save 遗漏成功回读                 |
| 用户有效权限加载/刷新                        | `UserEffectivePermissionsPage.load → QuerySystems + CurrentPermissionResource/QueryUserPermissions + Membership/QueryUsers(user_id, tenant_ids)`                                   | 只读；不存在直接用户授权或保存               |

API 实现依据：`permission-governance/api/permissionGovernanceApi.ts`；角色信息桥接依据：`access-control/api/accessControlSession.ts::resolveRole`。上述 API 文件还定义部分无本批 UI 调用者的资源维护接口；仅有定义不代表应塞进页面包。

### 导航、缓存和恢复边界

- 列表搜索 `router.replace` 只更新 URL；本页实际查询由其后的回调执行，不是路由 watch 自动再查一次。
- 三个工作区的过滤/勾选不重取候选；重试加载才调用对应读取链。
- 创建/复制权限后会进入权限配置页；创建权限包后会进入权限包配置页。目标是独立 ButtonPage，仍受目标资源守卫约束，创建 Permission 不自动授予配置页。当前包成员也不隐式扩大；维护方不能因成功跳转意图而合并授权。
- 不确定写结果的手工重试保留原请求标识，重放相同端点；“重新加载核实”执行读取链，不重发写入。
- 错误消息、关闭/取消、表单校验、展开/折叠、本地筛选不制造 Function。Preview 无生产回调时的候选行为不是另一项生产权限。

## 3. 用户管理完整业务链索引

生产绑定：`src/features/iam/foundation/pages/MembershipManagementPage.vue`；视图：`components/MembershipManagementPageView.vue`；角色抽屉：`components/MemberRolesDrawer.vue`。

| 上下文                 | 实际请求与条件                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 初始化/工具栏刷新      | `load()` 先通过 `queryFoundationTenantOptions → QueryUsers(当前账户)` 回读本人有效租户，再 `QueryUsers(实际列表条件)`；不是一次显式查询按钮重复请求  |
| 查询按钮               | `load(query)` 不刷新租户选项，只调用一次 `QueryUsers`；列表分页为已取结果的本地分页                                                                  |
| 有效权限入口预校验     | 初始化单独 `getCurrentPageResourcesCached → CurrentPageResources`；这是 session_self_service，不塞进业务 Permission                                  |
| 组织/岗位/角色查询候选 | `PagedEntitySelect → loadOptions → queryFilterOptions → Membership/QueryFilterOptions`；tenant_ids、kind、关键词、分页均取实际调用上下文             |
| 用户详情               | `queryMemberDetail → QueryUsers(user_id + 单个 tenant_id)`，不直接拿旧列表记录当最新详情                                                             |
| 新增成员               | 按目标租户 `loadRelationOptions(all) → Organization/Query + Position/Query`（缓存未命中）；提交 `Membership/CreateMember → load()`；头像另见下节     |
| 编辑用户               | 读取最新详情，`Membership/UpdateUser → load()`；头像另见下节                                                                                         |
| 编辑成员               | 读取最新详情，`Membership/UpdateMember → load()`                                                                                                     |
| 启停用户/成员          | `Membership/ChangeUserStatus 或 ChangeMemberStatus → load()`                                                                                         |
| 租户归属               | `Membership/QueryUserTenants + Tenant/Query（全部分页）`；`UpdateUserTenants → load()`，响应作为新的成员版本快照                                     |
| 组织/岗位归属          | 读取最新用户详情，按上下文加载 Organization/Query 或 Position/Query；`Membership/SaveOrganization 或 SavePosition → load()`，详情回读仍是 QueryUsers |
| 查看角色抽屉           | `loadMemberRoles → queryMemberDetail → MemberRole/Query（全部分页）`；仅拥有 assignRole 功能时再调用 `RolePermission/QueryRoles` 获取可分配候选      |
| 分配角色               | `MemberRole/Assign → 抽屉 load()`，回读最新用户、角色关系及有权查询的角色候选                                                                        |
| 撤销角色               | `MemberRole/Revoke → 抽屉 load()`；不能把仅由 assignRole 条件触发的 QueryRoles 无条件塞入 revokeRole 模板                                            |

用户、成员编辑和租户归属的版本按现有字符串 VersionToken 传输；此轮不调整业务 DTO 或现有 V1 判权。

## 4. 不能停在共享组件 emit 的两条链

### 头像上传

`MembershipManagementPageView 的图片上下文 → ImageUploader/ImageAssetField → FileUploader → inject(fileTransferKey) → AppLayout.provide → createDmsFileTransferGateway → createDmsUploadTask → POST /dms/File/Upload`。

- provider 的实际文件为 `src/features/dms/files/api/fileTransferGateway.ts` 和 `fileApi.ts`；不能只看 FileUploader 的静态 import 闭包。
- 头像 category 是 IMAGE，只上传，不走 VIDEO 分支的 ValidateVideo。
- 已存图片由 IAM 响应 URL 显示，不调用 GetAccessUrl；网关有 `access` 方法不代表本页使用它。
- 上传重试复用任务幂等键；取消、移除、作用域变化与卸载只中止/清理本地任务，没有删除文件接口请求。
- Upload 的提供方是 DMS，按后端消费者白名单引用，不复制 IAM Function。

### 远程下拉

`PagedEntitySelect.changeVisibility/search/changePage/重试 → query → props.loadOptions → 用户页 queryFilterOptions → Membership/QueryFilterOptions`。

- 打开、延迟搜索、翻页和重试都可能请求；不能将搜索定时器当成无意义本地事件排除。
- modelValue/selectedLabel 变化仅同步回显，scopeKey 变化清空旧候选并取消在途请求；只有控件 active、弹层已打开且非 clearOnly 时请求。
- 选择选项/清空只 emit 当前值；是否进一步查询由消费者决定。本页查询条件采用显式提交，不因赋值自动重新查列表。

## 5. 统一传输与尚未验收部分

统一 `requestApi → httpClient` 补鉴权头、请求标识并解包；服务前缀来自 backendServices。上传不使用 el-upload 的默认自动提交，走同一传输层，multipart boundary 由浏览器生成。

已核实的核心业务链与现有注册表端点集合一致，但以下仍不能由本记录替代：

1. 所有候选逐项分类及共享依赖、注入 provider 的变更传播证据。
2. 框架/认证自动通信、其余 16 个正式入口及八个占位入口的完整发现验收。
3. 原生图片 URL 等外部加载与普通业务 Function 的分类；不能为了消除候选而伪造平台端点。
4. 获准环境中的运行清单对照、最小授权下实际请求与维护结果回读。

因此，本记录供后续逐链验收复用，**不把源码阅读和模拟测试等同线上授权生效，也不将未审完的 source disposition 批量改为 reviewed**。
