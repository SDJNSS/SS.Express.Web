# 通信证据增量复核（2026-10-16）

## 范围与结论边界

第一阶段由 Codex 单 Agent 复核 `auth.login` 暴露出的共享依赖漂移，以及同一轮当前 Tenant 收窄、接口迁移、Int64 字符串兼容和权限编辑的源码增量，只修改前端离线声明及证据。第二阶段按用户要求补系统资源页面新增/编辑（见末节）；全程不调用维护写接口、不改数据库、不分配角色权限、不更新 UIDesign Approval 或视觉基线。

`auth.login` 的原 14 项依赖变为 16 项：`authSession.ts` 和 `httpClient.ts` 内容改变，增加 `tenantContext.ts`、`entityId.ts`。错误不是登录接口失败。其余链共享这些依赖，不能只修第一条记录后把整个清单当作已复核。

## 逐组复核

| 组 | 实际行为与增量结论 | 回归依据 |
| --- | --- | --- |
| 登录与共享传输 | LoginPage → loginApi.login → POST Auth/Login；`authMode=none`、`retryAuth=false`，不要求先选 Tenant。authSession 仍只读写会话；HttpClient 按 Token/Tenant/sessionVersion 丢弃旧响应，tenantScoped 请求发送前核对租户。拦截器注册及重试不是新业务端点，具体接口身份仍归调用方。 | iam-login-production、http-client、entity-id |
| 会话切换 | FoundationSession 只用 Auth 下发的 availableTenants 作为切换候选，不再额外 QueryUsers。SwitchTenant 携带旧会话版本，确认新 Token/Tenant 后替换会话并清缓存；tenantSwitchSignal 只通过 storage/visibility 通知其它标签页重新验证。 | iam-foundation-production、http-client |
| 当前 Tenant 员工/角色 | 员工查询、筛选候选及写后刷新只使用当前 Tenant；角色管理/成员页移除 Tenant 选择和多余候选请求。已移除的用户跨 Tenant 编辑、QueryUserTenants/UpdateUserTenants 调用不再保留为前端可达链；后端 Function 本身不因此退役。QueryUsers 与 QueryFilterOptions 的新调用点仍按原 Method/Path 对应权威 Function。 | iam-membership-query-contract、iam-membership-regression、iam-access-control-production |
| 权限治理 | API postIam 在显式 ID 字段清单上做无损规范化；不转换 VersionToken。页面路由参数和选择值保留字符串 ID。角色 metadata.can_maintain 不再误作为权限包授权开关，保存仍检查精确 Button 与角色状态。权限名称编辑新增 Get → Update → 原条件 Query；Create/Copy 与编辑为互斥分支，未知结果重试保持原 payload/request_id。 | iam-permission-governance-production、entity-id |
| 培训 | 两个 API transport 及三个导出调用增加 tenantScoped；Method/Path 不变。三个 onMounted 只移除 document.title 赋值，原 loadOptions/list/statistics 请求保持。 | training-content-production、training-operations-production、http-client |
| Shell / 路由 / Drawer | AppLayout 的组织入口改为导航选租户；路由守卫执行精确 CurrentPageResources，不赋予父级隐含权限。Forbidden 的切换租户按钮只导航。FormDrawer 新 watch 只更新未保存状态集合，取消不清空输入；导航确认由既有 ElMessageBox 承载。AppShell 品牌和账户展示不增加平台 API。DMS scope 增加会话识别，不新增端点。 | production-routing、platform-framework-production、form-drawer-unsaved、platform-shell-branding |
| 占位证明 | FeatureScaffoldPage 无 API，PageHeader 只向 AppShell 的目标容器 Teleport。更新 AppShell 依赖摘要不代表放行真实业务通信；八条占位路由保持 placeholder 且生产导航隐藏。 | governance placeholder tests、production-routing |

## 记录修订原则

- 只对上述已读取、已追踪的变更及受影响闭包重新绑定摘要；原本未变化的候选分类与 Function 身份保持。
- 请求 AST 变化使用显式旧/新候选映射；确已删除的 UI/请求移除对应调用点，不能把不存在的请求伪装成 local。
- 新增编辑打开/保存分别建链。表单显示、loading、model 和未保存状态观察属于本地交互；提交与重试归实际业务链。
- 新发现、未解释的候选使修订过程失败，不自动登记 reviewed。校验器与 ready 门禁不降级、不关闭。
- 复核包含静态追踪和模拟接口回归；不据此宣称真实数据库、SA 或普通用户在线授权已验收。

## 系统资源页面后续增量

新增/编辑仅维护资源事实，前端 Button 分别绑定 Create/Update 与必要 Query/Get。后端 Function 独立 parent_id=0；前端树遵循 Module → Menu → Button/ButtonPage。受管资源遵循后端写入约束，禁止绕过维护归属或自行改稳定资源编码。新按钮必须按精确资源返回值判权。

2026-10-17 已逐项核对本次新增：CREATE/UPDATE 两个精确 Button；编辑打开 Get（必要时 App Query）；父级选择仅同 App、frontend、active、合法类型，按20条远程分页；保存 Create/Update 后保留列表条件 Query。表单初始化、输入、类型切换及显示状态不触网。提交和原请求重试为 create/edit 互斥分支，request_id 同时写 Body/Header，编辑保留 VersionToken 与字符串 ID，未提交维护元数据由后端保留。共享 PagedEntitySelect 仅扩展泛型及 shallowRef 保留字符串身份，不新增端点，原数字消费者行为不变。纯表单映射、DTO、注册表及生成常量无网络副作用。

人工 Create 传空编码，等待 IAM 支持服务端生成；用户已确认自己通知后端。此协议准备与模拟提交测试不代表真实新增联调通过。新增代码带来的依赖摘要仅对上述已解释变更刷新，未知候选仍阻断。新链分别覆盖 edit-open、parents、create、update；共享选择器的消费者边界补充该资源表单。

