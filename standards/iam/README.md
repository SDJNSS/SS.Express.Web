> 2026-10-18：当前授权为 Tenant 成员 → Role → Permission → Resource。完整维护 manifest 升级为 Schema 3.0，不再输出 package_templates。两个权限包页面退役并归档；保留既有 Permission/资源 ID，不执行前端数据库清理或 SA 自动补权。Permission 模板按已登记前端归属显式记录 parent_permission_key，默认联动全部 false；展示父级不扩大授权。历史包模型记录只供追溯，不作为当前维护输入。

# IAM 自动维护声明

> 2026-10-22 课程视频预览增量：新增元素 `iam.training.courses.videoPreview`，复用页面资源 `IAM.TRAINING.COURSES` 与 `training-course-management.view`，增加只读 `DMS.FILE.GET_ACCESS_URL` 组合，不新增 Button/Permission。16 个新通信候选逐项分类：4 个业务委托、2 个 scope 本地快照的委托误识别、10 个纯本地媒体/状态行为；1,637 个候选无未解释项，99 个前端资源、67 个 Button、94 个 Permission 模板不变。仅前端离线声明，数据库权限配置交给 KimiCode；真实 OSS 与后端兼容策略未冒充验收。交接见 `docs/coordination/training-course-video-preview-delivery-2026-10-22.md`。

> 2026-10-21 成员姓名/筛选增量：列表删除Tenant/昵称列并仅固定realName首列；移除昵称采集及用户ID/用户状态查询，新增成员编号精确/模糊筛选。编号与模式复用页面资源，未新增Button/Permission；五个旧草稿控件移除、三个新增本地候选及两个请求载荷差异已逐项复核，当前1,619个通信候选无未解释项。昵称数据保留，正式姓名不回退昵称/成员显示名。本轮不写数据库、不更新Approval或截图基线；接口及证据见 `docs/api/iam-membership-query-users.md`。

> 2026-10-21 成员列表后续调整：增加根级 `roles:string[]` 列，两个编辑入口移至详情标题旁且资源码不变；移除全局用户启停 Button `IAM.MEMBERS.BUTTON.USER_STATUS`、元素及模板，后端 Function 不删除。当前离线清单为99个前端资源、67个业务Button、94个Permission模板，1,621个通信候选无未解释项；不执行数据库写入或授权。下方100/68等数字为本日前一阶段的历史记录。详情见 `docs/api/iam-membership-query-users.md`。

> 2026-10-21 资源语义增量：100 个前端资源的用途/场景已在所属静态来源维护，DOM 和完整维护 manifest 均输出说明，后端 179 项 Function 说明按权威目录导入。Skill 使用现有 `remarks` 约定，无需另造扫描格式。准确的接口与触发时机仍看元素 events；元数据不新增资源、不扩展授权，也不证明已写入数据库。核对依据见 `standards/resource-elements.md` 的资源语义说明与通信证据增量核对。

> 2026-10-17 成员维护增量：`/iam/members` 增加管理员任命/取消及组织/岗位关系编辑、结束。四个新 Button/Permission 分别登记，编辑继续复用原维护资源并使用独立元素；成员包模板共14项。后端权威目录190项，前端229个源码、1,682个候选、100个Permission模板、29个Package、71个业务Button；离线 unresolved=0、ready_for_sync=true，runtime_activation_ready仍为false，不证明在线授权。共享HTTP仅透传reason_code；旧跨Tenant写入口不恢复。本轮不写数据库，维护会话只需按批准范围增量维护，不能重新初始化已有包。详见 `docs/coordination/iam-membership-followup-frontend-delivery-2026-10-17.md`。

> 2026-10-17 列表布局增量：详情入口移到对象名称（员工管理保留详情），操作列按实际可见按钮测宽；24个重复详情/行点击候选已移除，新增2个纯DOM布局挂载候选。最终离线检查为225个源码、1,648个候选、96个Permission模板、29个Package、67个业务Button，未解释候选为0。只更新受影响的前端来源/链证据；不改接口、模板成员或数据库授权，不自行更新UIDesign批准和基线。

