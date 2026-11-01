# IAM 自动维护接入与旧页退役

日期：2026-09-27。正式工程：`D:/project/SS.Express.Web`。当前使用单 Agent，不启动 harness 或向其他会话派发任务。

依据：用户提供的 `iam-maintenance-frontend-contract.md`。本文区分本次已交付与后续契约实施，不把资源目录等同于 Permission、Package 或在线授权。

## 1. 有效页面与扫描入口

新版权限页唯一目录：`src/features/iam/permission-governance/pages/`。

| 正式页面                             | 路由                                 | 前端资源                                          |
| ------------------------------------ | ------------------------------------ | ------------------------------------------------- |
| SystemResourceCatalogPage.vue        | /iam/system-resources                | IAM.SYSTEM_RESOURCES（Menu）                      |
| PermissionManagementPage.vue         | /iam/permissions                     | IAM.PERMISSIONS（Menu）                           |
| PermissionConfigurationPage.vue      | /iam/permissions/configuration       | IAM.PERMISSIONS.CONFIGURATION（ButtonPage）       |
| PermissionPackageManagementPage.vue  | /iam/permission-packages             | IAM.PERMISSION_PACKAGES（Menu）                   |
| PermissionPackagePermissionsPage.vue | /iam/permission-packages/permissions | IAM.PERMISSION_PACKAGES.PERMISSIONS（ButtonPage） |
| RoleAuthorizationPage.vue            | /iam/roles/authorization             | IAM.ROLES.AUTHORIZATION（ButtonPage）             |
| UserEffectivePermissionsPage.vue     | /iam/members/effective-permissions   | IAM.MEMBERS.EFFECTIVE_PERMISSIONS（ButtonPage）   |

以 `src/features/**/routes.ts`、`src/app/router/index.ts`、活动 Page Contract 与真实组件交叉发现生产范围。上述七页是首批 V2，不是所有业务的永久白名单；`components/*Scheme*View.vue` 仍被新页面使用，不因名字含 Scheme 而废弃。

仍有效：`foundation/` 集团、租户、组织、岗位、用户；`access-control/` 中的 RoleManagementPage、RoleAssignmentPage；培训业务、DMS/TMS/VMS 已交付入口。纯占位路由、开发 Reference、认证/会话流程分别标记排除理由，不冒充业务完成。Preview、Fixture、测试不是独立生产资源。

## 2. 本次已经完成

- 四个旧页（应用与权限资源、角色功能权限、角色数据权限、用户角色与权限）及专用依赖、规格、审批记录、基线迁至 `archive/iam-permission-v1/2026-09-27/`，可追溯恢复；活动路由与 Preview 注销，生成目录不再输出旧 Page/Menu。
- `standards/iam-retirements.json` 保存明确退役及替代关系。旧 Function 只作历史引用快照，不宣布退役：共享 API 可能仍有其他调用方。
- 用户侧“分配角色”改为 `foundation/components/MemberRolesDrawer.vue`。在 `/iam/members` 内打开，按用户 ID + Tenant 查最新成员，再读取角色关系、可分配自定义角色；沿用 QueryRoles、MemberRole/Query、Assign、Revoke。字符串 member_version 原样提交；失败保留选择，成功回读。无新独立路由，无旧 Function 权限树接口调用，查看有效权限仍走新只读页。
- 为避免丢失仍有效的角色能力，兼容 V3 生成器把四个原用户页的角色接口资源保留至成员 Menu 下，稳定标识不变。它们仍是**迁移期旧模型**，不是新后端独立 Function 目录；维护工具不能据此机械转为 V2。
- `pnpm iam:retirement:check` 已加入 Lint，检查退役路由、源码、Preview、导出和历史依赖回流。框架导航也过滤明确退役路由，服务端旧菜单不能重新注册旧页。
- `archive/**` 被普通搜索、Lint、格式化与资源发现规则排除。注意 `src/features/training/operations-archive/` 是正式培训档案 Feature，不能误排除。
- 历史规格引用保留原标识，通过 `standards/source-relocations.json` 的原路径、归档路径、SHA-256 校验。只解析 sources 引用，不绕过 Approval digest；未修改新七页审批及视觉基线。成员页面交互规格已更新，未自行重新批准。

## 3. 当前声明与剩余范围（后端补齐后）

最新标准与命令见 [IAM 自动维护声明](../../standards/iam/README.md)，本节取代之前“七页未打标、完整产物不存在”的阶段状态。

