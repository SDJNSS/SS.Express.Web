# 成员与管理员前端交付、增量通信复核

日期：2026-10-17。单 Agent，正式工程 D:/project/SS.Express.Web。

## 范围与接口依据

采用后端 `Doc/Engineering/iam-membership-followup-contract-2026-10-17.md`，接口摘要见 [维护契约](../api/iam-membership-maintenance.md)。页面为 `/iam/members`；保留当前租户范围，不恢复 UpdateUserTenants，不新增全局清退，不改 Tenant 首名管理员向导。

## 实现与维护分工

- `foundation/components/MembershipManagementPageView.vue` 保留列表与身份详情；管理员操作、关系表格编辑/结束从详情进入，不挤占主列表操作列。
- `MemberAdminDialog.vue`：精确 Button、回读目标成员版本、确认影响、稳定请求号、机器错误原因、失败恢复。
- `MemberRelationDrawer.vue`：新增/编辑/结束共用业务表单；原关系身份及版本内部保留，不让用户编辑 ID；有效期和历史规则来自后端契约。
- `pages/MembershipManagementPage.vue`：真实 API 与权限检查、当前 Tenant 校验、成功刷新；本人/无法确认当前用户身份时，清空页面授权快照并重新加载 App Shell，避免旧权限继续使用。
- `adapters/memberRelationPolicy.ts`：Tenant 墙钟、有效性、历史只读。`foundationAdapter.ts` 只移除无人消费的旧跨租户快照适配，保留 QueryUsers 的嵌套成员映射。
- `types/foundation.ts`、`types/memberMaintenance.ts`：旧全量替换类型退役；关系编辑身份及管理员意图保持版本字符串。
- `api/foundationApi.ts`：四个新增包装，复用统一服务前缀、JWT、会话守卫。管理员 request_id 同时放 Body/Header；结束与保存明确区分，空结束值为 null。

新增资源码、Permission 键及所属 `iam.members.manage` 模板见维护契约。编辑组织/岗位继续使用原维护 Button，新增独立 editOrganization/editPosition 元素；结束归属是新 Button，不混进旧 Permission。两个管理员 Function 来自后端权威 schema3 目录，保留 high_risk 标记；不以 SA 或旧别名补权。

**未调用资源维护写接口、数据库或角色授权接口。** 页面模板生成不代表已有账号获得新按钮；维护会话按既有完整 Package 集合增量补齐，不覆盖旧成员，不重复初始化包28，不改 Tenant 包27。

## 通信证据变更的逐类依据

1. 新管理员 UI：打开/重载 → queryMemberDetail → QueryUsers；确认 → Appoint/Cancel；成功 → 列表/详情回读。网络重试保持原意图；版本/最后管理员等业务拒绝要求人工重新加载。本人成功清理授权并浏览器重载，后续导航/Profile/页面资源请求仍由既有 Shell mount 链负责。
2. 组织/岗位表单从旧巨型 View 抽取到 Canonical Drawer。新增只建立草稿；编辑/结束先读 QueryUsers 的原关系 id/version；下拉实际由父 loader → 当前 Tenant QueryFilterOptions 分页搜索，不假称本地控件。确认分别 Save 或 End，失败不自动重放，成功刷新完整成员详情。对应维护 Permission 删除已无调用的 Organization/Query、Position/Query；它们仍由新成员向导的真实调用独立保留，不因同 Feature 合并进关系编辑。
3. 结束新增两个 Function 包装及对应生产调用；管理员新增两个 Function 包装及对应生产调用。固定 Method/Path 与 Controller 声明逐一核对。新增可组合业务 Function 不授予维护 API-Key。
4. 旧关系 Drawer 的控件候选已由新组件替代，清除只属于被删除控件的旧候选，保留仍在使用的请求、共享组件、Provider 链。
5. 共享 httpClient 仅新增 reason_code → ApiError.reasonCode；未增加请求、改动 Host、成功码、JWT、401刷新、Tenant隔离或重试规则。HTTP200/403及失败文件响应的既有分类保持，增加测试。依赖它的旧链重锁来源时保留原 Function 身份和请求映射，不用通用 hash 更新代替新增控件审查。
6. 清除未消费的跨 Tenant 写 DTO、快照适配、CSS 与旧 TENANTS 运行别名。没有恢复旧写入 API；没有删除数据库旧资源。新增四个 UI 别名仅从本页精确 Button 投影，内部提交仍检查实际资源码；rollout 仅补充实际 View 与控件观察，不开启模型切换或 SA/V1 补权。注册源仅增加已落地控件和精确事件，旧主体页面范围及 DMS 图片调用未改变。

