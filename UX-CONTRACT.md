# SS.Express.Web UX Contract

本文件定义 IAM、TMS、VMS 等子系统必须共享的可观察交互行为。视觉意图和值见 `DESIGN.md`；页面业务规则与例外只写入对应 PRD 和 `docs/page-specs/` 下的 Page Contract。

## Product context

- Audience: 物流运营、调度、车务与平台管理员。
- Primary jobs: 在统一 App Shell 中检索、比较、创建、编辑和跟踪物流运营对象。
- Target market(s): 当前只确认中文企业物流后台；页面 PRD 负责给出更具体的市场与业务范围。
- Active locales: `zh-CN`。
- Language/content register and native-review policy: 简体中文、业务直述、动作使用明确动词；面向外部发布的关键文案由产品/领域人员复核。
- Timezone/calendar policy: 测试环境固定 `Asia/Shanghai`；业务数据的源时区、日期类型和日历语义必须由 Page Contract 引用 API/PRD，不由前端猜测。
- Accessibility target: WCAG 2.2 AA；当前尚无独立自动化 a11y 套件，浏览器键盘与语义检查是页面进入批准前的最低证据。

## Business-context sources

业务政策不在本文件复制；新页面必须在 Page Contract 中补齐适用来源后才能进入 production profile。

| Domain / scope               | Authoritative source                                                            | Source type                  | Reviewed date |
| ---------------------------- | ------------------------------------------------------------------------------- | ---------------------------- | ------------- |
| Permission model             | `docs/permissions/platform-framework-shell.md`、`docs/api/iam-shell-context.md` | Permission policy / API      | 2026-09-11    |
| Data lifecycle               | 待目标页面绑定 PRD 与 API 契约                                                  | API / Domain spec            | 未配置        |
| Deletion / retention         | 待涉及删除的页面绑定领域/隐私策略                                               | Privacy policy / ADR         | 未配置        |
| Billing / payment            | 当前项目基础工作流不配置；相关页面必须单独提供                                  | Billing spec                 | 不适用        |
| Legal / regulatory copy      | 待相关 PRD/法务来源                                                             | Product brief / Legal review | 未配置        |
| Market / content conventions | `DESIGN.md` 与已批准相邻页面；具体业务由页面 PRD 提供                           | Design context / PRD         | 2026-09-03    |

## Visual contract

- Project `DESIGN.md`: `DESIGN.md`。
- Token ownership model: existing runtime canonical（Model B）。
- Runtime design-system/token source: `src/shared/styles/tokens.scss`。
- Mapping/export/adapters: `standards/registry.json`、同文件 Element Plus 变量、`src/shared/styles/runtimeTokens.ts`。
- Token drift gate: `pnpm design:check`。
- Supported themes: Light；forced-colors 由系统接管必要对比度。
- Density contract: 全局采用高密度桌面运营档位；13px 正文、28px 常规控件、34px 表头、36px 数据行、12px 页面/卡片内边距、8px 区段与表单间距，App Shell 顶栏及展开/折叠侧栏为 48px、200px/56px。辅助文字不得低于 12px，紧凑次级操作不得低于 24px 点击高度。生产与 UIDesign 必须共同加载同一个 Element Plus Token 适配，页面不得自行放大控件或恢复松散间距。
- Design-context owner/review policy: 全局视觉决策必须同时修改运行时 Owner、`DESIGN.md` 与检查；单页差异进入 Page Contract，不得反写全局规则为其开脱。

## Canonical UI Map