## 本轮验证结果（2026-10-17）

- `iam:maintenance:generate/check` 通过：225 个源码、1,670 个候选、0 未解释；96 个 Permission、29 个 Package、67 个业务 Button。声明完整不等于数据库或运行时授权已验收。
- Lint、94 项治理测试、生产/Preview/测试 TypeCheck、生产/Preview Build、生产路由检查、Premium strict audit 通过。
- Chromium、zh-CN、Asia/Shanghai，1366×768、1440×900、1920×1080：新增、最新版本编辑、Int64 父级选择、失败保留输入、未知结果原请求重试、精确 Button 拒绝、Preview 隔离均通过。Browser 插件不可用，Ego CLI 未安装，使用项目 Playwright；QA 图片在系统 Temp 的 `ss-express-resource-create/edit-desktop-*.png`，没有写入批准基线。
- 全量 `pnpm quality` 已执行至浏览器阶段：612 通过、24 跳过、75 失败。其中72项为批准截图差异（包括本次目录变化与既有差异）；另外3项为同一403测试的共享Fixture默认授权与“无权限”断言矛盾。该测试现已明确排除目标隐藏页，独立三视口重跑6项全部通过，未修改业务守卫。故全量质量仍不能宣称全绿。
- 系统资源 Contract base/preview 通过；production 因人工 Create 编码协议未联调，以及 revision 4 尚无匹配人工 Approval 而阻断。原 Approval/基线未更新。
- 两个新增 Button 及模板仅登记于前端离线产物，未写数据库、未同步资源或角色授权。

## 2026-10-17 列表操作密度增量

用户要求除员工管理外移除重复详情操作，由对象名称进入原有详情；操作列按可见按钮自动收紧。只调整 Canonical View 与共享 DataTable/RowActionGrid，Preview 和生产复用同一实现；不变更 API、请求体、Function、Permission/Package 成员及在线授权。

- Tenant、岗位、角色把已有详情事件从编码移到名称，删除重复详情与整行打开监听；资源、权限、权限包、课程、题目、试卷、考试配置沿用已有名称/题干事件。培训计划沿用原隐藏详情路由，并把原详情权限门禁保留在名称上；计划员工入口不变。
- 员工管理保留详情按钮；员工培训档案名称打开原档案，删除重复查看档案与空操作列。其它数据操作只取消固定列宽，不改变原提交、确认或权限判断。Dashboard/Reference 仅迁移已有本地演示入口，不新增真实详情能力。未注册独立 TrainingTaskPageView 只调整列宽，不恢复退役入口。
- DataTable 新增挂载布局观察：ResizeObserver、MutationObserver、requestAnimationFrame 仅发现延迟渲染的操作组、测量 DOM、更新列宽。RowActionGrid 新增挂载观察仅统计未被权限隐藏的直接子元素，控制最多三轨布局。两项生命周期候选均为 local；原 selectionChange/rowClick 委托事件仍独立保留原调用链，不能把整个组件分类为无通信。
- 本次显式删除22个重复详情/行点击候选，保留名称入口对应的原请求链；新增2个纯布局挂载候选。API Request 候选及权威 Function 内容未变化。21个正式扫描源码的变化均为上述布局/入口调整，48个源依赖闭包受影响；只重新绑定此已审差异，没有自动批准新未知候选。
- UIDesign Page Contract 记录本次布局/入口修订；不修改人工 Approval 或截图基线。线上数据库、部署和真实账号权限未验证，本次不执行在线资源同步。

后续同范围补查：计划详情的任务子列表也删除重复“查看任务”和整行打开监听，继续使用已有 taskDetail 名称入口及 canViewTaskDetail 门禁；删除2个旧候选（本轮合计24个），没有新增请求。最终扫描为225个源码、1,648个候选；其它通信/授权结论不变。

计划名称的详情 ButtonPage 门禁隐藏链接时，保留不可点击的名称文本；只是条件展示降级，不新增通信或放宽路由权限。

### 列表增量验证

- 最终 Lint、生产/Preview/测试类型检查、生产/Preview Build、Premium strict audit（0发现）、离线维护检查通过；治理测试100项通过。
- 使用项目 Playwright 验证 Chromium、zh-CN、Asia/Shanghai 的1366×768、1440×900、1920×1080；Browser插件不可用、Ego CLI未安装。名称键盘打开、原详情/API回读、编辑、授权拒绝、按钮权限隐藏/恢复、列宽收缩、角色成员、计划任务子列表、计划名称无权限降级均已覆盖；截图检查无裁切、页面横向溢出或新增运行错误。
- 全量 `pnpm quality` 的浏览器阶段为612通过、24跳过、84失败。其中78项为批准截图差异（含历史差异及本次列表变化），6项为员工列表旧固定宽度断言；固定宽度断言已改为“列宽等于实际可见操作组＋内边距”的同一自适应契约，未放宽为更大的任意阈值。最终30项定向三视口复验全部通过，覆盖这6项及本次列表、权限拒绝和编辑链；尚未重新执行整套截图回归，不能宣称全量质量全绿。
- 最终复验命令：`pnpm exec playwright test tests/visual/compact-row-actions.spec.ts tests/visual/iam-member-roles-drawer.spec.ts tests/visual/iam-tenant-forms.spec.ts tests/visual/iam-permission-governance-production.spec.ts --grep '对象名称|子列表|员工保留|无培训计划|member role drawer assigns|member drawer preserves|resource markers do not|edits permission metadata from detail|resource mutation actions|hides company' --workers=3`。QA图片在系统Temp的 `ss-express-compact-*.png`；人工Approval、批准基线未更新，没有真实业务写入。
