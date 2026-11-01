# Web 精确权限与前端资源治理：App 端升级交接

日期：2026-10-29。接收方：员工/司机 App 开发会话。

本文总结当前 Web 的实际改造，并提出 App 对齐项；不是 App 已完成升级的证明，也不是数据库同步、角色授权或后端接口变更的执行授权。本次仅编写文档，不修改 App/Web 业务代码、数据库或线上资源。

## 1. 先明确当前基线

- Web 正式工程：`D:/project/SS.Express.Web`。以下 Web 路径均相对于此目录。
- 本次核对的独立 App 工程：`D:/project/driver-app`，uni-app、Vue 3、TypeScript、Pinia，目标为 Android。其 README/AGENTS 仍含历史 `apps/driver-app` 路径，接手会话应先确认自己的实际工作目录，不能改到原工作区的旧副本。
- App 业务页面仍归属自身 `src/modules/**`，路由入口为 `src/pages/**` 和 `src/pages.json`。**复用 Web 的资源协议与鉴权原则，不复制 Web 页面、Element Plus、Vue Router 或桌面尺寸。**
- Web 的部分历史文档仍保留 PermissionPackage、Menu 下挂 Function、CurrentFunctions、Legacy 阶段记录。发生冲突时，应核对当前代码、版本化 Schema、正式路由及最新契约，不按旧文档标题或文件名推断现状。

本轮检查：Web 资源元素及完整维护清单一致性检查通过。生成清单为 Schema 3.0，声明 `complete=true`、`ready_for_sync=true`，但 `runtime_verified=false`、`database_verified=false`，运行时激活就绪仍为 false。**离线声明完整，不等于数据库已经同步、实际部署正确或普通用户授权已验收。**

## 2. 当前权限数据模型

### 2.1 授权链已经简化

```text
当前 Tenant 成员 → Role → Permission → 前端资源 + 后端 Function
```

PermissionPackage 已退出当前授权模型；App 不应再新建权限包、依赖权限包授权接口，或根据旧权限包树判断权限。

| 概念             | 当前含义                                     | 不应混淆为                           |
| ---------------- | -------------------------------------------- | ------------------------------------ |
| 前端 App         | IAM 中的应用身份                             | Android 包名、DCloud appid、当前租户 |
| Module           | 导航/目录分组                                | 必须存在的独立业务页面或隐式授权     |
| Menu             | 可从导航进入的页面资源                       | 拥有全部页面按钮权限                 |
| Button           | 需独立控制的业务动作资源                     | 每一个视觉按钮都必须建一条资源       |
| ButtonPage       | 独立授权、通常从其他页面进入的隐藏业务页     | 普通按钮或自动继承父页权限           |
| Function         | 后端 Method + Path 对应的权威接口资源        | 前端按钮或页面组件地址               |
| Permission       | 一个业务前端资源与其必要后端 Function 的组合 | 一个岗位全部功能的合集               |
| resource_element | 控件/交互上下文的稳定标识                    | Permission、数据库 ID 或授权凭证     |

前端目录为 `App → Module → Menu → Button / ButtonPage`；具体父链按注册来源和后端类型契约维护。后端 Function 独立登记，`source=backend`、`parent_id=0`，**不再作为页面下的资源树子节点**。同一个 Function 可被多个 Permission 引用，不为每个页面复制一份接口资源。

对于确无业务通信的已实现纯展示资源，Web 允许有证据及理由的 `permission_kind=frontend_only`，不为凑组合而虚构 Function。不能将尚未接好接口的学习/考试页面伪装成纯展示已完成；登录等公开/会话辅助入口也应单独分类，而不是强行创建业务 Permission。

Permission 的 `parent_permission_id` 只表达展示层级。`default_selected_with_parent` 只影响管理员主动勾选时的默认联动；下级仍可取消。实际授权取保存的明确 Permission 集合，不能沿父子树推导运行时继承；打开已有授权也不能重新执行默认联动。

### 2.2 前后端分别控制什么

