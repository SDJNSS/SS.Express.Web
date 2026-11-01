# 前端资源编码与元素标记

## 资源语义说明（2026-10-21）

- 成员姓名/筛选后续修订：新增成员编号及匹配模式控件仍引用 `IAM.MEMBERS` 页面查询资源；移除昵称采集、用户ID/状态查询，不新增独立Button。两个编辑资源码和权限不变，原昵称数据保留，人员标题只用realName。已逐项复核通信差异，当前1,619个候选；只维护代码与离线声明，不写数据库。详情见 `docs/api/iam-membership-query-users.md`。
- 成员列表后续修订：移除全局用户启停 Button、元素及模板，两个编辑资源身份不变，仅移动至详情标题旁；角色列使用响应 `roles`。本轮不写数据库，维护会话按最终清单处理。当前为99个前端资源、67个业务Button；下方100/68为前次语义补充时的历史统计。
- 所有正式资源的 `remarks` 为人工核对后的简要业务说明，固定写清 `用途：…；场景：…`。来源是本页真实回调、API 封装及当前 Page Contract，不按资源码、按钮中文名或 URL 猜测。
- 当前覆盖 27 个页面（含隐藏 ButtonPage）、68 个独立业务 Button，以及 5 个结构 Module，共 100 个前端资源。页面/按钮的唯一来源为 Feature 字面量 `iam-resource.registry.ts`；Module 来自 `standards/iam/resource-state-policy.json`。新增资源必须同时补说明，不接受空值、待补充占位或超过 400 字的长文。
- 说明描述 API 的业务效果与何时使用，必要时点明范围和副作用。例如全局账号停用影响所有租户，而成员停用只影响当前租户；角色撤销不等于取消管理员；退出培训计划不等于退出租户。Overview/Dashboard 的演示数据明确标示，不冒充真实统计或业务写接口。
- `resourceElementAttributes` 和指令将同一说明暴露为 `data-resource-description`；传送抽屉和共享上传控件也继承原资源说明。跨页面导航元素显式声明目标资源说明，不使用来源页面说明冒充目标用途。
- 说明描述**资源能力**，不代表该资源下每一个 DOM 元素都会提交同一 API。控件身份、触发时机与精确接口仍以 `resource_element`、`kind`、`events` 为准；查询/刷新/详情/取消等复用页面资源，不因此新增独立授权资源。
- `artifacts/iam-resource-elements.json` 保留原始注册属性与位置证据；兼容目录和 `artifacts/iam-maintenance.frontend.json` 的 `resources[].remarks` 输出同一说明，后者 `elements[].remarks` 同时保留元素上下文和既有精确 Function 映射。Schema 3.0 要求非空说明。
- 维护 Skill 已原生读取 `remarks`，后端 Function 的权威 `description` 也由其规范化为写入 DTO 的 `remarks`。本轮原样导入后端已有的 179 项说明，未按名称自动补造 API 语义。维护会话按批准范围通过 API 更新并回读 `iam_resource.remarks`；离线产物不代表数据库已更新。
- 给 Agent 的说明不是授权凭证，不绕过当前 Tenant、精确资源权限、用户意图或敏感操作确认。本次不修改权限集合、角色绑定、接口参数或页面视觉，也不更新 Approval/截图基线。

### 通信证据增量核对

本轮九份注册表只新增 `remarks`：移除该字段后 AST 语义摘要与修改前一致，SHA-256 为 `c922a49deef1921f0bfae22b5e8aa6907e4cc5c3afbaaa770deaf122f228a0a9`。共享 SDK 只透传说明和新增一个 DOM 数据属性。全部 1,624 个通信候选在去除源码行号后摘要仍为 `4b3bba393ad9da4379b4e3738a54a933610cce2474811d47216667f957a3952e`，无新增、删除、改名或调用变化。

后端 179 个 Function 去除说明字段后与原快照完全一致，Method/Path、资源码、读写、鉴权类别、可组合性和高危标志未变。中央 inventory 只在这一逐项元数据核对基础上重绑源码/依赖与权威说明指纹，保留既有候选分类、调用链和 Permission 成员，不以哈希刷新替代语义审查。

## 当前范围与唯一来源

覆盖六个保留基础页和五个活动权限治理页；没有改写业务或授权逻辑。完整维护协议与剩余范围见 [IAM 自动维护标准](iam/README.md)。

