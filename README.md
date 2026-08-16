# SS.Express.Web

SS.Express.Web 是神树物流平台的前端 monorepo，承载平台主壳、SaaS 管理后台以及 WMS/YMS/TMS/OMS/CRM 等物流业务子系统前端。项目采用 Vue 3 + TypeScript + Vite，使用 pnpm workspace 管理多应用和共享包，使用 Turborepo 编排开发、构建、类型检查和格式化任务。

本文档面向后续接手项目的 agent。请优先阅读“当前进展”和“继续任务建议”，再进入具体代码。

## 当前进展

截至 2026-08-16，重点工作集中在 `apps/shell` 的平台框架页，以及 `apps/saas-admin` 的 SaaS 管理后台分析文档。

### shell 平台框架页

当前平台框架页位于：

```text
apps/shell/src/views/FrameworkPreview.vue
```

路由入口：

```text
http://localhost:3000/framework-preview
```

根路由 `/` 已重定向到 `/framework-preview`。

已完成的框架页能力：

- 去掉原型图中的浏览器外壳，不再保留 `browser-chrome`。
- 左侧 `sidebar` 作为平台统一导航区，右侧作为业务子系统页面承载区。
- 右侧内容区目前只保留 `content-head`，其他示例指标、图表、表格内容已清空，后续用于挂载真实页面。
- `content-head` 中的日期按钮 `date-pill` 已删除。
- 顶部栏包含平台标识、全局搜索、AI 助手、日期、天气位置合并按钮、通知按钮。
- 位置信息与天气信息已合并，去掉单独位置图标，使用图片天气图标后跟“上海 / 多云 26℃”。
- 通知按钮使用图片资源，不再使用 CSS 手绘铃铛。
- 左侧租户 `sidebar-eyebrow` 文案清空。
- 用户头像使用图片资源，并保留暖色头像容器，避免黑色边框。
- 用户信息下方增加“设置”“退出登录”两个按钮。

相关资源文件：

```text
apps/shell/src/assets/platform/weather-cloud-sun.png
apps/shell/src/assets/platform/notification-bell.png
apps/shell/src/assets/platform/user-avatar.png
```

### shell 平台公共组件

新增/改造的框架组件：

```text
apps/shell/src/components/platform/PlatformSidebar.vue
apps/shell/src/components/platform/PlatformMenuNode.vue
apps/shell/src/components/platform/PlatformSearchInput.vue
apps/shell/src/composables/usePlatformMenu.ts
apps/shell/src/types/platform.ts
apps/shell/src/vite-env.d.ts
```

组件职责：

- `PlatformSidebar.vue`：平台左侧导航、租户信息、侧边搜索、用户信息、设置/退出按钮。
- `PlatformMenuNode.vue`：递归菜单节点组件，负责多级菜单渲染、展开箭头和激活态。
- `PlatformSearchInput.vue`：公共搜索/自动完成控件。
- `usePlatformMenu.ts`：菜单展开、激活、搜索结果反向定位菜单路径。
- `platform.ts`：平台框架相关类型，包括菜单、用户、租户、搜索结果类型。

菜单行为约束：

- 一级菜单不关联任何页面，只允许展开/收起；一级菜单无子菜单时点击不改变右侧标题。
- 二级及以下叶子菜单没有子菜单时不显示展开箭头。
- 搜索结果选中后通过 `focusMenuByKey` 展开对应菜单路径，并激活有 `path` 的叶子菜单。

### 公共搜索控件

`PlatformSearchInput.vue` 已按主流 Autocomplete / Combobox 模式改造。

已支持：

- `searchThreshold`：字符数大于阈值时触发 `search` 事件。当前框架页设置为 `1`，即输入 2 个及以上字符开始搜索。
- 在搜索框下方展示搜索结果。
- 点击搜索结果触发 `result-select`，由业务层决定跳菜单、打开页面或执行其他动作。
- 支持键盘上下选择、回车选择、Esc 关闭。
- 使用 `role="combobox"`、`role="listbox"`、`role="option"` 等语义。
- 默认不是 `readonly`。公共组件保留 `readonly` 参数，但使用方不传时可正常输入。
- 顶部全局搜索和左侧搜索都已替换为该组件。

当前框架页的搜索数据源来自 `platformMenus`，会匹配菜单标题、面包屑描述和 `path`。输入 `运单` 会出现“运单管理 / 运单列表 / 异常列表 / 其他管理”等结果，点击“异常列表”会把右侧标题切换为“异常列表”。

### saas-admin 与接口文档