> 2026-10-17 Function 契约升级：正式导入仅接受后端 Schema 3.0 全宿主离线目录，校验每个 Host 的 complete、数量与服务归属；快照保留高危操作标记及来源 Schema。跨 App 复用以 business + composable=true 为准，不再解析消费者白名单。来源变化仍须复核通信链并记录证据，导入不自动刷新审核指纹、不证明当前部署或用户授权。

> 2026-10-17 增量：已复核登录、当前 Tenant、Int64 ID、共享请求及权限编辑的通信依赖漂移，并补系统资源目录新增/编辑。当前离线检查为 225 个源码、1,670 个调用候选、96 个 Permission 模板、29 个 Package、67 个业务 Button，未解释候选为 0。旧数值与“仍因 auth.login 阻断”的记录仅作历史背景。数据库及运行时授权仍未验收，本次未同步在线资源；人工资源编码生成等待后端配合，页面新 revision 未自批。

> 2026-09-29 接口迁移变更：运行时已移除旧 Permission/Current* 与 AuthorizationCatalog/QuerySystems 调用，参见 `docs/api/iam-shell-context.md`。后端 Function 快照已更新为 182 项，七页注册源已声明 PermissionApp/Query。下文“177 项/完整/Legacy 运行时”等数字与阶段是此前验收记录，**不得用于本轮同步**：共享守卫/API 改动使通信依赖证据失效，`iam:maintenance:check` 继续阻断；维护方必须重新核对通信链、模板和 rollout，再生成清单。本轮未写数据库、未同步包或 SA 授权。

正式前端根目录：`D:/project/SS.Express.Web`。本目录保存离线证据与迁移边界，不保存环境 Tenant/Role ID、令牌或 API Key，不执行后端维护接口。

## 状态与入口

Schema 2.0 将资源 `lifecycle=active/deprecated/retired`、实现声明 `implementation_status`、实际守卫 `runtime_authorization_model` 分离。状态来源为 `resource-state-policy.json`，五个结构 Module 显式声明，不再因没有独立页面 registry 标为待迁移。`authorization-rollout.json` 保留六个优先基础页的待切换协议，生成器同时统计全部登记页的 Legacy/V2 状态；目前没有通过改阶段字段激活 V2 的开关。维护声明可以就绪，但 `runtime_activation_ready=false` 仍须如实报告。

当前交付的是**可逐链校验的离线维护声明**，不是可直接全量初始化的授权清单。最新进度见 `docs/coordination/iam-maintenance-harness-progress.md`。

- 独立读取生产路由：43 个组件入口，其中 29 个已登记、8 个已验证占位入口、6 个认证/辅助入口；原 16 个正式入口已完成维护登记。
- 已登记范围：原六个基础页、七个新版权限治理页，以及角色成员、培训、各 Overview、Dashboard、Welcome；65 个独立业务 Button。
- 已声明 94 个 Permission 模板、29 个显式页面 Package。链证据按实际生产行为保存；样本展示和未接入培训行为不伪造后端 Function。
- 216 个源码、1,662 个候选、459 条调用链的七组复核证据已合并到中央 inventory；源证据位于 `docs/coordination/harness-evidence/*-communication.json`。来源、候选、依赖及权威 Function 指纹均锁定，新未知项仍保持 `pending`。当前离线 `complete=true`、`ready_for_sync=true`，不代表线上允许执行同步、删除或授权。
- 六个基础页保留原有 V1 判权，新七页仍使用 V2 精确资源守卫；本次只增加发现与声明，没有改写授权语义。

新权限页面唯一生产目录：`src/features/iam/permission-governance/pages/`。旧权限页在 `archive/iam-permission-v1/2026-09-27/`，不得参与发现。

## 单一来源和产物