- 前端按服务端返回的精确页面/按钮资源集合控制入口、可见性、可操作状态，并在业务动作执行前再次检查。
- 后端按真实会话、当前 Tenant、有效 Permission 解析到的 Function、数据范围和对象归属鉴权。高危操作、SA 专属操作仍保留额外闸门。
- 普通管理员或 SA 身份不自动带来全部业务资源；不能写 `isSA || hasPermission(...)` 作为普遍豁免。
- 页面可访问、按钮可操作、接口可调用、目标数据可操作，是不同层面的检查，不能互相替代。
- 控件隐藏不是安全边界；伪造客户端标记、路由参数、请求中的权限码，都不能产生授权。

## 3. 资源统一管理：静态注册表是唯一身份来源

### 3.1 三种编码必须分开

1. `resource_code`：稳定的前端资源身份，供 IAM 资源维护及运行时精确判权使用。
2. `resource_element`：稳定的控件/交互身份。同一个业务 Button 可对应打开表单、上传、提交等多个元素；查询、刷新、分页也各有元素，但可以共同引用页面资源。
3. 后端 Function 的资源码：来自后端权威目录，以精确 Method/Path 映射；不能由前端把按钮编码加工成 Function 编码。

这些编码由开发时的声明统一维护，不在运行时随机生成，不按中文名称、用户、租户、数据库 ID 或按钮序号生成。改文案、移动按钮、将操作移到详情面板，不应无故更换资源身份。

业务记录的组织/成员等“编码由后端生成”，与开发时维护稳定前端资源码不是同一件事，不能因前者而省略后者。

### 3.2 Web 的实际声明结构

各 Feature 的 `iam-resource.registry.ts` 集中声明：

- 页面：`page_id, resource_code, resource_name, remarks, parent_resource_code, route_path, component`，必要的资源类型及迁移元信息。
- `buttons`：独立业务动作的稳定资源码、名称及用途。
- `elements`：`resource_element, resource_key, kind, events`；导航等特殊元素可声明 `target_resource_code`，必要时提供元素级 `remarks`。
- `view_files`：实际承载页面和交互的正式组件。
- `maintenance.permissions`：稳定 `permission_key`、绑定的前端 `resource_key`、明确的 `element_keys`、展示父模板及默认联动设置。

注册表采用可静态解析的字面量。页面、路由、常量投影及维护产物引用同一来源；不要在页面字符串、权限工具、导出 JSON 中各维护一份。

`permission_key` 是维护模板的稳定标识，不是后端 Permission 的数据库 ID，也不等于后端实例编码。前端输出稳定父级编码，由维护端解析为数据库父 ID。

### 3.3 所有重要控件登记，但不把每个控件都建成独立权限

| 控件/行为                                        | 通常归属                                           |
| ------------------------------------------------ | -------------------------------------------------- |
| 页面初始化、普通查询、刷新、翻页、只读详情       | 页面资源的不同元素，共用查看 Permission            |
| 新建、编辑、启停、提交考试等需独立授权的业务动作 | 独立 Button；具体拆分按业务需求确认                |
| 关闭、取消、返回、上一步、本地排序与暂存选择     | 本地元素，不虚构后端 Function                      |
| 跳到已有独立业务页                               | 引用目标页面资源，不为同一页面再复制一个入口资源   |
| 看似本地的“替换/选择”按钮                        | 若打开即查询候选，必须登记该查询，不能笼统标成本地 |
| 定时心跳、播放/前后台回调、下拉刷新              | 按真实通信登记，不能只扫描点击按钮                 |

“同属查看”不是无条件规则。如果查询、敏感详情确有独立授权要求，应据正式契约单独拆分，不能为了减少资源数量扩大查看权限。

### 3.4 用途与场景说明必填

正式页面、业务 Button、结构 Module 的 `remarks` 必须简短、准确，格式为 `用途：…；场景：…`；当前 Web 门禁不接受空值、占位说明或超过400字的长文。

说明应写清实际业务效果、调用时机、作用范围及重要副作用。例如“读取本人课程临时播放地址供学习预览”，比“课程按钮接口”有用；但仅在真实接口契约支持时才能这样描述。不能凭按钮名或 Path 猜测用途，也不能把“退出培训计划”描述成“退出租户”。

资源说明、控件 `events`、真实通信链三者要一致。说明为维护程序及未来 Agent 提供语义基础，**不代表 Agent 自动获得执行权限、用户授权或绕过敏感操作确认的权利**。

## 4. 元素 SDK 与通信证据

### 4.1 SDK 是元数据工具，不是鉴权器

