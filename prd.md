# Logistics Platform Web

物流平台前端工程。

本项目采用：

```text
Monorepo + 多应用 + 平台 Shell + 共享 Packages
```

用于支撑：

```text
SaaS 管理模块
WMS 仓储管理系统
YMS 园区管理系统
TMS 运输管理系统
OMS 订单管理系统
CRM 客户管理系统
```

---

## 1. 技术栈

```text
Vue 3
Vite
TypeScript
Pinia
Vue Router
Axios
pnpm workspace
Turborepo
ESLint
Prettier
```

---

## 2. 项目结构

```text
logistics-platform-web
├── apps
│   ├── shell
│   ├── saas-admin
│   ├── wms
│   ├── yms
│   ├── tms
│   ├── oms
│   └── crm
│
├── packages
│   ├── ui
│   ├── request
│   ├── auth
│   ├── permission
│   ├── dict
│   ├── layout
│   ├── router
│   ├── store
│   ├── types
│   ├── utils
│   └── config
│
├── docs
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── eslint.config.js
├── prettier.config.js
└── README.md
```

---

## 3. 应用说明

### apps/shell

平台主壳。

负责：

```text
登录
退出
租户选择
工作台
应用入口
全局布局
Token 管理
租户上下文初始化
权限上下文初始化
```

---

### apps/saas-admin

SaaS 管理后台。

包含 21 个模块：

```text
1. 租户管理
2. 应用管理
3. 功能管理
4. 套餐管理
5. 订阅管理
6. 用户管理
7. 租户用户管理
8. 登录与会话管理
9. 组织架构管理
10. 岗位管理
11. 角色管理
12. 角色模板管理
13. 权限资源管理
14. 角色资源授权
15. 用户 / 组织 / 岗位授权
16. 按钮与 API 绑定
17. 数据权限配置
18. 登录审计
19. 操作审计
20. 权限变更审计
21. 数据导出审计
```

---

### apps/wms

仓储管理系统。

---

### apps/yms

园区管理系统。

---

### apps/tms

运输管理系统。

---

### apps/oms

订单管理系统。

---

### apps/crm

客户管理系统。

---

## 4. Packages 说明

### @logistics/request

统一请求封装。

职责：

```text
Axios 实例
Token 注入
TenantId 注入
AppCode 注入
统一错误处理
401 / 403 处理
下载处理
```

---

### @logistics/auth

统一认证上下文。

职责：

```text
登录态管理
Token 管理
当前用户
当前租户
订阅信息
退出登录
```

---

### @logistics/permission

统一权限控制。

职责：

```text
菜单权限
按钮权限
应用权限
功能权限
路由守卫
v-permission 指令
```

---

### @logistics/dict

统一字典能力。

职责：

```text
字典加载
字典缓存
字典转换
DictSelect
DictTag
```

---

### @logistics/ui

通用 UI 组件。

包含：

```text
AuthButton
AuthTableAction
PageContainer
SearchForm
DataTable
TreeSelect
DictSelect
DictTag
StatusTag
ConfirmAction
```

---

### @logistics/types

公共 TypeScript 类型。

---

### @logistics/utils

公共工具函数。

---

## 5. 环境要求

```text
Node.js >= 18
pnpm >= 8
```

---

## 6. 安装依赖

```bash
pnpm install
```

---

## 7. 本地开发

启动 Shell：

```bash
pnpm dev:shell
```

启动 SaaS Admin：

```bash
pnpm dev:saas
```

启动 WMS：

```bash
pnpm dev:wms
```

启动 YMS：

```bash
pnpm dev:yms
```

启动 TMS：

```bash
pnpm dev:tms
```

启动全部：

```bash
pnpm dev
```

---

## 8. 构建

构建全部应用：

```bash
pnpm build
```

构建 Shell：

```bash
pnpm build:shell
```

构建 SaaS Admin：

```bash
pnpm build:saas
```

构建 WMS：

```bash
pnpm build:wms
```

构建 YMS：

```bash
pnpm build:yms
```

构建 TMS：

```bash
pnpm build:tms
```

---

## 9. 代码检查

```bash
pnpm lint
```

格式化：

```bash
pnpm format
```

类型检查：

```bash
pnpm typecheck
```

---

## 10. 环境变量

根目录提供：

```text
.env
.env.development
.env.test
.env.production
```

示例：