| 路由                 | Menu 资源编码       | 静态注册表                                                 |
| -------------------- | ------------------- | ---------------------------------------------------------- |
| `/iam/group`         | `IAM.GROUP`         | `src/features/iam/foundation/iam-resource.registry.ts`     |
| `/iam/tenants`       | `IAM.TENANTS`       | 同上                                                       |
| `/iam/organizations` | `IAM.ORGANIZATIONS` | 同上                                                       |
| `/iam/positions`     | `IAM.POSITIONS`     | 同上                                                       |
| `/iam/members`       | `IAM.MEMBERS`       | 同上（含用户角色分配抽屉）                                 |
| `/iam/roles`         | `IAM.ROLES`         | `src/features/iam/access-control/iam-resource.registry.ts` |

新权限页的注册源为 `src/features/iam/permission-governance/iam-resource.registry.ts`，对应 /iam/system-resources、/iam/permissions、/iam/permissions/configuration、/iam/roles/authorization、/iam/members/effective-permissions。

三个注册表采用纯字面量，集中维护 13 页身份、31 个独立业务 Button、元素标记、事件对应的接口声明与 Canonical View 路径。路由和 UI 从注册表引用；离线工具用 TypeScript AST 读取，不执行页面代码。新增的 `IAM.*.BUTTON.*` 编码与历史 Function 码区分，避免把旧 Function 改写成 Button。新权限页原有资源码保持稳定。

`resource_code` 是稳定的前端资源身份；`resource_element` 是稳定的控件/交互上下文身份。两个名称不是一回事，均不可从中文标签、数据库 ID、当前用户或运行时随机值生成。前端 Button 的 `parent_id` 应由维护端解析为所属 Menu 的 ID，前端只输出稳定父级关系。

查询、刷新、分页、详情等读取与纯本地操作可引用所属 Menu；关闭、取消、上一步不创造独立授权资源。创建、编辑、启停、组织/岗位归属、租户归属、分配/移除角色各有独立 Button。导航到既有独立页面时引用目标页面资源，不为同一入口另造重复 Button。

## 使用方式

统一 SDK：`src/shared/services/resourceElement.ts`。生产和 UIDesign 均注册指令：

```vue
<AppPage :resource_element="groupElements.page">
  <el-button v-resource-element="groupElements.edit" @click="openEdit">编辑</el-button>
  <FormDrawer :resource_element="groupElements.edit" @confirm="save" />
</AppPage>
```

共用控件只接受描述符，不知道 IAM 编码；抽屉、查询面板、分页、远程选择器及图片上传链路会传递标记。多根/传送组件使用共享属性绑定，不在 Fragment 上安装指令。上传声明使用当前 `/dms/File/Upload`。

DOM 可见 `data-resource-element`、`data-resource-code`、`data-resource-owner`，不会发送额外请求、拦截点击或授予权限。`defineResourceElement` 和 `bindResourceElements` 仅绑定静态描述符，**不是网络追踪器**。事件清单是显式声明，不能据此宣布所有间接请求已完成自动审计。

六页仍按既有 `meta.permission` / `v-permission` 判定权限。本轮仅补 `meta.resourceCode`、`meta.resource_element` 和标记，不切换到 `authorizationModel: 'v2'`。新前端编码不会使尚未取得权限的按钮出现。

## 导出与检查

- `pnpm resource-catalog:generate`：兼容 V3 目录读取已登记的 31 个前端 Button；保留仍被使用的历史 Function，不自动转为独立后端 Function。
- `pnpm resource-elements:generate`：生成 `artifacts/iam-resource-elements.json`，包含注册内容、源码文件/行号/控件证据。
- `pnpm resource-elements:check`：已加入 Lint；检查静态可解析性、重复码/元素、按钮父级、真实组件、漏标、未知标记及导出漂移。新增六页内部的按钮、抽屉等关键控件漏标会失败。

`iam-resource-elements.json` 是有界元素清单，不替代 `iam-maintenance.frontend.json`。`permission_template_ready=false`、`backend_function_mapping_complete=false` 表示这个旧元素产物本身不证明完整维护就绪。权威 Function 映射和模板现已由新的维护清单输出，但全通信链审查仍待完成；禁止直接生成在线授权或自动清理数据库。

## 全站扫描边界

维护 Skill 仍应扫描所有正式页面，再与注册表交叉核对；注册表或已登记的 13 页不是全站白名单。`iam:maintenance:check` 已独立发现全部生产路由，并与迁移表交叉校验。其他正式业务页仍需逐页迁移，不能因未登记而忽略。

`archive/**` 必须排除；`src/features/training/operations-archive/` 是正式业务目录，不能误排除。Skill 本轮未修改。页面可用性、元素覆盖、后端 Function 映射、Permission 创建、角色授权是不同验收项。