`apps/saas-admin` 是 SaaS 管理后台，包含租户、应用、功能、套餐、订阅、用户、租户用户、组织、岗位、角色、资源、数据权限等页面与接口分层。

此前已基于数据库 DDL 和菜单分析过 SaaS 后台接口需求，文档在：

```text
doc/saas-admin-api-specs.md
doc/saas-admin-api-specification.md
doc/saas-admin-api-specification-complete.md
```

注意：接口说明中凡出现 `tenant_id` 的地方，都应同时携带 `tenant_code`。后续前端对接接口时也要保留这两个字段的映射。

## 技术栈

- 框架：Vue 3，Composition API，`script setup`
- 语言：TypeScript 5
- 构建：Vite 5
- 路由：Vue Router 4
- 状态：Pinia
- 请求：Axios，封装在 `@logistics/request`
- 工作区：pnpm workspace
- 任务编排：Turborepo
- 代码质量：ESLint、Prettier、vue-tsc
- 环境变量：`.env`、`.env.development`、`.env.test`、`.env.production`

## 设计思路

项目按“平台主壳 + 业务子系统 + 共享能力包”组织：

- `apps/shell` 是平台统一入口和集成框架，后续应负责统一导航、搜索、租户上下文、用户入口、顶部工具栏和子系统挂载。
- `apps/saas-admin` 是当前最完整的业务后台参考实现。
- `apps/wms`、`apps/yms`、`apps/tms`、`apps/oms`、`apps/crm` 是业务子系统应用骨架，后续应逐步接入 shell 框架。
- `packages/*` 放跨应用复用能力，例如认证、权限、请求、字典、类型、工具函数和通用 UI。

新增代码时优先遵循：

- 框架公共逻辑放 `apps/shell/src/components/platform`、`apps/shell/src/composables`、`apps/shell/src/types`。
- 单个业务应用内部逻辑放对应 `apps/*/src`。
- 跨多个应用复用的认证、权限、请求、字典、类型、工具能力放 `packages/*`。
- 页面里不要散落裸请求，保持 `api -> types -> views` 的依赖方向。

## 应用模块

| 目录 | 包名 | 说明 |
| --- | --- | --- |
| `apps/shell` | `@logistics/shell` | 平台主壳。当前包含登录、租户选择、工作台、无权限页和前端框架预览页。 |
| `apps/saas-admin` | `@logistics/saas-admin` | SaaS 管理后台，当前最完整，适合作为后台页面开发参考。 |
| `apps/wms` | `@logistics/wms` | 仓储管理系统前端骨架。 |
| `apps/yms` | `@logistics/yms` | 园区管理系统前端骨架。 |
| `apps/tms` | `@logistics/tms` | 运输管理系统前端骨架。 |
| `apps/oms` | `@logistics/oms` | 订单管理系统前端骨架。 |
| `apps/crm` | `@logistics/crm` | 客户管理系统前端骨架。 |

## 共享包

| 目录 | 包名 | 职责 |
| --- | --- | --- |
| `packages/request` | `@logistics/request` | Axios 客户端封装，统一注入 token、租户、应用、时区、语言请求头，并处理 401/403。 |
| `packages/auth` | `@logistics/auth` | 认证状态 Pinia store，维护 token、用户、租户、套餐和订阅上下文。 |
| `packages/permission` | `@logistics/permission` | 权限状态、权限判断、`v-permission` 指令和路由守卫。 |
| `packages/dict` | `@logistics/dict` | 字典缓存、字典取值和标签解析。 |
| `packages/ui` | `@logistics/ui` | 通用 UI 组件导出，如 `AuthButton`、`DictSelect`、`DictTag`。 |
| `packages/types` | `@logistics/types` | 公共接口类型，如 `ApiResponse`、`PageResult`、`AuthState`、`PermissionState`。 |
| `packages/config` | `@logistics/config` | 应用编码和环境配置读取。 |
| `packages/utils` | `@logistics/utils` | 日期格式化、debounce、throttle、deepClone 等工具。 |
| `packages/router` | `@logistics/router` | 路由工具预留包。 |
| `packages/store` | `@logistics/store` | 状态管理工具预留包。 |
| `packages/layout` | `@logistics/layout` | 通用布局预留包。 |

## 目录结构

```text
SS.Express.Web/
├─ apps/
│  ├─ shell/
│  ├─ saas-admin/
│  ├─ wms/
│  ├─ yms/
│  ├─ tms/
│  ├─ oms/
│  └─ crm/
├─ packages/
│  ├─ auth/
│  ├─ config/
│  ├─ dict/
│  ├─ layout/
│  ├─ permission/
│  ├─ request/
│  ├─ router/
│  ├─ store/
│  ├─ types/
│  ├─ ui/
│  └─ utils/
├─ doc/                  # 接口分析和过程文档
├─ docs/                 # 项目报告、启动说明、开发报告
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
├─ tsconfig.base.json
├─ eslint.config.js
└─ prettier.config.js
```