- 13 个页面、31 个业务 Button 已接入三个静态注册源和共享 SDK；七个新页与保留六页均包含 resource_element，未改变 UI 样式和实际鉴权。
- 已提供 `artifacts/iam-maintenance.frontend.json` 及版本化 Schema，声明 44 个 Permission、13 个显式 Package；Method/Path 精确映射后端权威 Function。兼容 V3 输出仍独立保留，不是维护协议。
- 独立生产发现为 43 个组件入口：13 已登记、16 正式入口待迁移、8 占位、6 认证/辅助；明细见 `standards/iam/maintenance-migration.json` 和产物 coverage。
- 源码/候选集合 hash 与显式审查记录一起校验。新增路由、漏标关键控件、丢失守卫、未知 Function、只读根挂写接口、错误父链/包成员均有反例检查。生成命令不会自动批准新增通信。
- **F-01 仍是部分完成**：生命周期、共享回调和注入 provider 的全链证据尚未完成逐链复核；当前通信候选保留 pending，不以候选数等同请求数。
- **F-02 的协议、离线生成和检查已落地**，但全量完整性仍明确为 false。
- **F-03 的精确映射、模板和包声明已落地，闭环未验收**；尚不能仅凭静态模板声明全部依赖已覆盖或线上授权生效。
- `complete=false`、`ready_for_sync=false`。普通一致性检查通过不等于可同步；`pnpm iam:maintenance:ready` 应失败。禁止据此进行全量初始化、删除或 SA 授权。

其余正式入口没有废弃，也不会为了让统计变成全绿而移出范围。下一步是完成当前注册页的全链证据（先七页与用户管理），再按迁移表扩展其余页面。

已核实的行为链、缓存/条件分支、共享上传 provider 和角色抽屉回读见 [首批通信链核对记录](iam-maintenance-communication-review.md)。该记录用于继续验收，不自动升级 pending 状态。

## 4. 后端来源与执行分工

权威来源：`D:/project/SS.Express.Platform/Src/IAM/Admin.Api/iam-function-resource-catalog.json`；本仓库保存版本化离线快照 `standards/iam/backend-functions.snapshot.json`，CI 不依赖开发者 Downloads 或另一仓库。

最新 IAM、培训与 DMS 文档中的 170 项定义已经与独立目录核对；快照共有 176 个 Function，包含其他服务。此前缺少的 Membership、培训和 DMS Function 编码、读写、鉴权类别、可组合性及允许消费者已补齐，此项不再要求后端重复提供。

DMS Upload 为可组合的业务写 Function，GetAccessUrl/ValidateVideo 为读 Function；允许 IAM/TMS/VMS/YMS 引用，实际策略以权威快照为准。IAM 图片展示直接使用 IAM 返回 URL，不凭空增加 GetAccessUrl 依赖。public/session_self_service 等仍不自动纳入业务包。

以上是源码与文档证据，未读取部署运行 Manifest、未执行环境同步或回读，不证明当前二进制/数据库与源码一致。源 revision 不代表脏工作区全部已提交；本次还输出 source_content_hash 绑定实际扫描内容。

资源维护会话在契约验收后负责受控环境计划、Impact、同步、回读及 SA 授权；本次前端工具没有调用任何维护写接口，也没有修改维护 Skill。当前未完成项主要是前端通信链审查和剩余页面接入，不应再次转为后端“补文档”阻塞。

## 5. 数据库处理边界

归档源码不自动删除/停用后端旧资源。维护会话应结合退役记录、所有现存调用方和后端 Impact 决定旧资源处理；角色抽屉仍需要的角色接口必须保留。不存在于某次导出数组不能作为删除依据。

## 6. 验证记录与未通过项

- 已通过：Lint、生产/Preview/测试 TypeCheck、生产/Preview Build、54 项治理测试、旧页退役检查、新七页 production Contract 校验。Premium 严格交互审计为 0 findings；构建仍有包体积提示，设计检查仍提示既有主色对比度不足。
- 三视口专项复测：`form-drawer-unsaved`、`iam-foundation-previews`、`iam-member-roles-drawer` 共 33 项通过。覆盖分配/移除角色、失败保留选择、取消关闭保留草稿、只读权限边界、旧后端菜单不得复活旧路由，以及隔离 Preview。
- 全量 `pnpm quality` 中视觉测试原始结果：439 通过、74 失败、24 跳过。74 项包括 69 项截图基线差异、3 项 `/iam/training/overview` 横向溢出、2 项旧页面/按钮定位断言。后两项已迁到有效页面，并纳入上述 33 项独立复测通过；没有重新跑第二次全量测试，不把复测结果冒充全量全绿。
- 截图差异涉及登录、基础资料、培训、框架等；本次未逐项完成原因归属，也未自动重录已批准基线。新七页的三视口批准基线测试通过。培训概览不是本次修改对象，溢出另列待修。
- 浏览器验证使用项目 Playwright 与模拟 API，不代表真实后端写入联调通过。Ego 浏览器运行环境当前不可用，因此采用已有测试工具。一次并行补测遇到全量测试关闭共享预览服务，已在服务独立运行后完整重跑上述 33 项通过。

