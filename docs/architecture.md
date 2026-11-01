# 物流平台前端架构

本工程采用“认证前独立入口 + 认证后单 SPA 壳层 + 子系统域分组 + 子系统内 Feature-Based Architecture”。IAM、TMS、VMS 共享登录态、权限、设计系统和业务选择器，但各自的页面、API、类型、状态和业务规则保持隔离。`src/shared/components/AppShell.vue` 是认证后壳层视觉与基础交互的唯一 Owner，`src/app/layouts/AppLayout.vue` 只负责路由、会话、权限和生产动作装配；认证前页面使用 Registry 登记的 `StandaloneAuthLayout + AuthPageTemplate`，不显示 App Shell。

仓库根目录另设 `UIDesign/` 作为可运行 Preview Host。它属于设计时资产，不进入生产应用路由或构建产物；通过独立 Vite 入口复用根项目依赖、Design Token 和稳定 Shared 能力。存量页面继续兼容独立 Legacy Prototype；所有新页面通过 Feature 的唯一 `public.preview.ts` 入口装载 Canonical Page View，Preview 与 Production 只在 Fixture/真实依赖装配层分离。

```text
src/
├── app/                         # 应用装配层：路由、全局状态、布局、Provider
├── shared/                      # 全平台共享，禁止包含单一 Feature 的页面逻辑
│   ├── api/                     # Axios 实例、通用协议
│   ├── business-components/     # 跨 Feature 的物流业务组件
│   ├── charts/                  # ECharts 主题与通用配置
│   ├── components/              # 无业务语义的 UI 组件
│   ├── composables/
│   ├── constants/
│   ├── styles/                  # Design Token 与全局样式
│   ├── types/
│   └── utils/
├── features/
│   ├── platform/                # 平台总览、待办、经营分析
│   │   └── dashboard/
│   ├── iam/                     # 身份中心
│   │   ├── users/
│   │   ├── organizations/
│   │   └── roles/
│   ├── tms/                     # 运输管理
│   │   ├── orders/
│   │   ├── dispatch/
│   │   └── trips/
│   ├── vms/                     # 车辆管理
│   │   ├── vehicles/
│   │   ├── drivers/
│   │   └── maintenance/
│   └── reference/               # 标准页面参考实现
└── main.ts
```

每个 Feature 可按需包含 `pages/`、`components/`、`composables/`、`api/`、`types/`、`constants/`、`adapters/` 和 `routes.ts`。子系统路由由各自的 `routes.ts` 导出，`app/router` 只负责聚合。

## HTTP 与接口路径

IAM 授权统一绑定当前 Tenant。集团共享记录、Tenant 目录以及系统资源目录的对象范围不代表全局授权；它们仍通过 CurrentApps、CurrentAppMenus、CurrentPageResources 和后端 Function 判权。Tenant 目录维护按目标 `id` 操作，查询可以返回非本人所属租户；本人切换候选只使用登录/切换响应中的 `available_tenants`。普通员工、组织、岗位、角色和培训业务继续限定当前 Tenant。

- `src/shared/api/apiConfig.ts` 是 API Host、超时、凭据模式和成功码的唯一运行时配置入口；环境变量样例由根目录 `.env.example` 维护。
- `src/shared/api/httpClient.ts` 是唯一 Axios Instance，统一负责 Authorization、Request ID、并发 Token 刷新、401 会话失效和错误标准化。
- 权限治理新契约的 Int64 ID 在请求、响应及页面选择中保留十进制字符串，不转换为 Number。`shared/utils/entityId.ts` 统一无损规范化、比较及排序；Feature API 按显式 ID 字段清单在边界兼容旧安全整数响应。版本、Request ID、文件引用等不透明字符串不参与转换。当前会话仍使用旧认证契约的安全数字 Tenant ID；共享租户校验比较规范化后的身份，真实跨 Tenant 请求仍在发送前拦截。
- `src/shared/api/apiPath.ts` 负责定义和填充相对接口路径。业务 Endpoint 常量归属 `src/features/<subsystem>/<feature>/api/`，不得把所有子系统路径集中到 Shared。
- Feature 的 Vue、Page 与 Composable 不得直接调用 Axios/Fetch；只能通过本 Feature `api/` 暴露的函数访问后端。
- 开发环境使用 `DEV_API_TARGET` 将 `VITE_API_BASE_URL` 对应的相对前缀代理到后端；生产环境由部署网关处理相对路径，或显式提供受信任的 `VITE_API_BASE_URL`。
- Refresh Token 的传输与接口路径由 IAM API/安全契约提供。统一客户端只提供单飞刷新挂钩，不在缺少契约时硬编码刷新 Endpoint。

新页面需要 Preview 时使用以下边界：

```text
src/features/<subsystem>/<feature>/
├── components/<Page>View.vue       # Canonical Page View，唯一页面结构与可观察交互
├── preview/<Page>PreviewPage.vue    # Fixture / Mock 权限薄装配
├── pages/<Page>Page.vue             # 真实 API / 权限 / 路由薄装配
└── public.preview.ts                # UIDesign 唯一允许导入的 Feature 入口
```

## 边界规则