## saas-admin 参考结构

```text
apps/saas-admin/src/
├─ api/          # saas、iam、audit 三类接口封装
├─ components/   # PageContainer、SearchForm、DataTable、TreeTable 等
├─ layouts/      # MainLayout 和功能菜单
├─ router/       # 页面路由
├─ stores/       # 登录态、租户态等本应用状态
├─ types/        # SaaS、IAM、审计、通用类型
├─ utils/
└─ views/        # 菜单对应页面，常见模式为 Index.vue + Form.vue
```

新增后台管理页面时，优先参考：

```text
apps/saas-admin/src/views/tenant
apps/saas-admin/src/views/role
apps/saas-admin/src/views/resource
apps/saas-admin/src/views/data-scope
```

## 常用命令

```bash
pnpm install

pnpm dev              # 并行启动全部应用
pnpm dev:shell        # 启动平台主壳，默认 Vite 端口 3000
pnpm dev:saas         # 启动 SaaS 管理后台
pnpm dev:wms
pnpm dev:yms
pnpm dev:tms
pnpm dev:oms
pnpm dev:crm

pnpm build            # 构建全部应用和依赖包
pnpm build:shell
pnpm build:saas
pnpm lint
pnpm typecheck
pnpm format
```

单独验证 shell 的 Vite 构建可使用：

```bash
pnpm --filter @logistics/shell exec vite build
```

## 已知验证与环境注意事项

最近验证过：

```bash
pnpm --filter @logistics/shell exec vite build
```

该命令通过。

注意：`apps/*/package.json` 中的 `build` 脚本包含 `vue-tsc && vite build`。在当前机器的 Node `v24.16.0` 环境下，`vue-tsc@1.8.27` 可能报错：

```text
Search string not found: "/supportedTSExtensions = .*(?=;)/"
```

这是 `vue-tsc` 与当前 Node/TypeScript 组合的工具兼容问题，不代表最近的 shell 框架页代码本身构建失败。继续任务时建议使用 Node 18/20，或升级 `vue-tsc` 后再跑完整 `pnpm build:shell` / `pnpm typecheck`。

## 继续任务建议

新会话继续时，建议按以下顺序进入：

1. 打开 `apps/shell/src/views/FrameworkPreview.vue`，理解当前平台框架页布局和菜单数据。
2. 打开 `apps/shell/src/components/platform/PlatformSearchInput.vue`，理解公共搜索控件的阈值、结果浮层和 `result-select` 事件。
3. 打开 `apps/shell/src/composables/usePlatformMenu.ts`，理解一级菜单行为、路径展开和搜索结果定位逻辑。
4. 打开 `apps/shell/src/components/platform/PlatformSidebar.vue`、`PlatformMenuNode.vue`，继续优化公共组件命名、样式和复用边界。
5. 如要接入真实业务页面，先确定 shell 是通过路由、微前端还是 iframe/模块加载方式承载各子系统。
6. 如继续 SaaS 管理后台接口对接，先读 `doc/saas-admin-api-specs.md` 和 `apps/saas-admin/src/api/*`。

下一阶段可能要做的事情：

- 把 `FrameworkPreview.vue` 从“效果页”进一步沉淀成真实 shell layout。
- 明确各子系统页面挂载方式，并把右侧 `content-shell` 接到真实路由出口或子应用容器。
- 把 `platformMenus` 从静态数据改为权限/后端菜单数据。
- 把顶部全局搜索从本地菜单搜索扩展为菜单、页面、运单、客户、车辆等统一搜索。
- 为 `PlatformSearchInput` 增加异步搜索、防抖、加载状态和结果分组展示。
- 将平台通用组件迁移到更合适的共享包，或保留在 shell 内作为平台私有组件。

## 重要文档

- `prd.md`：早期产品需求说明。
- `PROJECT_SETUP_SUMMARY.md`：项目初始化摘要。
- `SETUP_CHECKLIST.md`：初始化检查清单。
- `docs/QUICK_START.md`：快速启动说明。
- `docs/SAAS_ADMIN_FINAL_REPORT.md`：SaaS Admin 开发报告。
- `doc/saas-admin-api-specs.md`：SaaS Admin 接口分析文档。
- `apps/saas-admin/README.md`：SaaS Admin 子应用说明。