| Capability      | Canonical owner                                                                                | Source of truth                              | Allowed variants                                       | Verification                                       |
| --------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| App Shell       | `src/shared/components/AppShell.vue` + `src/app/layouts/AppLayout.vue` 生产绑定                | `DESIGN.md` + 本契约 Navigation              | flat navigation / grouped navigation；collapsed rail   | 三视口 Browser Test + production visual regression |
| Authentication  | `src/shared/components/page-templates/AuthPageTemplate.vue` + IAM Canonical Page View          | IAM PRD/API/安全策略 + 本契约 Authentication | credentials / focused recovery；其他方式必须有权威来源 | validation + keyboard + failure-path E2E           |
| Table Selection | `src/shared/components/DataTable.vue` + Element Plus table selection                           | 本契约 Dataset navigation + Page Contract    | page；all-results 仅在 API/PRD 明确时                  | `ui:typecheck` + 页面 E2E                          |
| Row actions     | `src/shared/components/RowActionGrid.vue`                                                      | `DESIGN.md` + 本契约 Dataset navigation      | 固定三列、紧凑行距；隐藏项由权限指令移除后自动补位     | 三视口 Browser Test + 权限状态检查                 |
| Select/Listbox  | Element Plus `ElSelect`（全局 `zh-CN` Provider）及 `src/shared/business-components` 业务选择器 | `DESIGN.md` + 本契约 Forms                   | authored                                               | 键盘、打开态 popup、三视口 Browser Test            |
| Date            | Element Plus `ElDatePicker` + dayjs/`DateTimeText.vue`                                         | Page Contract 引用的 API 日期语义 + 本契约   | typed / authored                                       | locale、键盘、打开态 E2E                           |
| Form            | Element Plus `ElForm` + `FormDialog.vue` / `FormDrawer.vue` / `FormPageTemplate.vue`           | 本契约 Validation + Page Contract            | create / edit                                          | validation E2E + failure path                      |
| Scrollbar       | `src/shared/styles/scrollbars.scss` 全局基线                                                   | `DESIGN.md` + runtime tokens                 | 仅 geometry/semantic exception                         | computed style + 三视口 Browser Test               |
| Toast           | `src/shared/services/notification.ts`                                                          | 本契约 Overlays and feedback                 | success / warning / info / error                       | shared service scan + live-region Browser Test     |
| CRUD            | Page Contract + Feature route/binding + Registry Page Template                                 | 本契约 Flow ledger                           | return-to-list / stay-in-context（命名变体）           | full-flow E2E + production profile                 |

## Component behavior

| Component    | Default                               | Hover                   | Focus               | Active            | Disabled             | Busy                   | Error                         |
| ------------ | ------------------------------------- | ----------------------- | ------------------- | ----------------- | -------------------- | ---------------------- | ----------------------------- |
| Button       | 明确动词与层级                        | 可辨识且 pointer        | 2px focus ring      | 不改变几何        | 不触发动作并说明原因 | 保持尺寸、阻止重复提交 | 页面/表单保留恢复路径         |
| Icon button  | 中文可访问名称                        | tooltip 仅作补充        | 可见 focus          | 真实按压反馈      | 不可点击             | 保留占位               | 不只依赖 toast                |
| Input        | 有可见或程序化标签                    | 边框反馈                | focus token         | n/a               | 说明不可用原因       | adornment 槽位稳定     | 文本错误与字段关联            |
| Secret input | 默认遮罩                              | 同 Input                | 同 Input            | reveal 按钮有状态 | 不泄露值             | n/a                    | 不写入 URL/日志/toast         |
| Search       | 非空时可清除；显式查询默认不 debounce | 同 Input                | 清除后回焦输入框    | 查询重置页码      | n/a                  | 结果区域保持几何       | 可重试且保留条件              |
| Textarea     | `resize: none`，给足默认高度          | 同 Input                | 同 Input            | n/a               | 说明原因             | 提交态由 Form 管理     | 保留非敏感输入                |
| Table/list   | 表头、范围、总数与分页稳定            | 行 hover 不代替操作入口 | 操作/排序可键盘访问 | 选择范围明确      | 边界按钮不移除       | 表框不跳动             | 区分 empty/no-results/failure |

## Dataset navigation

- 租户范围分页实体候选统一使用 `src/shared/components/PagedEntitySelect.vue`：Element Plus authored Select、分页20条、300ms远程搜索、Abort/请求代次防旧响应、scope改变清空旧候选、选中标签固定保留、失败重试和键盘翻页。接口 loader 由Feature注入，不在共享组件绑定业务权限。
- 用户成员表允许 `RowActionGrid density="compact"`，保留三列、24px最小点击高度，额外行间距0、列间距4px（均使用已有Token）。