1. `app` 可以依赖 `shared` 与各子系统公开路由；Feature 不反向依赖 `app` 的内部实现。
2. IAM/TMS/VMS 的 Feature 不直接引用其他 Feature 的内部组件、Composable 或类型。
3. 跨 Feature 复用优先提升到 `shared/business-components`，纯 UI 能力放入 `shared/components`。
4. 跨系统契约通过各域的 `public.ts` 或 `shared/types` 暴露，禁止深层路径导入。
5. 全局 Pinia 仅保存会话、权限、应用配置和全局字典；列表筛选与抽屉状态保留在页面或 Feature Composable。
6. 后续若增加独立司机移动端，应在仓库根目录建立独立工程，不与桌面后台共享页面层，仅共享显式抽取的无 UI 契约。
7. `UIDesign` 负责候选页面装载、场景切换和视觉/交互审查；业务规则仍由 PRD 与 `docs/page-specs/` 下的版本化 Page Contract 定义。
8. Legacy Prototype 只能依赖稳定 `shared` 能力；Canonical Feature Preview 只能通过 `@feature-preview/<subsystem>/<feature>/public.preview` 导入对应 Feature。
9. `public.preview.ts` 与 `preview/` 禁止引用真实 API、认证、生产 Store 或生产路由；生产源码禁止导入 Preview Entry 与 Fixture。
10. Canonical Preview 与 Production 必须组合同一 Page View，不允许复制页面结构。Legacy Prototype 保持兼容并按页面迁移，不做大爆炸重写。
11. `UIDesign/approved-prototypes.json` 只是 Legacy v0 的 approved/路由/基线兼容投影；新 v0.1 页面使用 `UIDesign/approvals/<page-id>.json`，并绑定 Contract 摘要与三视口基线。
12. 标准业务页面必须组合 `src/shared/components/page-templates` 中的有限 Pattern；全页业务组件仅允许使用静态检查脚本登记的标准实现。
13. `pnpm standards:check` 与 `pnpm prototype:check` 属于合并门禁，禁止通过局部关闭规则绕过。
14. `AppLayout` 是认证后生产 `AppShell` 的唯一装配点；Feature 页面只交付 `AppPage + content PageTemplate` 内容树。认证前路由只允许 Registry 登记的 standalone Pattern。页面不得自行建立视口级宽高或第二个 App Shell，容器适配由共享 Pattern、静态审计和三视口 Playwright 共同保证。
15. 权限治理采用 V2：前端目录 App → Module → Menu → Button / ButtonPage；后端 Function 独立登记（source=backend、parent_id=0），不得挂到页面目录中。Permission 组合唯一业务前端资源与后端 Function，Role 明确关联 Permission；parent_permission_id 只用于展示，default_selected_with_parent 只用于人工主动勾选，不产生运行时继承。导航使用 CurrentPermissionResource/CurrentApps、CurrentAppMenus；菜单顺序来自服务端。2026-09-29 起，已登记页面统一按 CurrentPageResources(page_resource_code) 获取精确页面/按钮权限，不再调用 CurrentFunctions。旧 UI 判断常量由本页限定的显式适配表投影，不读取或合并 V1 权限；维护 rollout 元数据仍待专项复核，不代表已通过线上授权验收。当前接口契约见 docs/api/iam-shell-context.md。
16. 五个活动权限页面的唯一正式目录为 src/features/iam/permission-governance/pages/。旧应用资源、角色功能权限、角色数据权限、用户角色与权限页已退役，位于 archive/iam-permission-v1/2026-09-27/；归档目录禁止被生产、Preview、资源初始化扫描。用户角色分配保留在 foundation/components/MemberRolesDrawer.vue，由 /iam/members 按钮打开，不增加独立路由；支持按当前成员分配、移除角色，管理员身份仍由租户归属功能维护。用户有效权限页只读。角色管理与角色成员页仍有效，不能整目录排除 access-control。退役清单 standards/iam-retirements.json 不授权删除数据库记录；pnpm iam:retirement:check 检查旧入口没有复活。
17. 尚未实现的生产入口必须同时使用 `FeatureScaffoldPage` 与 `meta.implementationStatus = 'placeholder'`。生产环境的服务端菜单适配、App 首入口解析和 Overview 卡片不暴露这类入口；直接访问仍保留，用明确的“功能开发中”状态说明现状。该字段不是权限凭证，也不能单独证明页面属于纯占位；资源审计只有在占位组件及依赖证据仍有效时才排除业务资源。真实实现接管路由时必须删除标记。
18. `src/features/reference/**` 是可复用的标准页面示例源码，不属于生产业务资源；`/reference/*` 仅在 `import.meta.env.DEV` 为真时注册。生产占位页不得输出指向 Reference 的悬空链接。

## 扩展新子系统

新增或修改正式页面及通信行为时，同步维护 Feature 的静态资源注册表、resource_element、Permission 模板。独立生产发现与变更审查规则见 `standards/iam/README.md`；`iam:maintenance:check` 属于 Lint/CI 门禁。当前未迁移范围显式列出，不等同全站授权已就绪。

正式资源同时维护简要 `remarks`（用途与使用场景），由注册表传递到 `data-resource-description` 和维护清单；结构 Module 从资源状态策略读取。说明不能代替具体控件事件、实际 API、权限或敏感操作确认。协议及元数据审查见 `standards/resource-elements.md`。

新增例如 WMS 时：创建 `features/wms/<feature>`，导出 `wmsRoutes`，在 `app/config/subsystems.ts` 注册入口和导航，再由 `app/router` 聚合。无需改动其他子系统内部文件。