```bash
VITE_APP_ENV=development
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_TITLE=Logistics Platform
VITE_DEFAULT_LANGUAGE=zh-CN
VITE_DEFAULT_TIMEZONE=Asia/Shanghai
```

每个应用可以定义：

```bash
VITE_APP_CODE=SAAS
```

或：

```bash
VITE_APP_CODE=YMS
```

---

## 11. 请求规范

所有 API 请求必须通过：

```ts
import { request } from '@logistics/request'
```

禁止直接在业务代码中创建 Axios 实例。

请求头统一包含：

```http
Authorization: Bearer <access_token>
X-Tenant-Id: <tenant_id>
X-App-Code: <app_code>
X-Timezone: <timezone>
X-Language: <language>
```

---

## 12. API 响应格式

标准响应：

```ts
export interface ApiResponse<T> {
  code: string
  message: string
  data: T
  success: boolean
}
```

分页响应：

```ts
export interface PageResult<T> {
  records: T[]
  total: number
  pageNo: number
  pageSize: number
}
```

---

## 13. 登录流程

```text
1. 用户访问 /login。
2. 输入账号密码。
3. 调用登录接口。
4. 保存 accessToken 和 refreshToken。
5. 获取用户所属租户。
6. 如果只有一个租户，自动进入。
7. 如果有多个租户，跳转租户选择页。
8. 选择租户后初始化租户上下文。
9. 加载当前租户可访问应用。
10. 加载当前用户菜单和按钮权限。
11. 进入工作台。
```

---

## 14. 前端全局状态

登录后必须维护：

```ts
export interface AuthState {
  accessToken: string
  refreshToken: string
  userId: number
  username: string
  realName: string
  tenantId: number
  tenantUserId: number
  tenantCode: string
  tenantName: string
  tenantStatus: string
  planId: number
  planCode: string
  planName: string
  subscriptionStatus: string
  subscriptionEndAt: string
}
```

权限状态：

```ts
export interface PermissionState {
  appCodes: string[]
  featureCodes: string[]
  permissionCodes: string[]
  buttonCodes: string[]
  menuTree: MenuNode[]
}
```

---

## 15. 权限使用规范

按钮权限：

```vue
<AuthButton permission="saas:tenant:create" type="primary">
  新建租户
</AuthButton>
```

指令方式：

```vue
<button v-permission="'saas:tenant:create'">
  新建租户
</button>
```

表格操作：

```vue
<AuthTableAction
  permission="saas:tenant:update"
  label="编辑"
  @click="handleEdit(row)"
/>
```

禁止：

```ts
if (user.role === 'admin') {
  showButton = true
}
```

必须使用：

```ts
hasPermission('saas:tenant:create')
```

---

## 16. 权限编码规范

格式：

```text
app:module:resource:action
```

示例：

```text
saas:tenant:view
saas:tenant:create
saas:tenant:update
saas:tenant:delete
saas:plan:feature-config
saas:subscription:renew
yms:move-task:create
wms:inventory:export
tms:dispatch:assign
```

---

## 17. 字典使用规范

使用字典 Hook：

```ts
const options = useDict('saas_tenant_status')
```

下拉组件：

```vue
<DictSelect dict-type="saas_tenant_status" v-model="form.status" />
```

标签组件：

```vue
<DictTag dict-type="saas_tenant_status" :value="row.status" />
```

禁止在页面中硬编码状态枚举。

---

## 18. 新增业务模块规范

每个业务模块结构：

```text
module-name
├── api.ts
├── types.ts
├── routes.ts
├── pages
│   ├── List.vue
│   ├── Detail.vue
│   └── Form.vue
├── components
└── index.ts
```

示例：

```text
modules/tenant
├── api.ts
├── types.ts
├── routes.ts
├── pages
│   ├── TenantList.vue
│   ├── TenantDetail.vue
│   └── TenantForm.vue
├── components
└── index.ts
```

---

## 19. API 文件规范

示例：

```ts
import { request } from '@logistics/request'
import type {
  TenantCreateRequest,
  TenantUpdateRequest,
  TenantListQuery,
  TenantListVO,
  TenantDetailVO
} from './types'

export function getTenantPage(params: TenantListQuery) {
  return request.get<PageResult<TenantListVO>>('/api/saas/v1/tenants', {
    params
  })
}

export function getTenantDetail(id: number) {
  return request.get<TenantDetailVO>(`/api/saas/v1/tenants/${id}`)
}

export function createTenant(data: TenantCreateRequest) {
  return request.post('/api/saas/v1/tenants', data)
}

export function updateTenant(id: number, data: TenantUpdateRequest) {
  return request.put(`/api/saas/v1/tenants/${id}`, data)
}

export function deleteTenant(id: number) {
  return request.delete(`/api/saas/v1/tenants/${id}`)
}
```