- Admin tables: 默认服务端分页；不得把未知或可能很大的数据集一次加载到客户端。
- Exploratory lists: 只有 PRD 明确连续浏览目标时才选择 Load more / infinite scroll。
- URL state: 新列表页默认把已提交查询、筛选、排序、页码和页大小写入 URL；敏感、瞬时或架构受限状态必须在 Page Contract 记录例外。现有未迁移页面是已知差距，不构成新页面先例。
- Page size: 默认 `[10, 20, 50, 100]`；切换大小回到第 1 页，删除最后一行后夹紧到有效页。
- Empty/no-results/error/loading treatment: 空数据说明该区域用途；无匹配结果提供清除筛选；失败保留条件并提供重试；加载保持表格容器和分页位置稳定。
- Back/scroll restoration: 返回拥有者列表时恢复 URL 状态和合理滚动位置。
- Selection scope: `DataTable` 默认只选择当前页；选择全部结果必须显示精确范围、数量、过滤变化影响和批量确认，且需 API/PRD 明确支持。

## Flow ledger

| Operation                  | Trigger           | Pending                     | Success destination                | Success feedback              | Failure recovery                    | Focus outcome      | Source ref                           |
| -------------------------- | ----------------- | --------------------------- | ---------------------------------- | ----------------------------- | ----------------------------------- | ------------------ | ------------------------------------ |
| Create                     | `新建{对象}`      | 按钮/表单稳定 busy          | 默认返回拥有者列表并保留可适用筛选 | `{对象}已创建`                | 保留非敏感输入、字段/表单错误、重试 | 新行或列表标题     | Premium default；页面 PRD 可命名变体 |
| Edit                       | `保存`            | 阻止重复提交                | 遵循相邻流程；默认返回拥有者列表   | `修改已保存`                  | 保留输入、映射字段错误、重试        | 更新行或列表标题   | 本契约；页面 PRD                     |
| Delete                     | 使用真实业务动词  | 对话框内 pessimistic busy   | 当前有效上下文                     | 对象与结果明确                | 对话框保持打开并提供重试            | 下一对象或列表标题 | 必须引用生命周期/权限来源            |
| Search                     | `查询` / 清除条件 | 保留框架，取消/忽略旧请求   | 同一路由 URL 状态                  | 结果范围/总数                 | 条件保留、错误区重试                | 输入框或结果标题   | 本契约 Dataset navigation            |
| Bulk action                | `{动词}已选 N 项` | 锁定重复操作                | 当前列表有效页                     | 成功/失败数量                 | 保留失败项与恢复路径                | 批量工具栏或下一行 | 必须引用 PRD/API/权限                |
| Upload/background job      | 业务明确动词      | 真实阶段/进度               | 可返回的任务上下文                 | 不伪造完成                    | 取消/重试/返回路径                  | 任务状态标题       | 仅适用页面 PRD                       |
| Cancel/back                | `取消` / `返回`   | 无                          | 发起上下文                         | 通常无 toast                  | 脏表单使用应用内确认                | 原触发点/列表标题  | 本契约 Navigation                    |
| Soft-delete                | `停用` / `归档`   | 对话框内 busy               | 有效列表页                         | 可恢复时提供真实 Undo/Restore | 保留失败上下文                      | 下一对象           | 必须引用领域/留存来源                |
| Hard-delete (irreversible) | `永久删除`        | 强确认、pessimistic         | 有效父上下文                       | 不提供虚假 Undo               | 未确认成功前不关闭                  | 下一对象/父标题    | 缺权威来源时阻断                     |
| Sign in                    | `登录`            | 按钮稳定 busy、阻止重复提交 | 回跳或默认首页由 IAM 契约确定      | 通常无 toast                  | 表单内通用错误、保留账号、清空密码  | 错误摘要或目标页   | 必须引用 IAM PRD/API/安全策略        |

## Navigation and responsive behavior