| 内容                                 | 权威源 / 产物                                                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 页面身份、Button、元素事件、模板成员 | 各 Feature 的 `iam-resource.registry.ts`，只允许静态字面量                                                                                                                                   |
| 当前九个注册源                       | IAM 的 foundation/access-control/permission-governance/overview，Training 的 content-exam/operations-archive，platform/dashboard、tms/overview、vms/overview 下的 `iam-resource.registry.ts` |
| 新七页资源常量                       | `iamPermissionGovernanceResources.generated.ts`，由注册源生成，不手改                                                                                                                        |
| 后端 Function 来源                   | `backend-functions.snapshot.json`；177 项权威定义的离线快照，含来源 revision/hash                                                                                                            |
| 待迁移、认证辅助与占位路由           | `maintenance-migration.json`；逐项声明，不是长期白名单                                                                                                                                       |
| 通信证据与复核状态                   | `communication-inventory.json` v2；绑定源码、候选集合、依赖闭包及权威 Function SHA-256                                                                                                       |
| 完整协议产物                         | `artifacts/iam-maintenance.frontend.json`                                                                                                                                                    |
| 协议 Schema                          | `standards/schemas/iam-maintenance.frontend.schema.json`                                                                                                                                     |
| 兼容旧消费者                         | `artifacts/iam-resource-catalog.json`（V3）、`artifacts/iam-resource-elements.json`（有界元素证据）                                                                                          |
| 显式退役                             | `standards/iam-retirements.json`                                                                                                                                                             |

完整协议含 meta/apps/resources/elements/permission_templates/package_templates/retirements/coverage，并附后端来源。不将旧 V3 中的 Function/page 静默改成新 Button，不从缺失记录推断删除。

`resource_code` 是前端资源身份；后端 Function 有自己的权威资源码；`permission_key`/`package_key` 是模板 managed_key，不能冒充后端生成的实例编码。它们不随名称、路由或当前用户变化。

## 离线命令

通常由开发 Agent 执行，使用者不必手工维护 JSON。