Web 的 `src/shared/services/resourceElement.ts` 统一提供 `bindResourceElements`、`resourceElementAttributes` 及 `v-resource-element`。

运行时元素描述符包含：`resource_element, owner_page_resource_code, frontend_resource_code, kind, remarks, events`。DOM 暴露：

```text
data-resource-element
data-resource-code
data-resource-owner
data-resource-description
```

共享组件、表单、抽屉、分页、上传组件接受并透传描述符，不自行知道或拼接 IAM 编码。传送/多根组件使用明确的属性绑定，避免把指令装到无可靠根节点的位置。

该 SDK 不发送业务请求、不拦截点击、不执行授权，也不是自动网络追踪器。**打标、声明事件、运行时判权三项均需实现，不能互相替代。**

App 可复用相同语义的数据结构，但应按 uni-app/原生组件实现属性透传；不能假定 Android 原生渲染保留 Web DOM 或支持同一指令。静态注册表、组件 prop 和调用链才是跨端可核验依据，H5 的 `data-*` 只是其中一种观察形式。

### 4.2 一条 Permission 要覆盖完整、必要的实际调用链

不是把整个页面的所有 API 并集塞给每一个按钮。需要分别核对：

```text
触发入口/生命周期 → 页面回调 → 共享组件/注入/运行时回调
                → 模块 API → 请求客户端 → 精确 Method/Path → 权威 Function
```

包含打开时查询、远程候选、翻页、上传、校验、签名读取、提交、成功后的必要回读、失败重试及条件分支。纯本地计算、取消及媒体状态事件不编造 API。

例如 Web 试卷“新建”资源的多个元素，分别完成候选查询、随机初稿读取、本地勾选配分及最终保存。当前真实元素片段：

```ts
createPreview: {
  resource_element: 'iam.training.papers.createPreview',
  resource_key: 'create',
  kind: 'action',
  remarks: '用途：按题型数量与题型总分从当前租户启用题库抽取一次真实题集；场景：新建试卷时生成可人工调整的初稿，不保存试卷、不返回答案解析。',
  events: {
    click: ['POST /iam-admin/TrainingPaper/GeneratePreview'],
    retry: ['POST /iam-admin/TrainingPaper/GeneratePreview'],
  },
}
```

它引用既有新建 Button，不新增一个独立授权 Button；真实调用映射后端 `IAM.TRAINING_PAPER.GENERATE_PREVIEW`，只组合进使用它的新建/编辑能力，不塞入普通查看 Permission。此例用于说明治理方式，**不是让员工 App 调用管理端组卷接口**。

### 4.3 Function 以权威目录为准

- Web 从后端完整权威目录离线导入 `standards/iam/backend-functions.snapshot.json`；精确匹配 HTTP Method 和 Path，保留服务归属、读写、鉴权类别、可组合性、高危状态及来源信息。
- `business && composable=true` 才能按当前契约用于业务 Permission 组合及跨 App 复用；仍受实际授权及其他后端限制。Function 的提供方归属不变，不能复制成客户端自有接口资源。
- public、session_self_service、维护专属等类别保留真实分类，不为登录或读取自身权限强行补业务授权。
- 只读资源不能混入写 Function。学习开始、心跳或完成上报若真实产生写入，必须据权威接口声明，不能因为页面名字是“查看课程”就当纯读。
- 上传、取链等 DMS 能力按真实消费归属；服务前缀为 `/dms`。使用真实 IAM App 身份，不硬编码 Web 的 app_id；签名媒体地址不携带业务 Authorization。

### 4.4 源码变动要使旧证据失效

Web 的 `communication-inventory.json` 将候选逐项分类，并绑定源码、候选集合、调用链依赖及 Function 定义指纹；记录审核者、理由和测试/文档证据。生命周期、props 回调、共享封装及注入 provider 均在范围内。

静态扫描候选数不等于 API 数，也不能证明任意 JavaScript 调用图已完整。新增/改变通信后必须看差异、追链、补声明和测试，再更新有界审查记录；不能一键重算哈希后将所有项标成 reviewed。未知、歧义或未核实的 Function 保持阻断，不根据中文名称猜配。

## 5. 运行时精确判权：入口、页面、按钮分离

### 5.1 Web 当前使用的接口