- Route document title policy: `{页面} · 陆链控制台`；加载、403、404 和错误路由也必须给出诚实标题。
- Implementation visibility policy: `meta.implementationStatus = 'placeholder'` 表达实现状态而非授权。生产环境不得从服务端菜单、App 首入口或 Overview 卡片暴露这类入口；直接地址保留并明确显示“功能开发中”。`/reference/*` 仅用于开发环境的标准实现复用，不属于生产导航或动态页面注册范围。
- Route error / 403 page behavior: 404 与权限不足必须区分并保留 App Shell 导航。当前无权限重定向总览属于迁移缺口；新增/触及权限路由不得继续复制该行为，具体披露范围由权限政策决定。
- Breadcrumb/tab/route-state policy: 面包屑表达层级，路径、分隔符与最后一级标题共享同一垂直中心线；最后一级同时是生产页面唯一可见的 `h1`。页面级通用动作装配到面包屑右侧。普通无壳层 Preview 仍由 `PageHeader` 展示标题、说明和动作。可书签的 Tab 和列表状态进入 URL。
- Sidebar/drawer/bottom-sheet transformation: 当前仅支持桌面持久侧栏；不得在没有需求和验证的情况下宣称移动端 Drawer/Bottom Sheet 支持。
- Sidebar control/account policy: 收起控制固定在侧栏右侧中部，展开态为左箭头、收起态为右箭头；账户区域固定在侧栏底部，展开态左侧显示头像、右侧以较大用户名和较小当前 Tenant 名称上下排列，折叠态保留可访问的头像入口。当前会话 Tenant 不再由内容页重复展示；目标用户或目标业务对象的 Tenant 选择仍是页面任务上下文，不能据此删除。
- System-switcher separation: 顶部子系统入口之间使用半透明分割线；分割线只表达边界，当前系统仍由文字颜色和底部指示条共同表达。
- App content containment: 生产路由只向 `AppLayout` 提供页面内容；页面根使用 `AppPage + Registry PageTemplate` 或已登记的等价全页组件。页面根不得复制 `AppShell`、使用视口单位/桌面视口级固定宽高，且必须在三个 Registry 视口中完全位于 `app-shell__content` 内、无页面级横向溢出。普通 `ListPageTemplate` 默认使用 natural/page 策略：结果面随当前页行数和页大小自然增高，由 `AppPage` 独占页面纵向滚动；DataTable 只拥有横向滚动，不以内部纵向滚动截断当前页。只有 Workspace、Drawer 或 Page Contract 明确的固定数据面板可使用 contained 内部纵向滚动。其他 Pattern 负责正常高度下的首选纵向滚动，`AppPage` 在所有滚动模式下保留纵向 `auto` 兜底；浏览器高度动态缩短或内容超过模式上限时必须自动出现可用滚动条。Feature 页面根不得使用 `overflow: hidden/clip` 或 `overflow-y: hidden/clip` 截断兜底。`DetailPageTemplate` 默认使用 `page` 模式，并由 `AppPage` 独占普通详情长内容的纵向滚动；只有固定高度表格/标签页工作区使用显式 `contained` 详情变体。`WorkspacePageTemplate` 默认使用 `contained` 模式；普通长内容可显式使用 `scrollMode="page"` 并由 `AppPage` 独占纵向滚动。超长树形工作区使用 `scrollMode="capped-page"`，默认上限为两个 `AppPage` 内容区高度；页面滚动到上限后，超出数据由树或数据面板内部滚动，主从面板使用 sticky 保持任务上下文。三倍高度只允许 Page Contract 明确登记的例外。
- Responsive table strategy: 三个桌面视口默认保留表格关系与可见横向滚动；不静默隐藏字段。
- Truncation/full-value access: 主标签、错误和关键比较值优先换行；标准列表的普通文本单元格最多展示 20 个 Unicode 字素，超过后使用单一省略号，并通过鼠标与键盘均可到达的 tooltip 提供完整值。实际列宽不足时同样提供完整值。业务关键值若必须完整比较，应显式关闭截断或提供复制路径；不得按 JavaScript UTF-16 长度错误切断 emoji、组合字符或中英文混排。
- Row action layout: 列表行操作按读取顺序每行最多展示三个，超出后纵向扩展；不得用“更多”浮层掩盖常用动作或依赖浮层解决操作列宽度。权限隐藏后剩余动作自动补位，危险动作仍遵循确认契约。
- Focus restoration and sticky-obstruction policy: 路由后聚焦页面标题或预期任务点；Dialog/Drawer 关闭后回到触发点；粘性区域不得遮挡焦点。

## Overlays and feedback