结论：旧页隔离和角色抽屉可以交接；工程全量质量门禁仍未全绿，附件 P0 自动维护协议也尚未完成，不能据此执行全站自动初始化或授权。

## 7. 六个保留页面资源标记增量验证

- 六页 Menu 编码保持稳定，补充 24 个独立业务 Button；查询/取消等读取或本地交互引用所属资源，抽屉不另建路由。注册表、兼容目录和 `artifacts/iam-resource-elements.json` 已关联，漏标检查加入 Lint。
- Lint、生产/Preview/测试 TypeCheck、生产/Preview Build、63 项治理测试、3 项生产路由测试通过；Premium 严格审计 0 findings。复用现有 Canonical View、公共组件和样式，未改 Design Token、审批或基线。
- `iam-resource-elements.spec.ts` 三视口 39 项通过：六页 Production/Preview 的页面、操作和抽屉标记，以及无权限按钮不因标记而显示。浏览器运行期未发现相关 console error/warning。
- 新增了测试环境的 `CurrentPageResources` 默认拒绝模拟，避免基础页测试请求真实后端并被 401 注销；专门验证 V2 授权的测试继续使用自己的明确授权响应。没有改变生产 API 或权限判断。
- 补齐模拟后完整重跑 `pnpm quality`：视觉部分 **480 通过、72 失败、24 跳过**；72 项为 69 项既有截图差异及 3 项培训概览横向溢出，未自动重录基线。全量门禁仍失败，不宣布全仓质量通过。
- 本轮不声明其余页面已完成元素覆盖，也不声明后端 Function 绑定/Permission/Package 模板完整，不执行在线初始化或授权。仅有静态资源码和标记，不能替代维护 Skill 的全站发现与通信追踪。

## 8. 维护协议阶段验证（后端 Function 清单补齐后）

本节是本次最新验证记录；§6、§7 保留为历史记录，不与本节测试次数相加。

- 通过：Lint、生产/Preview/测试 TypeCheck、生产/Preview Build、74 项治理测试、3 项生产路由测试。生产和 Preview 构建仍有既有的大包提示。
- 三视口专项测试 **162 项通过**：新七页正式绑定与隔离 Preview、13 页相关资源标记、用户角色抽屉、拒绝授权时按钮不显示、错误恢复与版本冲突。视口为 1366×768、1440×900、1920×1080。
- 新七页已批准 Preview 基线 **21 项通过**，没有修改 Approval Record 或重新录制基线。Premium 严格交互审计为 **0 findings**。
- 本轮完整 `pnpm quality` 的原始视觉结果为 **486 通过、90 失败、24 跳过**。其中 18 项由三个 Teleport Dialog 上使用运行时资源指令引发 Vue 警告；已改用属性标记并增加静态反例检查，修复后的上述 162 项与 21 项专项测试均通过。没有重跑修复后的第二次全量测试，不将专项复测冒充全量结果。
- 另外 72 项失败与上一轮记录一致：69 项截图基线差异、3 项培训概览横向溢出。仍未完成全量质量验收；本次不改业务布局或批准基线来消除这些失败。
- `pnpm iam:maintenance:check` 通过，`pnpm iam:maintenance:ready` 按预期非零退出：13/43 个组件路由已登记，44 个 Permission 模板、13 个 Package 模板，1,648 个通信候选仍待逐链审查。候选含本地事件与共享回调，不代表 1,648 个实际接口。
- 所有 Permission 的 `communication_review_complete` 仍为 false；全量 `complete=false`、`ready_for_sync=false`。后端文档与编码来源已齐备，剩余是前端链路审查及 16 个正式入口迁移，不是等待后端继续补文档。
- 浏览器验证使用项目 Playwright 和模拟 API；没有真实后端写入联调、线上 Manifest/数据库回读或维护授权操作。Ego CLI 当前不可用，使用已有 Playwright 作为验证替代。

交接结论：完整协议、独立发现、精确映射、静态门禁及七页增量标记已可复查；**首批全通信链案例和全站迁移尚未验收，不能宣布 P0 全部完成或执行全量同步**。