以下为已核对的 Web 契约，均 POST。**App 是否可使用相同服务入口、员工 Token 是否适用，仍需 App 后端契约确认；不能直接把所有 `/iam-admin/*` 管理接口搬到员工端。**

| 接口                                                        | 请求                   | 主要作用/响应                                                           |
| ----------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| `/iam-admin/CurrentPermissionResource/CurrentApps`          | `{}`                   | 当前 Tenant 可进入的 App；返回 `apps, authorization_version`            |
| `/iam-admin/CurrentPermissionResource/CurrentAppMenus`      | `{app_id}`             | 授权导航，返回 `app, modules[{resource, menus}], authorization_version` |
| `/iam-admin/CurrentPermissionResource/CurrentPageResources` | `{page_resource_code}` | 精确页面和按钮权限，响应见下                                            |

```text
page_resource_code
can_access
button_resource_codes[]
button_page_resource_codes[]
read_function_resource_codes[]
authorization_version
```

三个 Current 接口是会话自服务，不能组合成要求用户先持有业务 Permission 才能查询自身权限的循环依赖。

### 5.2 导航不是按钮授权清单

导航读取 `App → Module → Menu`，到 Menu 为止，不期待 Page/Button/Function 子树；按服务端目录顺序显示。Module 自身隐藏不意味着丢弃其可见 Menu。

App 可继续使用底部 Tab、首页卡片等移动导航，将后端授权目录与本地已实现入口映射；无需复制 PC 侧栏。菜单可见不等于按钮可用，客户端存在一个页面也不意味着当前用户能进入。不能通过加载完整管理端资源目录代替查询本人的运行时权限。

### 5.3 页面和按钮的判定规则

1. 从正式页面注册映射取得稳定 `page_resource_code`，不是从中文标题、URL 参数或菜单查询结果猜测。
2. 当前会话和 Tenant 就绪后，查询该页面的 CurrentPageResources；无需先拿到 Menu ID，不再依赖 CurrentFunctions。
3. `can_access=true` 才启动页面业务加载；Button 按返回的精确前端资源码判定，ButtonPage 独立校验。
4. 不从父级资源、资源码前缀、角色名称、后端 Function 集合或本地登录权限缓存推导按钮写权限。`read_function_resource_codes` 也不能用于推导写 Button。
5. 按钮显示/禁用策略按页面契约保持一致；点击执行前再次校验当前页、会话、Tenant 和目标动作，防止状态已变化但旧 UI 回调仍可执行。
6. Web 的 `pageResourceAliases.ts` 只将本页精确资源投影为旧 UI 判断常量，不是第二套授权源。App 新能力优先直接使用注册资源码；若暂保留旧逻辑键，应同样显式、按页、可退役映射，不能旧新权限取并集补权。

普通接口由统一请求层携带会话 Authorization、Request ID等契约字段；当前 Web 并不是每点一次按钮就额外提交一个 `permission_code` 来获得授权。资源/元素标记与维护声明不是业务请求的授权 Token。

### 5.4 权限未就绪不等于拒绝

必须区分：会话未建立、Tenant 未选择、页面权限加载中、明确拒绝、权限服务异常，以及业务请求失败。网络错误不能在 `catch` 中一律转成 false/无权限，更不能默认放行。

Web 曾出现切页时新权限快照尚未到达，旧组件将空集合当无权限，提前显示红色异常；另有路由尚未提交就用旧查询条件重复加载的情况。现有修复要求：

- 快照包含页面归属及 ready/loading 状态；只响应自己页面且已就绪的权限。
- 导航权限加载期间停止业务请求，等目标路由与条件提交后再查询一次；导航目录加载不是业务上下文变化，不应造成重复查询。
- 真实拒绝继续拦截，权限服务错误显示可重试的独立状态，不能伪装为空列表。
- 晚到的旧请求、旧权限或旧业务响应不得覆盖新页面/会话。

App 页面栈会保留旧实例，因此不能直接复制“全局只有一个当前页面权限集合”的假设。应按页面资源和会话上下文隔离；统一覆盖 `navigateTo/redirectTo/reLaunch/switchTab`、冷启动/深链、原生返回及 `onShow` 恢复。页面切走时停止旧回调/定时任务，再显示时按策略重新校验。

### 5.5 Tenant、缓存、ID 与安全