- Dialog primitive: Element Plus `ElDialog` / `ElDrawer` 经共享 Form/Detail 封装；Popover 确认仅适合低复杂度、后果明确的操作。
- Destructive confirmation levels: 可恢复使用 warning/outline；永久删除、权限和外部副作用使用 danger 明确确认；不得调用浏览器原生对话框。
- Toast placement/duration/deduplication: 只经 `notification.ts`，顶部稳定位置、同内容合并、默认约 3 秒、允许关闭；关键错误同时保留在作用域内。
- Alert/banner scope and persistence: 字段错误就地、页面条件用 Page Banner、全局故障才用 Global Banner；条件仍存在时不自动消失。
- Tooltip delay/dismissal: 补充说明而非承载关键指令；键盘 focus 可见，Escape 可关闭。
- Unsaved-changes behavior: 脏表单站内导航使用应用对话框，浏览器离开仅使用窄范围 `beforeunload`。
- Layer/z-index contract: App Shell < Drawer/Dialog overlay < Popover < Toast；新增层级必须通过共享 Token/组件解决。

## Authentication

- 登录发生在认证前，使用 Registry 登记的 `StandaloneAuthLayout + AuthPageTemplate`；不得显示登录后 `AppShell`，也不得由 Feature 复制壳层。
- 凭据表单使用 Element Plus Form，禁用浏览器原生验证气泡；账号使用 `autocomplete="username"`，现有密码使用 `autocomplete="current-password"`，允许粘贴和密码管理器。
- 密码默认遮罩，显示/隐藏使用真实按钮、中文可访问名称并保持输入焦点。
- 无效凭据只显示不泄露账号是否存在的通用错误；网络、限流、锁定、验证码、MFA 和找回密码行为必须来自 IAM 权威来源。
- 找回入口可以先验证账号字段与候选状态，但提交后的反馈必须保持通用，不确认账号是否存在；验证码通道、频率、有效期和返回登录路由必须在生产绑定前由 IAM 来源明确。
- 提交中保持按钮尺寸并阻止重复提交；成功后的默认首页、原路回跳和会话持久化不得由前端自行推断。
- “记住我”在 Preview 中只验证控件状态；进入生产前必须由 IAM 安全策略明确持久化内容、期限、撤销和共享设备行为。

## Async and resilience

- Mutation default: pessimistic。只有低风险、幂等、可准确回滚且冲突可处理时才允许 optimistic。
- Idempotency and duplicate-submit policy: UI 阻止重复操作；外部副作用必须引用 API 幂等契约。
- Auto-save/draft recovery: 默认不启用；启用前明确本地/服务端、保留期、敏感字段和冲突策略。
- Offline/read-stale/write behavior: 可保留可读旧数据并标注；默认不离线排队写入。
- Retry/backoff/timeout behavior: 只自动重试安全幂等请求，次数有界；不确定完成状态先查询/刷新再允许重试。
- Version conflict and multi-tab behavior: API 有 version/ETag 时使用；无契约不得静默覆盖。
- Session expiry/re-authentication: 保存安全输入并返回原任务；401 与 403 分流，禁止重试循环。
- Long-running progress and return path: 有总量才显示百分比，否则显示阶段；长任务提供返回路径。
- Stale-request cancellation/invalidation and pending-state ownership: 远程查询必须 Abort 或 request-id 防旧响应覆盖，旧请求不能清除新请求 pending。
- Dialog/form preservation and retry after mutation failure: 服务端确认前不关闭；失败保留上下文、错误和重试/取消路径。

## Validation

### File upload

- `FileUploader` 是上传状态 Owner，`ImageUploader` 复用它；集团、Tenant、用户图片字段统一使用 `ImageAssetField`。
- 仅生产 `AppLayout` 注入 DMS transport；UIDesign 不注入，不发送上传或取链请求。
- 选择时验证类型、空文件、大小及数量；上传/校验中和失败未处理时禁止提交业务表单，失败保留选择并提供重试、取消、移除。
- 上传的网络重试复用同一任务幂等键；重新选择生成新键。离开抽屉取消请求；身份、Tenant、App 改变后不应用旧结果。
- 图片业务数据保存 `logo_file_id` / `avatar_file_id`，课程视频使用 `file_id` 引用。临时访问 URL 仅存在展示状态，不写入业务字段或浏览器持久存储。
- IAM 集团、Tenant、用户图片（含编辑回显和框架头像）直接展示信息接口返回的 `logo_url` / `avatar_url`，不调用 `GetAccessUrl` 或自动续签；URL 缺失显示原有占位，重新查询信息时更新图片。上传后先本地预览，保存文件 ID；展示 URL 不作为文件引用回写。访问 OSS 不附加后台 Token。
- 服务端 `ValidateVideo` 确认后才可使用视频；时长以服务端 `media_duration_ms` 为准，课程秒数向上取整与后端一致。