---

## 20. 类型文件规范

每个模块必须定义：

```text
Query
CreateRequest
UpdateRequest
ListVO
DetailVO
```

示例：

```ts
export interface TenantListQuery {
  tenantCode?: string
  tenantName?: string
  tenantType?: string
  status?: string
  pageNo: number
  pageSize: number
}

export interface TenantCreateRequest {
  tenantCode: string
  tenantName: string
  tenantType: string
  companyName?: string
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  domain?: string
  subdomain?: string
  timezone: string
  language: string
}

export interface TenantListVO {
  id: number
  tenantCode: string
  tenantName: string
  tenantType: string
  status: string
  contactName: string
  contactPhone: string
  currentPlanName?: string
  subscriptionEndAt?: string
  createdAt: string
}
```

---

## 21. 路由规范

示例：

```ts
export const tenantRoutes = [
  {
    path: '/saas/tenants',
    component: () => import('./pages/TenantList.vue'),
    meta: {
      title: '租户管理',
      appCode: 'SAAS',
      permission: 'saas:tenant:view'
    }
  }
]
```

所有受保护路由必须配置：

```text
meta.permission
meta.appCode
meta.title
```

---

## 22. 页面开发规范

列表页必须包含：

```text
查询表单
数据表格
分页
新增按钮
行操作按钮
```

表单页必须包含：

```text
新增模式
编辑模式
详情只读模式
```

危险操作必须二次确认：

```text
删除
冻结
解冻
注销
取消订阅
变更套餐
修改套餐功能
修改角色权限
修改数据权限
```

---

## 23. SaaS Admin 模块目录

```text
apps/saas-admin/src/modules
├── tenant
├── app
├── feature
├── plan
├── subscription
├── user
├── tenant-user
├── session
├── org
├── position
├── role
├── role-template
├── resource
├── role-resource
├── role-assignment
├── resource-api-mapping
├── data-scope
└── audit
```

---

## 24. 首批开发优先级

### P0：工程基础

```text
Monorepo
Shell
Request
Auth
Permission
Dict
UI
Types
```

### P1：登录与租户

```text
登录
租户选择
工作台
当前租户上下文
当前租户可访问 App
当前租户可访问 Feature
```

### P2：SaaS 租户与计费域

```text
租户管理
应用管理
功能管理
套餐管理
订阅管理
```

### P3：权限域

```text
角色管理
权限资源管理
角色资源授权
用户 / 组织 / 岗位授权
按钮与 API 绑定
数据权限配置
```

### P4：审计域

```text
登录审计
操作审计
权限变更审计
数据导出审计
```

---

## 25. 禁止事项

禁止业务应用之间直接依赖：

```text
apps/yms import apps/wms
apps/tms import apps/yms
```

禁止页面硬编码权限：

```ts
if (role === 'admin') {}
```

禁止页面硬编码字典：

```ts
const statusMap = {}
```

禁止绕过统一请求包：

```ts
axios.get(...)
```

禁止在第一阶段引入：

```text
微前端
在线支付
复杂计费
License
外部身份源
MFA
字段级动态权限
```

---

## 26. 部署说明

初期可统一部署：

```text
/              shell
/saas-admin    SaaS 管理端
/wms           WMS
/yms           YMS
/tms           TMS
/oms           OMS
/crm           CRM
```

中后期可独立构建、独立部署各应用。

---

## 27. 最终交付检查清单

```text
[ ] pnpm workspace 可运行
[ ] turbo 可执行 build/dev/lint
[ ] shell 可启动
[ ] saas-admin 可启动
[ ] request 包可统一请求
[ ] auth 包可维护登录态
[ ] permission 包可控制按钮和路由
[ ] dict 包可加载字典
[ ] ui 包包含 AuthButton / DictSelect / DictTag
[ ] 登录页完成
[ ] 租户选择页完成
[ ] 工作台完成
[ ] 租户管理页面完成
[ ] 应用管理页面完成
[ ] 功能管理页面完成
[ ] 套餐管理页面完成
[ ] 订阅管理页面完成
```
