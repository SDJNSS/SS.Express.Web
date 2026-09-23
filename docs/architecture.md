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

- `src/shared/api/apiConfig.ts` 是 API Host、超时、凭据模式和成功码的唯一运行时配置入口；环境变量样例由根目录 `.env.example` 维护。
- `src/shared/api/httpClient.ts` 是唯一 Axios Instance，统一负责 Authorization、Request ID、并发 Token 刷新、401 会话失效和错误标准化。
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
15. 权限资源目录可维护 `App → Module → Menu → Page → Function` 完整层级，但框架运行时必须区分导航与操作授权：顶部 App 来自 IAM `CurrentApps`；`CurrentAppMenus(app_id)` **只返回 `App → Module → Menu`**，是左侧导航、App 首入口和所属 Menu 解析的唯一来源，不提供 Page 或 Function。隐藏 Page 由前端静态路由登记，并显式归属唯一 Menu；其列表、详情、编辑等入口以及路由访问统一使用所属 Menu 的 `CurrentFunctions(menu_id)` 返回的稳定 `:view` Function `permission_code`。写操作继续使用 `:update` 或对应专用 Function。资源目录中的 Page `permission_code` 不作为运行时按钮编号，也不得代替 `:view` Function。`CurrentFunctions` 只能在所属 Menu 解析成功后调用，禁止空参提前调用或跨 Menu 沿用旧权限。`app/config/subsystems.ts` 只保存已知 App 的本地名称与图标回退，不保存首页或菜单顺序，也不得作为授权数据源。框架类 Page Contract 可通过受审计的 `app-layout-production-owner` 例外将 Production Binding 指向唯一 `src/app/layouts/AppLayout.vue`，并用一个真实业务路由作为生产代表入口。
16. IAM 角色功能权限与用户角色与权限是两个独立 Page，可复用 `access-control/components/FunctionPermissionPanel.vue` 这一无路由依赖的权限树工作区。生产路由页必须显式注入 `subjectType` 与 `canEdit`：角色场景固定为 `role`，仅在有效 Function 包含 `iam:roles:function-permissions:update` 时允许编辑；用户页面的 Function 页签固定为 `member` 且 `canEdit=false`，页面先用 `user_id + tenant_id` 解析 `tenant_user_id`，再查询该 Tenant 成员的有效角色权限，不提供用户直授或保存入口。用户页面的角色页签可以在同一成员上下文中分配或撤销角色，但该能力不得渗入只读 Function 工作区。共享组件禁止读取 URL、路由名称或查询参数推断业务场景与权限。前端门禁只负责可发现性和误操作防护，服务端仍执行最终授权并在无权时返回 403。
17. 尚未实现的生产入口必须同时使用 `FeatureScaffoldPage` 与 `meta.implementationStatus = 'placeholder'`。生产环境的服务端菜单适配、App 首入口解析和 Overview 卡片不暴露这类入口；直接访问仍保留，用明确的“功能开发中”状态说明现状。该字段不是权限凭证，也不能单独证明页面属于纯占位；资源审计只有在占位组件及依赖证据仍有效时才排除业务资源。真实实现接管路由时必须删除标记。
18. `src/features/reference/**` 是可复用的标准页面示例源码，不属于生产业务资源；`/reference/*` 仅在 `import.meta.env.DEV` 为真时注册。生产占位页不得输出指向 Reference 的悬空链接。

## 扩展新子系统

新增例如 WMS 时：创建 `features/wms/<feature>`，导出 `wmsRoutes`，在 `app/config/subsystems.ts` 注册入口和导航，再由 `app/router` 聚合。无需改动其他子系统内部文件。