- Schema/validation layer: 优先 Element Plus Form + Feature 类型/规则；具体字段规则来自 PRD/API，不在页面临时发明。
- Trigger timing: 首次提交后，对已出错字段在 change/blur 时更新；不在初始输入时持续报错。
- Error summary/inline policy: 长表单提供摘要和字段文本错误，错误与字段关联并聚焦首个无效项。
- Server error mapping: 字段错误映射字段，公共错误留在表单/页面，toast 仅作补充。
- Sensitive-value handling: 默认遮罩；不进入 URL、日志、分析、toast 或未经审查的持久存储。
- Product form contract: 禁用浏览器原生验证气泡，阻止重复提交，保留非敏感输入，并对脏表单提供离开保护。

## Permission and clipboard

- Permission UI strategy: 不可发现的全局功能可隐藏；已进入上下文但暂不可用的动作禁用并说明；已认证用户访问受限路由使用 403，是否隐藏资源存在性由权限政策决定。
- Clipboard copy policy: 长编号显示可识别预览并提供明确复制按钮；toast 只说明“已复制”，不回显完整敏感值。
- Disabled-state explanation: 非显而易见原因通过可聚焦说明或 tooltip 给出，禁用不代替服务端授权。

## Migration status

- Migration ledger location: 本节暂作小型台账；出现三个以上迁移切片时再迁移到团队维护的统一计划系统。
- Canonical primitives and owners: Scrollbar 与 Toast 已在本次基础治理中建立；Page Template、DataTable、Form/Drawer 为既有 Owner。
- Current risk-prioritized slices: 403 路由、列表 URL 状态、完整 loading/empty/no-results/failure/permission E2E、确定性字体，以及主操作按钮当前 `4.30:1` 的文字对比度；主色 Token 调整需要单独设计确认并重新评审视觉基线。
- Legacy import/token enforcement: `pnpm standards:check` 阻止新硬编码、跨 Feature 深层导入、重复 App Shell、非标准 AppPage/Page Pattern 与页面根固定视口尺寸；Legacy 原型不作为新页面同源实现先例。
- Rollout/rollback and removal gates: 按页面纵向迁移；新 Page Contract 使用 v0.1，存量 v0 在发生实质改动时迁移，不做大爆炸重写。

## Verification

- Required static commands: `pnpm lint`、`pnpm test:governance`、`pnpm typecheck`、`pnpm ui:typecheck`、`pnpm test:typecheck`、`pnpm build`、`pnpm test:production-routing`、`pnpm ui:build`。
- Browser/device/locale/theme matrix: Chromium、`zh-CN`、`Asia/Shanghai`、Light、三个 Registry 桌面视口；页面适用时覆盖 reduced-motion 与 forced-colors。
- Accessibility checks: 语义、可访问名称、键盘、焦点、对比度；独立自动化 a11y 仍为待配置证据。
- Native-language/domain review and target-user evidence: 候选页面由产品/领域人员在人工批准阶段复核；Agent 不能自批。
- Component-state/visual regression coverage: 已批准 Legacy 生产页面使用 Playwright 三视口基线；新页面先生成 Candidate Preview，不得覆盖批准基线。
- Canonical sibling flow used for comparison: 页面 Contract 必须登记所选的已批准相邻页面或解释无相邻页面。
- Project audit command/result: 使用已安装的 Frontend Design Premium `audit_project.py --mode strict`；CI 不引用本机插件缓存路径。
- CRUD full-flow evidence: 未配置；有 CRUD 页面时由 Page Contract browserTests 提供。
- Failure-path evidence: 未配置；Preview approval 前必须补齐适用场景。