- 普通业务限定登录后实际进入的当前 Tenant，不把用户加入的全部 Tenant 合并为查询/授权范围。切换候选来自登录/切换响应，不是任意 Tenant 目录结果。
- 全局用户 ID、Tenant ID及成员关系 `tenant_user_id` 分别建模，不用登录账号或成员关系 ID冒充用户 ID；本人业务定位遵循员工端正式契约。Web 用户查询以 `user_id + 当前Tenant` 定位，不意味着所有 App DTO都应擅自改成同一组字段。
- 共享对象目录不等于全局授权；Web 的集团、Tenant、系统资源入口也经过当前 Tenant 的精确页面守卫。SA 专属接口仍需对应 Function 与 SA 资格。
- Web 页面权限缓存按 Token、会话/版本、当前 Tenant、页面资源码隔离，使用5秒短 TTL和并发复用；刷新、退出、切换上下文使旧结果失效。App 应结合前后台恢复及 `authorization_version` 制定明确刷新策略，不把 Web 的 TTL 当永久业务规则。
- `uni.request` 中止能力与请求代次/上下文校验结合使用；无法中止的结果也必须丢弃。提交失败保留适当草稿，但不能把旧租户草稿提交到新租户。
- 资源/权限治理 Int64 ID 无损保留十进制字符串；版本令牌、`updated_at`、Request ID和文件 ID保持原值。禁止 `Number(sessionId)` 等不必要数值转换。Web 旧认证 Tenant ID仍有安全整数适配，App 不应照搬这项历史限制。
- 页面资源授权不代替“本人课程/本人考试/所属任务”等对象及数据范围校验；这些由员工端业务接口权威执行。
- IAM 业务权限与 Android 的相机、相册等系统权限分开处理，两者都通过才执行对应操作。
- 延续 App 的可信 Host、Token 脱敏、凭证仓和身份缓存隔离；不要把 Web 的 sessionStorage、DOM 或浏览器刷新机制机械搬到 Android。

## 6. 自动维护产物与职责分离

Web 可供借鉴的产物链：

