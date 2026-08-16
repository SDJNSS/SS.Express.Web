# SS.Express.Web

SS.Express.Web 是神树物流平台的前端 monorepo，面向 SaaS 平台管理、主工作台以及物流业务子系统。项目采用 Vue 3 + TypeScript + Vite 构建，使用 pnpm workspace 管理多应用和共享包，使用 Turborepo 编排开发、构建、类型检查等任务。

## 项目定位

该仓库不是单一前端应用，而是一个多应用工作区：

- `apps/*` 放各业务前端应用，每个应用可独立启动、构建和部署。
- `packages/*` 放跨应用复用能力，包括请求、认证、权限、字典、类型、工具函数和通用 UI。
- 根目录负责统一依赖、脚本、代码规范、环境变量和任务编排。

整体设计思路是“业务应用轻量化，共性能力包化”：业务页面尽量只关心自身路由、页面、API 和状态；通用认证、租户上下文、权限校验、请求头注入、字典和组件能力沉淀到 workspace 包中复用。

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

## 应用模块

| 目录 | 包名 | 说明 |
| --- | --- | --- |
| `apps/shell` | `@logistics/shell` | 平台主壳，包含登录、租户选择、工作台、无权限页等入口流程。 |
| `apps/saas-admin` | `@logistics/saas-admin` | SaaS 管理后台，覆盖租户、应用、功能、套餐、订阅、IAM、权限资源、审计等管理能力。 |
| `apps/wms` | `@logistics/wms` | 仓储管理系统前端。 |
| `apps/yms` | `@logistics/yms` | 园区管理系统前端。 |
| `apps/tms` | `@logistics/tms` | 运输管理系统前端。 |
| `apps/oms` | `@logistics/oms` | 订单管理系统前端。 |
| `apps/crm` | `@logistics/crm` | 客户管理系统前端。 |

除 `saas-admin` 目前较完整外，其他业务应用主要保留标准 Vite/Vue 应用骨架，后续按同一模式扩展。

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
├─ docs/                 # 项目文档
├─ doc/                  # 过程文档/分析文档
├─ package.json          # 根脚本与依赖
├─ pnpm-workspace.yaml   # workspace 声明
├─ turbo.json            # Turborepo 任务配置
├─ tsconfig.base.json    # TypeScript 基础配置
├─ eslint.config.js
└─ prettier.config.js
```

## saas-admin 结构

`apps/saas-admin` 是当前最重要的参考实现：

```text
apps/saas-admin/src/
├─ api/          # saas、iam、audit 三类接口封装
├─ components/   # 通用页面组件，如 PageContainer、SearchForm、DataTable、TreeTable
├─ layouts/      # MainLayout 和功能菜单
├─ router/       # 页面路由
├─ stores/       # 登录态、租户态等本应用状态
├─ types/        # SaaS、IAM、审计、通用类型
├─ utils/
└─ views/        # 菜单对应页面，常见模式为 Index.vue + Form.vue
```

新增后台管理页面时，优先参考 `views/tenant`、`views/role`、`views/resource`、`views/data-scope` 的列表页和表单页模式。

## 请求与权限设计

- 请求入口优先使用 `@logistics/request` 暴露的 `request` 或 `createRequestClient`。
- 请求拦截器会注入：`Authorization`、`X-Tenant-Id`、`X-App-Code`、`X-Timezone`、`X-Language`。
- 认证上下文在 `@logistics/auth` 中维护，包含用户、租户、套餐和订阅信息。
- 权限上下文在 `@logistics/permission` 中维护，包含应用、功能、权限码、按钮码和菜单树。
- 页面权限可通过路由 `meta.permission` / `meta.appCode` 与权限守卫控制；按钮可用 `v-permission` 或 `AuthButton` 控制。

注意：SaaS/IAM 相关接口如果传递 `tenant_id`，后端接口说明中要求同时携带 `tenant_code`，前端对接时也应保留这两个字段的映射。

## 常用命令

```bash
pnpm install

pnpm dev              # 并行启动全部应用
pnpm dev:shell        # 启动主壳
pnpm dev:saas         # 启动 SaaS 管理后台
pnpm dev:wms
pnpm dev:yms
pnpm dev:tms
pnpm dev:oms
pnpm dev:crm

pnpm build            # 构建全部应用和依赖包
pnpm build:saas       # 构建 SaaS 管理后台
pnpm lint             # ESLint 检查
pnpm typecheck        # TypeScript 类型检查
pnpm format           # Prettier 格式化
```

## 接手开发建议

1. 先读根目录 `package.json`、`pnpm-workspace.yaml`、`turbo.json`，理解 workspace 和脚本。
2. 需要开发 SaaS 后台时，从 `apps/saas-admin/src/layouts/MainLayout.vue` 看菜单，从 `router/index.ts` 看路由，再进入对应 `views/*` 和 `api/*`。
3. 新增跨应用能力时优先放到 `packages/*`；只服务单个应用的代码放在对应 `apps/*/src`。
4. 新增接口时保持 `api -> types -> views` 的依赖方向，避免页面里散落裸请求。
5. 变更认证、租户、权限、请求头逻辑时，先检查 `packages/auth`、`packages/permission`、`packages/request` 是否会影响所有应用。
6. 业务应用目前结构相似，可以用 `saas-admin` 的 API 分层、类型分层和页面组织方式作为扩展模板。

## 重要文档

- `prd.md`：早期产品需求说明。
- `docs/`：SaaS Admin 开发报告、进度、快速启动等文档。
- `doc/`：项目分析和接口说明类文档。
- `apps/saas-admin/README.md`：SaaS Admin 子应用说明。