| 命令                                          | 用途                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm iam:maintenance:scan`                   | 全量诊断；产物 `artifacts/iam-maintenance.discovery.json` 不入库，不修改复核状态 |
| `pnpm iam:maintenance:generate`               | 从已审核的声明/明确的 pending 迁移记录生成维护清单                               |
| `pnpm iam:maintenance:check`                  | Schema、映射、守卫、范围及产物漂移检查；已纳入 Lint/CI                           |
| `pnpm iam:maintenance:ready`                  | 严格的离线声明前置检查；未知项或证据漂移时非零退出，不执行任何远程动作           |
| `pnpm iam:codes:generate` / `iam:codes:check` | 新版资源常量投影的生成/检查                                                      |
| `pnpm iam:functions:import <权威目录.json>`   | 显式更新后端快照；必须先核实来源和语义差异，CI 不读取其他仓库                    |

声明有变化时依次生成 codes、resource-catalog、resource-elements、maintenance，然后执行 `pnpm quality`。生成命令不是批准命令。

## 新增和修改规则

1. 独立生产路由发现从 `src/app/router/index.ts` 出发，以 DEV=false 解析，不以注册表决定扫描范围。新正式路由必须登记；既有未迁移入口必须出现在迁移表中。
2. App/Module/Menu/Button/ButtonPage 的父链、资源码、页面路径、生产组件及守卫与注册源一致；不可只保留标记却移除权限守卫。
3. 查询、打开、远程候选、上传、提交、重试和必要成功刷新分别声明。只读根不能带写 Function；写能力使用独立 Button。纯本地行为不编造接口。
4. Method/Path 精确匹配后端 Function，不按名字猜；歧义、未知、不可组合或失效引用都失败。business 且 composable=true 的 Function 可跨 App 复用，资源提供方归属不变。
5. public/session_self_service 等保留事件分类，不自动塞入业务 Permission。DMS Upload 为 write，GetAccessUrl/ValidateVideo 为 read；高危操作标记必须保留，业务组合不绕过服务端 SA/API-Key 二次闸门。IAM 图片展示直接使用 IAM 响应的 URL，不能额外声明并未调用的 GetAccessUrl。
6. 每个 Package 明确列出 permission_keys。当前隐藏页显式拥有独立包，不隐式给父页包扩权；导航引用目标资源，不复制目标授权。
7. 扫描包括生命周期、UI 回调、远程 props、统一封装和直接网络候选；纯事件候选数不等于实际请求数。共享组件、注入 provider、条件分支仍需追踪到真实调用方。
8. 源码/候选集合变化使检查失败。先看 diff、追调用链并补注册/测试，再显式更新对应 inventory 记录。没审完就保持 pending；不能一键重算 hash 后标全量 reviewed。
9. reviewed 必须记录审核者和证据，涵盖本地事件与间接依赖。静态 import 闭包不是任意 JavaScript 的完整调用图；尤其注入、共享回调不能仅因匹配 import 就宣告完成。
10. 不更新批准基线来掩盖失败，不把前端声明当作当前部署、数据权限或角色授权的证明。

### 通信证据 v2 与占位证明

`communication-inventory.json` 的 v2 Schema 为 `standards/schemas/iam-communication-inventory.v2.schema.json`。v1 仅兼容未审查的 pending 记录，不能把一段自由文字作为全部候选的 reviewed 证明。

- 每个 `candidate_reviews` 分组显式列出 `candidate_ids`、`classification`、`reason` 和 `chain_ids`；同一文件的每个候选只能分类一次。允许文件仍为 pending 时保留已审查的部分候选，其余候选继续 pending。
- 业务、公开、自服务、委托、基础设施分类必须引用调用链。链包含触发行为、`callbacks` 的文件与符号、精确候选集合、`requests` 的候选/Method Path/Function 以及源码 `dependencies`。Function 分类来自权威快照；每个请求的 `function_sha256` 锁定完整 Function 定义，分类、写属性、可组合性、高危声明等变化必须重新审查。请求不能标成纯本地。
- 文件的 `dependency_hash` 绑定整个 import 闭包。闭包含 `inject` 时保守加入全部 `provide` 所在文件及其闭包，以覆盖运行时注入。链还可显式补入无静态 import 边的调用方；这些文件及依赖同样绑定 SHA-256。新增 provider、实现变更、候选集合改变均使旧证据失败。
- 已审文件必须有 `reviewed_by` 和具体 `evidence`；零候选文件也必须核实其实际实现，不能仅凭扫描结果自动通过。生成命令没有刷新指纹或批准审查的功能。
- `placeholder-evidence.json` 保留八条生产入口，绑定其路由摘要、`FeatureScaffoldPage` 依赖源码、候选集合和 `PageHeader → AppShell` 的具体注入证据。有效时状态为 `placeholder-verified`，可计入声明完整性；证据/源码/提供者漂移会失败。它只证明占位内容没有业务通信，Shell、认证、上传等仍在全局审查中。

候选分类和链的文字语义仍须逐项审核；静态校验不冒充任意 JavaScript 的完整调用图。`ready_for_sync` 表示离线声明是否可供维护方验收，不表示既有 V1 页面已经切换 V2 运行时判权，也不表示线上授权生效。

## 用户管理模板核对示例

注册源中的 `iam.members.manage` 包显式包含查看、新增、编辑用户、编辑成员、成员/用户状态、租户归属、组织/岗位归属、分配/撤销角色等模板；不是整个页面的 API 并集复制到每个按钮。

| 能力          | 声明依据                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------- |
| 查看用户      | QueryUsers、QueryFilterOptions；详情按 user_id + tenant_ids 回读                                   |
| 新增成员      | 必要组织/岗位候选、CreateMember、成功 QueryUsers 刷新、头像 Upload                                 |
| 编辑用户      | 打开用当前行快照；UpdateUser、成功 QueryUsers 刷新（详情打开时另回读）、头像 Upload                |
| 编辑成员      | 打开用当前行快照；UpdateMember、成功 QueryUsers 刷新（详情打开时另回读）                           |
| 租户归属      | QueryUserTenants、Tenant/Query、UpdateUserTenants、QueryUsers 回读                                 |
| 组织/岗位归属 | 对应候选、SaveOrganization/SavePosition、QueryUsers 回读                                           |
| 分配角色      | QueryUsers、MemberRole/Query、QueryRoles、Assign，按实现刷新                                       |
| 撤销角色      | QueryUsers、MemberRole/Query、Revoke；不能把仅在拥有分配权限时调用的 QueryRoles 无条件归给撤销模板 |

详细回调与条件分支见 `harness-evidence/membership-communication.json`。静态审核、模拟接口测试和真实环境验证分别报告，不互相代替。

## 维护方的执行边界

维护会话负责验收、计划、Impact、受控同步、回读和 SA 授权；本工程工具不调用这些写接口。即使离线 ready 为真，也不代表线上目录/授权已生效。目前用户只批准本机 DMS/IAM/TMS/VMS 四 App 的只读核验，写入范围仍关闭。历史 Preview 截图差异独立记录，本轮不修改 Preview 或视觉基线。