| 来源/产物                                          | 职责                                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/features/**/iam-resource.registry.ts`         | 页面、独立 Button、元素事件、用途说明及 Permission 模板的开发时权威来源                               |
| 真实路由 + 页面契约 + `maintenance-migration.json` | 独立发现正式入口，核对漏登记、占位和迁移状态，不将注册表当扫描白名单                                  |
| `backend-functions.snapshot.json`                  | 后端权威 Function 快照，不能由客户端虚构                                                              |
| `communication-inventory.json`                     | 通信候选、全链依赖及逐项审查证据                                                                      |
| `artifacts/iam-resource-elements.json`             | 元素及代码位置证据，不等于完整授权清单                                                                |
| `artifacts/iam-maintenance.frontend.json`          | Schema 3.0完整维护声明：apps/resources/elements/permission_templates/retirements/coverage及来源、状态 |
| `artifacts/iam-resource-catalog.json`              | 兼容目录，不是当前完整授权协议，不据此恢复旧树或权限包                                                |

App 应建立自身生产页面发现和声明输出，不直接使用 Web 的产物冒充 App 覆盖。`src/pages.json` 的页面、分包、Tab及生产条件编译要一起核对；`onLoad/onShow/onHide/onUnload`、原生事件、上传/媒体回调等纳入通信发现。

排除 Preview、Fixture、测试、依赖、构建产物、明确退役代码；不能因页面未登记就忽略它，也不能因为目录名含 archive 字样便排除真实业务。例如 Web 的 `training/operations-archive/` 是活动培训档案模块。

Web 的现有离线命令可作为 App 自建等价门禁的参考，不保证能直接用于 App：

```text
pnpm iam:maintenance:scan
pnpm iam:codes:generate
pnpm resource-catalog:generate
pnpm resource-elements:generate
pnpm iam:maintenance:generate
pnpm iam:maintenance:check
pnpm iam:maintenance:ready
```

生成/检查声明不是批准、同步或授权。客户端开发负责代码、声明和证据；专门资源维护会话负责按批准范围核验环境、受控同步和回读；后端负责鉴权、对象范围、版本和审计。缺少正式清单、App身份或员工端接口时应列为待确认项，不能先猜码入库、给用户补权，或自动删除“本次没扫描到”的资源。

资源生命周期、页面实现状态、运行时授权模型、离线完整性、数据库验证和运行时验收分别记录。Web 的部分 `legacy`/rollout 元数据仍未完成验收，不能只改字段为 v2 就声称 App 升级成功。

## 7. App 已核实的待升级点

以下来自 `D:/project/driver-app` 当前源码读取，不是 App 运行测试结论：

| 当前位置/行为                                                                                                     | 风险                                            | 对齐方向                                                                 |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| `docs/permissions/driver-app-permissions.md` 仍写 App→Module→Menu→Function                                        | 继续沿用旧目录和接口权限思路                    | 改为前后端资源分离、角色直接关联 Permission；区分 Menu/Button/ButtonPage |
| `src/core/auth/authApi.ts` 登录后逐一调用 `/iam-admin/Permission/CheckFunction` 检查三个 `training.*.read` 逻辑键 | 不是精确页面/按钮资源模型，接口还是旧路径       | 先核对员工端当前权限自服务契约，再接入按页快照；不能只换 URL             |
| `checkPermission` 捕获所有错误后返回 null                                                                         | 网络、协议错误和无权限混为一谈                  | 建立 loading/denied/service-error等明确状态与重试                        |
| `authStore.hasPermission` 只读登录结果中的 `permissions[]`                                                        | 登录时快照可能过期，缺少页面/按钮和 Tenant 归属 | 引入精确资源快照、按页上下文隔离、刷新及失效策略                         |
| `navigationGuard.ts` 只做会话+逻辑键判断                                                                          | 深链、Tab返回和业务回调可能未受新模型控制       | 统一页面注册映射、进入/恢复检查、动作前复核与旧响应隔离                  |
| `authApi.ts` 当前把账号写入 `userId`，注销将 sessionId 转 Number                                                  | 真实身份混淆及 Int64 精度风险                   | 从权威会话/员工上下文读取真实身份；按契约保留 ID和版本精度               |
| 当前 `src/pages.json` 列出页面，但未形成 Web 等价资源声明链                                                       | 有入口不等于可扫描、可维护、可授权              | 建立模块注册表、元素透传、Permission模板、独立生产发现与检查             |

App 已有可信请求层、凭证仓、`registerContextCleaner`/身份缓存隔离、Mock与真实模式分离，可优先扩展，不另建相互冲突的客户端基础设施。当前 README 的历史接入状态也不能代替实际代码与部署验收。

## 8. 建议实施顺序及验收

### 8.1 接手先确认，不能假定已具备

1. App 的真实工程目录、IAM App身份、资源命名空间；不得混用 DCloud appid和Android包名，也不得照抄管理端资源码或数据库 ID。
2. 员工登录/恢复/切换租户流程，以及权限自服务接口对员工 Token 的 Method/Path、响应、错误和版本契约。
3. 员工培训、学习上报、考试、本人记录、媒体取链等真实接口及权威 Function 元数据；不能用管理端接口或 Mock冒充。
4. App 维护产物是否可沿用现有 Schema 3.0，或需显式增加原生路由/组件定位适配。没有支持前，不伪装成 Web `all-web-source` 全量扫描。

### 8.2 分阶段落地

1. **盘点**：扫描全部实际生产入口和交互，列出现有逻辑键、请求、缺失契约及保留/退役项。
2. **身份与声明**：确定稳定页面/Button资源码，建立模块字面量注册表、统一元素描述符和用途/场景说明；不改变授权数据。
3. **精确运行时**：实现按页权限查询、按钮精确集合、生命周期守卫、Tenant与会话隔离、错误区分及并发失效；去除旧登录逻辑键补权路径。
4. **通信闭环**：从实际调用追到权威 Function，形成最小必要 Permission模板和可复核证据；生成完整离线产物及漂移检查。
5. **受控资源维护与联调**：向维护会话交付增量，由其在批准范围内同步并回读；用普通员工而非仅 SA做正反用例，分别核验前端与服务端限制。
6. **App 验收**：遵守 App 自身 AGENTS、Page Contract和设计流程；H5预览/截图不替代 Android 安装、冷启动、返回、前后台、弱网及真机发布验证，不自行重录 approved 基线。

最低验收包括：

- [ ] 每个正式页面和关键控件都能追溯到稳定注册来源；漏标、重复码、错误父链和未知 Function会阻断检查。
- [ ] 只有页面权限时不能执行未授权写动作；只有某一动作权限也不能据父子结构补出其他动作。
- [ ] 页面隐藏后深链/Tab/返回进入仍判权；隐藏子页独立判权。
- [ ] 权限加载期间不先显示拒绝、不提前请求业务；真实拒绝、网络故障及业务空结果分开。
- [ ] 登录恢复、切换用户/Tenant、权限刷新、退出、401、前后台切换均不会使用旧快照或被旧响应覆盖。
- [ ] 查询、远程候选、上传、媒体取链、学习/考试写入、成功回读等完整通信都能对应权威 Function；纯本地行为不造接口。
- [ ] 绕过客户端隐藏/禁用后，后端仍拒绝越权、跨Tenant及越对象范围请求。
- [ ] 当前资源说明可简要解释用途、场景、范围和副作用；Agent不能据说明绕过用户意图或敏感确认。
- [ ] 代码检查、声明就绪、线上资源同步、普通用户鉴权、业务功能和 Android发布证据分别报告，不以其中一项冒充全部完成。

## 9. 必读代码与规范定位

以下均为 Web 工程内当前来源；App 升级应读实现而非照抄历史报告中的数量和“已完成”结论。

| 要理解的内容                         | Web 来源                                                                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 当前模型及工程边界                   | `docs/architecture.md`、`standards/README.md`                                                                                                              |
| 元素标识、语义说明、透传原则         | `standards/resource-elements.md`、`src/shared/services/resourceElement.ts`                                                                                 |
| 维护协议与版本化 Schema              | `standards/iam/README.md`、`standards/schemas/iam-maintenance.frontend.schema.json`；注意 README历史包模型段落已被后续契约取代                             |
| 简单业务资源范例                     | `src/features/iam/foundation/iam-resource.registry.ts`                                                                                                     |
| 多控件共享 Button、读取/写入分离范例 | `src/features/training/content-exam/iam-resource.registry.ts`                                                                                              |
| 最新权限治理页面与注册源             | `src/features/iam/permission-governance/pages/`、同 Feature `iam-resource.registry.ts`                                                                     |
| 精确页面API与DTO                     | `docs/api/iam-shell-context.md`、`src/features/iam/shell-context/{api,types}/`                                                                             |
| 页面守卫与权限缓存                   | `src/app/router/index.ts`、`src/features/iam/shell-context/services/currentPageResourceAccess.ts`                                                          |
| 页面快照、旧UI有限适配               | `src/shared/services/pageResourcePermissionState.ts`、`pageResourceAliases.ts`、`src/app/store/session.ts`                                                 |
| 请求安全、上下文与精度               | `src/shared/api/httpClient.ts`、`src/shared/api/authSession.ts`、`src/shared/utils/entityId.ts`                                                            |
| 全量发现、证据和离线检查实现         | `scripts/generate-iam-maintenance.mjs`、`scripts/lib/iam-maintenance-source.mjs`、`standards/iam/communication-inventory.json`                             |
| 退役与未完成切换状态                 | `standards/iam-retirements.json`、`standards/iam/authorization-rollout.json`                                                                               |
| 精确判权及时序回归范例               | `tests/visual/iam-current-api-migration.spec.ts`、`tests/visual/iam-access-control-production.spec.ts`、`tests/visual/training-permission-loading.spec.ts` |

结论：App 需要升级的是“静态资源身份 + 控件语义/事件声明 + 权威 Function 映射 + 最小 Permission组合 + 当前Tenant精确运行时 + 可审查维护证据”整条链，不是仅给按钮加一个编号或替换一个权限接口。

## 10. 本次文档校验记录

- 22处关键 Web 来源路径及文档格式校验通过；`iam:maintenance:check`、`resource-elements:check` 通过。本次未生成新的资源声明或执行在线维护。
- 按 Web 工程要求执行 `pnpm quality`：前置 Lint、治理、类型检查、构建及生产路由检查通过；浏览器804项通过、24项跳过、81项失败。失败项与上次全量记录逐项相同，均为既有截图基线差异，无新增失败；未修改批准记录或基线。
- 本次只新增本交接文档；没有修改 App/Web业务代码、数据库或角色授权。未运行 App质量检查、员工端真实接口联调或 Android验收，不宣称 App 已升级或可发布。
