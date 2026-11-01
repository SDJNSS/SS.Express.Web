# IAM 权限模型 v2 前端需求

日期：2026-10-18（直接 Permission 契约覆盖原旧权限包模型）

本文件是 `iam-permission-scheme-v2-frontend-refactor.md` 的仓库内受控副本，用于 Page Contract、UIDesign Candidate Preview 与生产装配追踪。七个 Candidate Preview 已由用户明确批准，并已装配正式页面与生产路由；三视口视觉基线和 Approval Record 按治理流程固化。后端代码契约已闭环，部署时仍须导入 V3 前端资源目录与后端 Function 目录、执行资源初始化并完成真实数据库联调。

## 统一领域模型

当前 Tenant 成员 → Role → Permission → PermissionRef → Resource。PermissionPackage 已退役；角色保存明确的 Permission ID 集合。SA 同样显式授权，无父子继承或隐式补权。

## 系统资源与前端登记边界

- Module、Menu、Button、ButtonPage 是前端资源；Function 是后端 API 能力资源。
- Menu 承载页面。Button、ButtonPage 与所属 Menu／页面资源通过 `parent_id` 建立父子关系；页面 A 的按钮写入 `iam_resource` 后，其 `parent_id` 必须指向页面 A 的资源 ID。
- 前端根据接口文档识别页面会使用的 API，并写入前端资源注册表。该注册表用于开发与初始化协作，不等同于后端 `iam_resource` 表，也不能作为权限分配结果。
- `iam_resource` 目录只展示资源原始事实。不得在目录列表增加“所属页面”派生列，也不得在资源详情聚合关联 Function、Permission、Permission Package 或方案引用统计。
- 资源被多处引用是正常情况。引用关系只在 Permission、Permission Package 与角色授权页面表达。

## 系统资源目录

页面直接展示 `iam_resource` 数据。支持按 App、资源类型、资源名称或编码和状态筛选；列表突出资源名称、类型、编码、所属 App、父资源 ID 和状态，但不展示“所属页面”列，也不增加数据库中不存在的派生“来源”字段。详情只展示资源本身的数据库字段、路由／组件或 API Method／Path 等适用技术字段和维护信息，不计算关联 Function、Permission、Permission Package 或角色引用。

系统资源目录增量（2026-10-17）：支持精确判权的“新增资源”“编辑资源”及表单抽屉，分别登记 `IAM.SYSTEM_RESOURCES.CREATE`、`IAM.SYSTEM_RESOURCES.UPDATE`。人工新增编码由服务端生成，用户不填写，客户端不创造随机资源身份；后端目前仍要求非空编码，已由用户负责通知改造。编辑前 Get 回读最新版本，所属 App、来源、类型、编码不变。合法父级通过同 App 的 active 前端资源分页搜索；Module/Function 为根，Menu 属于 Module，Button/ButtonPage 属于 Menu/ButtonPage。字段按类型规范化，保留鉴权类别、可组合性、生命周期和维护元数据，Update 不擅自改写维护身份。保存失败保留输入，未知结果仅原请求重试；成功保持列表筛选分页并回读。无资源引用聚合、删除/启停或角色授权扩展。

## 权限管理

原“权限方案管理”调整为 `iam_permission` 的权限管理页。一条 Permission 属于单一 App，由一个前端资源与一个或多个后端 Function 组成，例如：

- 用户列表查询：用户列表 Menu + 用户查询 Function。
- 用户编辑：用户编辑 Button + 用户查询 Function + 用户保存 Function。

列表展示权限名称、权限编码、所属 App、前端资源、后端 Function 数量、状态和版本。查询条件只保留权限名称模糊查询。详情不展示 App 资源分布或适用范围。创建 Permission 时必须先选择 App，再填写基本信息并进入权限功能配置；可选前端资源与 Function 都限定在该 App。

权限列表和详情提供“编辑”入口，按独立资源 `IAM.PERMISSIONS.UPDATE` 判权。编辑前通过 Get 回读最新版本，复用表单修改权限名称、说明和排序；所属 App、系统生成的编码和资源组合不变。通过 PermissionScheme/Update 提交原始版本及幂等 request_id，保存成功后留在列表，保留名称筛选、分页和每页条数并刷新结果。失败保留输入，结果未知时仅允许原请求重试或刷新核对，不静默覆盖版本冲突。

## 权限功能配置

原“权限方案资源编辑”调整为单个 `iam_permission` 的功能配置页，不再显示方案覆盖 App 区域。页面持续显示 Permission 及其唯一所属 App：

1. 先选择一个父节点，候选必定是当前 App 的前端资源。
2. 再选择一个或多个子节点，候选必定是当前 App 的后端 Function 资源。

前端资源是配置根节点，后端 Function 是其子节点。Function 支持按资源名称、编码和 API Path 模糊查询。保存前展示父资源变化、Function 新增／移除和版本摘要；成功后回读服务端结果。版本冲突保留修改意图，超时区分结果未知与明确失败。

## 角色授权

按 App 分组，显式 parent_permission_id 构成页面/操作展示层级；分组和资源只读。复选框只代表当前 Permission。主动勾选时仅沿连续 default_selected_with_parent=true 且有效可授予的子 Permission 默认选中，允许取消；取消父项不撤销子项。加载、搜索、刷新和目录变更不触发联动。全选/清空当前 App 是独立草稿批量操作并显示变更数；保存前展示最终差异，提交明确 permission_ids、role_version、snapshot_version、request_id。候选范围不完整或快照冲突不允许覆盖。

## 用户有效权限

整页只读展示 Role → Permission → Resource 来源；不显示权限包，不通过展示父链推断授权。仅展示当前 Tenant 用户的后端权威结果，未授权父 Permission 缺失时子项仍独立展示。

## 运行时与边界

- 顶部只展示有效可访问 App，名称使用 `app_name`；侧栏只展示 Module/Menu。
- Button、ButtonPage 入口与目标路由均按有效资源控制；直接访问也必须鉴权。
- 权限加载、无权限、失败互相区分，Tenant 切换后不得复用旧 Tenant 状态。
- 本次不新增数据范围配置，不建设 Agent 任务或日志平台，不重写既有业务页面。
- Production Binding 必须使用已登记的稳定前端资源码和后端 Function 资源；任何契约变更都要同步 Page Contract、资源目录与联调测试。

## Permission 展示元数据

新建、编辑、复制明确提交 parent_permission_id（根 null）、default_selected_with_parent（默认 false）。父项只能同 Tenant/App，不能自引用或循环；含写 Function 禁止默认联动。编辑层级不会改现有角色授权。人工编码仍由后端生成。后端成果依据：Doc/Engineering/iam-direct-permission-contract-2026-10-18.md；只升级前端，不执行数据重置或自动补权。完整维护 manifest 为 Schema 3.0，移除 package_templates，保留准确通信证据。