中央 communication-inventory 为源码/依赖变更证据，不是授权结果。新文件候选逐个归类；watch、远程 loader、confirm、saved 事件有实际链；纯表单值、pending、关闭及请求号工厂无网络，保留 local 说明。Function 权威快照的旧定义不盲目重写指纹。

## 验证与剩余责任

浏览器采用项目 Playwright：Browser plugin not available，Ego CLI 未安装。模拟业务接口验证新增/编辑/结束、历史只读、版本失败恢复、精确权限隐藏、管理员同键重试、最后管理员原因码及本人重载；HTTP客户端覆盖200/403错误原因及旧租户响应拒绝。候选截图保存在系统临时目录，不覆盖 Approval/三视口基线。

真实 PostgreSQL 并发、Redis多会话与真实管理员写入未执行；本轮没有获准测试账号/隔离对象，不能把模拟验证记成在线授权验收。后端长度50/100与生成器80/160的已知差异仍归后端单独处理。当前视觉及 Page Contract 更新不自动沿用或伪造新的人工批准。

## 本轮质量记录

- Lint、生产/Preview/测试 TypeCheck、100项治理测试、生产/Preview Build、生产路由测试已通过；严格 Premium 静态审计0项发现。主色对比度4.30:1和构建包体警告为既有问题，没有修改全局Token掩盖。
- `pnpm quality` 全量运行：747个浏览器用例，645通过、24跳过、78失败。其中75项为已有批准截图与当前视觉差异，3项为旧 Dashboard 测试仍定位“今日运输单”。没有修改上述非本次业务的页面或自动覆盖基线。
- 本次8项成员维护行为在全量运行的3视口全部通过（24项）。之后追加候选搜索/新增不带旧身份、提交中禁止关闭/重复提交、运行时 pageerror 检查，并在最终专项回归验证。
- 最终代码重新执行Lint、生产/Preview/测试TypeCheck、100项治理检查、生产/Preview构建均通过。最终专项为成员维护、共享HTTP、角色抽屉、成员回归、当前租户查询共87项，三个标准桌面视口全部通过（含本次10项维护行为×3视口=30项）；页面运行时异常检查无发现。候选选择打开/搜索、原选中标签、日期输入、关闭及提交保护均使用真实浏览器交互验证。新造的接口返回仅用于测试，未发送真实管理员或归属写入。
- Page Contract base、preview-interaction通过；production profile仍被旧Approval阻断：当前revision19，记录revision4，且既有三视口基线摘要不符。未修改人工Approval或基线，不宣称发布门禁全绿。
- 维护导出：229个源码、1,682个候选、100项Permission模板、29个Package；unresolved=0、ready_for_sync=true。runtime_activation_ready=false保持原状，不等同于数据库同步或真实账号授权已生效。
- 本机 ExportDefinitions 未携独立导出Key只返回401；本轮没有取得部署Manifest快照，不将用户部署通知或离线190项Function目录冒充运行时验收。

候选图（系统临时目录，非批准基线）：`C:/Users/75946/AppData/Local/Temp/ss-express-member-admin-desktop-1440.png`、`ss-express-member-组织-desktop-1440.png`，其余标准视口同名前缀。未创建Git提交；保留既有未提交改动。
