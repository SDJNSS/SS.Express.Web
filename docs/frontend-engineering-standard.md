# 前端技术开发规范

> 适用范围：企业物流数字化系统、TMS、VMS、FMS、WMS、后台运营管理平台。  
> 目标：建立统一、可复用、可持续扩展、适合 Codex / AI Agent 高效开发的前端工程体系。  
> 本规范为强制执行标准。Codex 在新增、修改、重构前端代码时，必须遵守本规范。

---

# 1. Technology Stack

项目统一采用以下技术栈：

```text
Vue 3
+
TypeScript
+
Vite
+
Element Plus
+
Pinia
+
Vue Router
+
Axios
+
SCSS
+
CSS Variables / Design Token
+
Iconify
+
ECharts
+
dayjs
+
ESLint
+
Prettier
+
pnpm
```

## 1.1 基础原则

禁止 Codex 根据单个页面或功能自行：

- 更换前端框架。
- 引入新的 UI Framework。
- 引入新的状态管理库。
- 引入新的 HTTP Client。
- 引入新的日期处理库。
- 引入第二套图标体系。
- 引入重复功能依赖。
- 用自定义实现替代现有成熟基础设施。

新增第三方依赖前必须确认：

1. 当前项目不存在同类能力。
2. Element Plus 无法满足需求。
3. Shared Component 无法满足需求。
4. Existing Utility / Composable 无法满足需求。
5. 新依赖具有明确的长期复用价值。

---

# 2. Design System

## 2.1 核心原则

所有页面必须使用统一视觉体系。

Codex 不得自行定义：

- 页面颜色。
- 字号体系。
- 间距体系。
- 圆角体系。
- 阴影体系。
- 页面 Padding。
- 卡片样式。
- 表单间距。
- 表格密度。
- 状态颜色。

所有基础视觉参数必须来自统一 Design Token。

---

# 2.2 Design Token

统一维护：

```text
src/shared/styles/tokens.scss
```

至少包含：

```text
Color
Typography
Spacing
Radius
Shadow
Border
Size
ZIndex
```

页面和组件优先使用 CSS Variables。

例如：

```css
var(--color-primary)
var(--text-primary)
var(--text-secondary)
var(--background-page)
var(--background-card)
var(--border-default)
var(--spacing-md)
```

禁止业务页面大量直接使用：

```css
#409eff
#333333
17px
21px
29px
```

等 Magic Value。

---

# 2.3 Spacing

采用 4px 基础网格。

允许优先使用：

```text
4
8
12
16
20
24
32
40
48
```

统一建议：

```text
Page Padding: 12px
Card Padding: 12px
Section Gap: 8px
Form Gap: 8px
```

不得因为单个页面随意增加新的间距体系。

---

# 2.4 Typography

统一字号：

```text
12px   辅助信息 / 紧凑元数据
13px   默认正文
14px   强调内容 / 长文本正文
16px   Section Title
18px   Page Title
20px   Dashboard核心指标
```

默认正文：

```text
13px
```

---

# 2.5 Radius

统一：

```text
Small:   4px
Default: 6px
Large:   8px
```

企业后台禁止大量使用过大的圆角。

---

# 2.6 Color

必须使用语义颜色：

```text
Primary
Success
Warning
Danger
Info

Text Primary
Text Secondary
Text Disabled

Background Page
Background Card

Border Default
Border Light
```

禁止根据业务页面自行创建随机颜色。

状态颜色必须统一，例如：

```text
Success → 正常 / 完成
Warning → 待处理 / 即将到期
Danger  → 异常 / 失败 / 已过期
Info    → 中性状态
```

---

# 2.7 Theme

第一阶段统一：

```text
Light Mode Only
```

不实现 Dark Mode。

---

# 2.8 页面密度

统一采用：

```text
Compact Operations Density
```

主要适用于物流运营管理后台。

建议：

```text
Body Text:      13px
Control:        28px
Table Header:   34px
Table Row:      36px
Page Padding:   12px
Card Gap:       8px
Form Gap:       8px
```

高密度档位只压缩冗余留白；辅助文字不得低于 12px，紧凑次级操作不得低于 24px 点击高度，也不得删除焦点、完整值提示等可访问状态或形成第二套视觉体系。

---

# 2.9 页面基本结构

普通后台页面统一：

```text
AppPage
├── PageHeader
├── SearchPanel
├── Toolbar
├── MainContent
└── Pagination
```

不得由各业务模块自行重新设计页面基础布局。

---

# 2.10 AppShell Content Contract

生产页面统一由 `AppLayout` 装配一次 `AppShell`，路由页面只负责 `app-shell__content` 内的内容树。标准页面必须采用：

```text
AppPage
└── Registry PageTemplate
```

允许页面委托给同 Feature 的 Canonical Page View，或委托给静态审计器登记的全页组件；被委托组件必须自己持有 `AppPage` 内容边界。`NotFoundPage` 等特殊状态页可以不使用业务 PageTemplate，但仍必须使用 `AppPage`。

Feature 页面禁止：

```text
重复引用或渲染 AppShell
使用 100vw / 100vh / 100dvh 等视口单位固定页面
使用桌面视口级固定 width / min-width / height / min-height
依赖裁剪隐藏内容区溢出
```

页面根和 PageTemplate 必须保持 `width/max-width: 100%`、`min-width: 0`、`min-height: 0` 的可收缩链。普通 `ListPageTemplate` 默认使用 natural/page 策略，结果面随当前页行数与页大小自然增高，由 `AppPage` 独占页面纵向滚动；DataTable 只处理横向溢出。只有 Workspace、Drawer 或 Page Contract 明确的固定数据面板允许 contained 内部纵向滚动。其他长页面由 `AppPage` 或对应 Pattern 管理纵向滚动。`DetailPageTemplate` 默认使用 `scrollMode="page"`，由 `AppPage` 独占普通详情长内容的纵向滚动；只有含固定高度表格/标签页工作区的详情页可显式使用 `contained`。工作区默认使用 `WorkspacePageTemplate` 的 `contained` 模式；普通长内容可使用 `scrollMode="page"` 并由 `AppPage` 独占纵向滚动。超长树形工作区使用 `scrollMode="capped-page"`，默认最大为两个内容区高度，超出部分由树或数据面板内部滚动；三倍高度必须由 Page Contract 明确登记。

`pnpm standards:check` 负责静态约束，Playwright 必须在 `standards/registry.json` 的三个桌面视口检查：

```text
页面根完全位于 app-shell__content 内
document 与 app-shell__content 无横向溢出
app-shell__content 不产生竞争性纵向滚动
```

---

# 3. Component Library

组件体系统一分为四层：

```text
Element Plus
↓
Shared Components
↓
Business Components
↓
Feature Components
```

---

# 3.1 Element Plus

Element Plus 负责基础 UI 能力：

```text
Button
Input
Select
Checkbox
Radio
Form
Table
Dialog
Drawer
Tree
Tabs
DatePicker
TimePicker
Cascader
Tooltip
Popover
Pagination
```

禁止对 Element Plus 做无价值包装。

例如下面这种组件默认禁止：

```text
MyButton
MyInput
MySelect
```

如果只是修改名称或透传参数，不应创建新组件。

---

# 3.2 Shared Components

目录：

```text
src/shared/components/
```

用于跨业务模块复用的通用组件。

至少建立：

```text
AppPage
PageHeader
SearchPanel
DataTable
TableToolbar
Pagination
FormDialog
FormDrawer
DetailDrawer
ConfirmAction
EmptyState
LoadingState
FileUploader
ImageUploader
StatusTag
MoneyText
DateTimeText
```

Shared Component 不应包含具体业务语义。

---

# 3.3 Business Components

目录：

```text
src/shared/business-components/
```

用于具有明确业务含义、但可以跨 Feature 复用的组件。

物流系统典型组件：

```text
VehicleSelector
DriverSelector
CustomerSelector
CarrierSelector
OrderSelector
TripSelector
TerminalSelector
OrganizationSelector
UserSelector
AddressSelector
DocumentUploader
CertificateStatus
OrderStatus
TripStatus
TaskStatus
```

Business Component 可以：

- 调用业务 API。
- 包含固定业务规则。
- 包含数据转换。
- 包含统一查询条件。
- 包含统一业务展示逻辑。

---

# 3.4 Feature Components

目录：

```text
src/features/<feature>/components/
```

只服务于当前 Feature。

例如：

```text
src/features/vehicle/components/

VehicleSearchForm
VehicleForm
VehicleDetailPanel
VehicleCertificateTable
VehicleStatusPanel
```

Feature Component 默认不得被其他 Feature 直接引用。

---

# 3.5 组件升级规则

组件默认优先创建为：

```text
Feature Component
```

只有出现明确跨 Feature 复用需求时，再提升为：

```text
Business Component
```

或：

```text
Shared Component
```

禁止为了“以后可能复用”提前过度抽象。

---

# 4. Application Architecture

项目统一采用：

```text
Feature-Based Architecture
```

禁止使用大平层：

```text
views/
components/
api/
utils/
```

承载所有业务代码。

---

# 4.1 推荐目录

```text
src/

├── app/
│   ├── router/
│   ├── store/
│   ├── layouts/
│   └── providers/
│
├── shared/
│   ├── components/
│   ├── business-components/
│   ├── composables/
│   ├── utils/
│   ├── api/
│   ├── types/
│   ├── constants/
│   └── styles/
│
├── features/
│
│   ├── vehicle/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── composables/
│   │   ├── api/
│   │   ├── types/
│   │   ├── constants/
│   │   └── routes.ts
│   │
│   ├── driver/
│   ├── order/
│   ├── trip/
│   ├── customer/
│   └── training/
│
├── assets/
│
└── main.ts
```

---

# 4.2 Feature 边界

Feature 之间不得直接引用对方内部实现。

禁止：

```text
vehicle
↓
driver/components/DriverInternalForm.vue
```

正确方式：

```text
vehicle
↓
shared/business-components/DriverSelector
```

或者通过公开 API、公共类型、公共组件交互。

---

# 4.3 Page 职责

Page 只负责：

```text
页面布局
组件组合
页面级事件协调
路由参数
页面级权限
```

Page 不应承担：

- 大量业务逻辑。
- 复杂 API 处理。
- 大量数据转换。
- 大型表单逻辑。
- 大型表格逻辑。
- 复杂状态流转。

---

# 4.4 Component 职责

Component 主要负责：

```text
UI
Interaction
Presentation
```

复杂业务逻辑优先放入 Composable。

---

# 4.5 Composable

目录：

```text
composables/
```

负责：

```text
State
API Request
Pagination
Loading
Business Logic
Data Transform
Action Handling
```

例如：

```text
useVehicleList
useVehicleDetail
useVehicleForm
useVehiclePermission
```

---

# 4.6 API

所有业务 API 必须放置于：

```text
features/<feature>/api/
```

例如：

```text
src/features/vehicle/api/vehicleApi.ts
```

禁止在 `.vue` 文件中直接：

```ts
axios.get()
axios.post()
```

---

# 4.7 Shared API Client

统一：

```text
src/shared/api/httpClient.ts
```

集中处理：

```text
Base URL
Authorization
Timeout
Request Interceptor
Response Interceptor
Error Handling
Refresh Token
Request ID
```

运行时 Host、超时、凭据模式和成功码统一由 `src/shared/api/apiConfig.ts` 读取环境变量；根目录 `.env.example` 是变量模板。业务 Endpoint 常量保留在所属 Feature 的 `api/` 目录，并通过 `defineApiPath` / `resolveApiPath` 声明相对路径，禁止写入绝对 Host。

Feature 的 Page、Component 和 Composable 不得直接导入 Axios、Fetch 或 Shared HttpClient，只能调用本 Feature `api/` 暴露的函数。`httpClient.ts` 是唯一 Axios Instance，并提供统一响应解包、错误分类、Request ID、Authorization、401 会话失效和单飞刷新挂钩；实际刷新 Endpoint 与 Token 传输方式必须由 IAM API/安全契约定义。

---

# 4.8 状态管理

使用：

```text
Pinia
```

但禁止所有状态进入 Pinia。

## Local State

用于：

```text
输入框
Dialog状态
Drawer状态
当前选择
临时页面数据
```

## Feature Store

用于：

```text
Feature内多个页面共享状态
Feature级缓存
复杂跨页面状态
```

## Global Store

仅用于：

```text
Current User
Authentication
Permission
Application Settings
Global Dictionary
```

---

# 5. Page Specification

所有页面在开发前必须存在明确的页面需求和交互定义。

Codex 不得仅凭模糊自然语言直接开始页面开发。

---

# 5.1 Page Specification 结构

推荐：

```yaml
page:
  id:
  name:
  feature:
  type:

route:

permission:

layout:

search:

actions:

content:

interaction:

states:

validation:

exceptions:

acceptance:
```

---

# 5.2 标准 Page Type

优先使用：

```text
ListPage
DetailPage
FormPage
DashboardPage
WorkspacePage
WizardPage
SettingsPage
AuthPage
```

只有现有 Page Type 无法满足需求时，才允许增加新的类型。

`AuthPage` 只用于认证前路由，必须使用 Registry 登记的 `StandaloneAuthLayout + AuthPageTemplate`，不得显示登录后 `AppShell`，也不得套入 `AppPage`。

---

# 5.3 ListPage

统一：

```text
PageHeader
↓
SearchPanel
↓
Toolbar
↓
DataTable
↓
Pagination
```

详情优先使用：

```text
DetailDrawer
```

复杂详情才使用独立页面。

---

# 5.4 DetailPage

统一推荐：

```text
PageHeader
↓
Summary
↓
Tabs
    ├── BasicInfo
    ├── BusinessData
    ├── Documents
    └── History
```

---

# 5.5 Form

简单表单：

```text
Dialog
```

中型表单：

```text
Drawer
```

复杂表单：

```text
Independent Page
```

禁止把大型、多步骤、复杂业务表单强行塞入 Dialog。

---

# 5.6 DashboardPage

Dashboard 页面统一由：

```text
Metric Card
Chart
Table
Map
Status Panel
```

等标准组件组合。

图表统一使用：

```text
ECharts
```

禁止单个 Dashboard 自行引入其他图表库。

---

# 5.7 Page Specification 示例

```yaml
page:
  name: VehicleList
  feature: vehicle
  type: ListPage

permission:
  view: vehicle.read

search:
  fields:
    - plateNumber
    - vehicleType
    - status

actions:
  page:
    - create
    - export

  row:
    - detail
    - edit
    - disable

table:
  columns:
    - plateNumber
    - vehicleType
    - driver
    - status
    - updatedAt

detail:
  mode: drawer

pagination:
  enabled: true
```

---

# 5.8 Figma 使用规则

Figma 用于：

```text
视觉布局
视觉层级
关键交互
复杂页面原型
```

Figma 不负责定义完整业务逻辑。

业务逻辑必须由：

```text
PRD
+
Page Specification
```

确定。

---

# 5.9 Figma 标准模板

项目统一准备：

```text
App Layout

ListPage Template

DetailPage Template

Form Template

Dashboard Template

Workspace Template
```

普通 CRUD 页面无需重复制作完整高保真 Figma。

特殊业务页面再单独设计。

---

# 6. Coding Rules

# 6.1 开发前必须搜索现有代码

Codex 开发任何新功能前必须搜索：

```text
Existing Page
Existing Component
Existing Business Component
Existing Composable
Existing API
Existing Utility
Existing Type
Existing Constant
```

禁止在未检查现有实现前直接新建组件。

---

# 6.2 复用优先级

必须遵循：

```text
Search
↓
Reuse
↓
Extend
↓
Create
```

具体优先级：

```text
1. 当前 Feature 已有实现
2. Business Component
3. Shared Component
4. Element Plus
5. Existing Composable
6. Existing Utility
7. 新增实现
```

---

# 6.3 代码复用原则

核心原则：

```text
Reuse Existing
>
Extend Existing
>
Create New
```

如果现有能力可以通过少量扩展满足需求，禁止重新创建同类实现。

---

# 6.4 DRY 规则

相同业务逻辑出现：

```text
≥ 2 次
```

必须评估是否抽取。

明确存在跨页面复用价值时必须抽取。

但禁止为了消除少量简单代码重复进行过度封装。

---

# 6.5 封装判断

满足以下条件之一时，应评估抽取：

```text
相同UI出现 ≥ 2次

相同业务逻辑出现 ≥ 2次

存在独立业务语义

多个页面共享相同查询逻辑

多个页面共享相同API处理逻辑

表格区域逻辑复杂

表单区域逻辑复杂

代码可以独立测试

存在明确跨Feature复用价值
```

---

# 6.6 组件拆分

出现以下情况应拆分：

```text
组件超过约300行

存在多个明显独立UI区域

包含复杂表格

包含复杂表单

包含多个独立业务职责

包含大量可独立复用逻辑
```

目标：

```text
普通组件：
约 100~300 行
```

行数不是绝对标准。

优先保证：

```text
Single Responsibility
```

---

# 6.7 页面模板

项目必须提供：

```text
ListPage
DetailPage
FormDialog
FormDrawer
DashboardPage
WorkspacePage
WizardPage
```

Codex 创建标准页面时必须优先使用现有模板。

禁止标准 CRUD 页面从空白开始设计。

---

# 6.8 Reference Implementation

项目应保留可运行的标准参考页面：

```text
ReferenceListPage
ReferenceDetailPage
ReferenceFormPage
ReferenceDashboardPage
```

当文字规范存在歧义时：

```text
Reference Implementation
>
文字描述
```

Codex 优先参考已有高质量实现。

---

# 6.9 TypeScript

项目必须使用：

```text
TypeScript Strict
```

业务代码禁止无理由使用：

```ts
any
```

优先：

```ts
unknown
```

必须定义明确类型：

```text
API Request
API Response
Entity
Props
Emits
Form Model
Store
Query Model
Pagination
```

---

# 6.10 Magic Value

禁止：

```ts
if (status === 7)
```

应使用：

```ts
OrderStatus.Completed
```

禁止：

```ts
if (type === 'abc')
```

应使用：

```text
enum
constant
union type
```

---

# 6.11 Template 复杂逻辑

Vue Template 中不得存在复杂业务逻辑。

禁止：

```vue
{{ a && b && c ? x : y }}
```

复杂逻辑应进入：

```text
computed
utility
composable
adapter
```

---

# 6.12 API 数据转换

API 数据与 UI 模型存在明显差异时，必须建立统一转换逻辑。

禁止相同转换散落在多个页面。

可使用：

```text
adapter
mapper
utility
composable
```

---

# 6.13 命名规范

Vue Component：

```text
PascalCase
```

例如：

```text
VehicleSelector.vue
VehicleDetailDrawer.vue
```

Composable：

```text
useVehicleList.ts
useVehicleForm.ts
```

API：

```text
vehicleApi.ts
```

Type：

```text
Vehicle
VehicleDetail
VehicleListQuery
VehicleFormModel
```

Constants：

```text
vehicleConstants.ts
```

---

# 6.14 Import

统一配置 Alias：

```text
@/
@shared/
@features/
```

禁止大量：

```text
../../../../
```

---

# 6.15 注释

应注释：

```text
复杂业务规则
特殊兼容逻辑
复杂算法
非直观设计原因
```

禁止注释显而易见代码。

---

# 7. 基础页面组件规范

# 7.1 DataTable

统一使用：

```text
DataTable
```

DataTable 负责：

```text
Loading
Empty State
Pagination
Selection
Row Action
Column Alignment
Scroll
Height
Text truncation and full-value access
```

业务页面主要定义：

```text
columns
data
actions
```

标准文本列由 `DataTable` 委托 `TableCellText` 渲染：默认最多展示 20 个 Unicode 字素，超过后省略；逻辑超限或实际像素溢出时必须提供键盘可聚焦的完整值 tooltip。列定义仅在业务必须展示完整值时显式关闭该行为，使用自定义 Slot 的页面对其文本截断和完整值访问自行负责。直接使用 `el-table` 的存量复杂工作区也必须复用 `TableCellText`，不得另写不一致的字符截断算法。

---

# 7.2 SearchPanel

统一使用：

```text
SearchPanel
```

标准行为：

```text
高频字段默认显示
低频字段折叠
查询
重置
```

禁止每个页面自行设计不同的查询区域。

---

# 7.3 StatusTag

所有业务状态统一通过：

```text
StatusTag
```

或业务状态组件展示。

禁止各页面自行决定状态颜色。

---

# 7.4 Dialog / Drawer / Page

Dialog：

```text
确认
简单新增
简单编辑
少量字段
```

Drawer：

```text
详情
中型编辑
上下文查看
```

Page：

```text
复杂业务
大型表单
多Tab
复杂流程
工作台
```

---

# 8. Error / Loading / Empty

# 8.1 Error

错误统一区分：

```text
Validation Error
Business Error
Network Error
Permission Error
System Error
```

禁止最终代码只有：

```ts
console.log(error)
```

---

# 8.2 Loading

所有异步操作必须存在 Loading。

包括：

```text
Button Loading
Table Loading
Page Loading
```

必须防止重复提交。

---

# 8.3 Empty State

数据为空时统一使用：

```text
EmptyState
```

禁止出现无提示空白区域。

---

# 9. Permission

权限至少分为：

```text
Route Permission
Page Permission
Action Permission
```

例如：

```text
vehicle.read
vehicle.create
vehicle.update
vehicle.delete
vehicle.export
```

禁止页面大量出现：

```text
user.isAdmin
```

这类硬编码权限逻辑。

---

# 10. Icon

统一使用：

```text
Iconify
```

禁止：

- 页面自行引入 SVG 图标库。
- 多套 Icon Framework 混用。
- 同一业务操作使用不同图标。

---

# 11. Chart

统一：

```text
ECharts
```

公共图表配置应抽取，例如：

```text
chart theme
tooltip
legend
axis
grid
formatter
```

禁止每个页面重复维护完全相同的 ECharts 配置。

---

# 12. Date

统一：

```text
dayjs
```

所有：

```text
日期格式化
时间计算
日期范围
时区处理
```

优先通过统一 Date Utility 实现。

禁止引入其他日期库。

---

# 13. HTTP

统一：

```text
Axios
```

所有请求通过统一 HttpClient。

禁止组件直接创建新的 Axios Instance。

---

# 14. Package Manager

统一：

```text
pnpm
```

项目依赖管理统一使用：

```bash
pnpm install
pnpm add
pnpm remove
pnpm run
```

禁止混用：

```text
npm
yarn
```

禁止提交多个 Lock File。

项目只保留：

```text
pnpm-lock.yaml
```

---

# 15. Code Quality

必须启用：

```text
ESLint
Prettier
TypeScript Strict
```

提交前必须通过：

```text
Lint
TypeCheck
Build
```

---

# 16. Browser Test

Codex 完成前端开发后，不能只执行：

```text
Build
```

还必须启动实际页面并检查：

```text
功能是否正常
布局是否正常
页面是否报错
交互是否正常
数据是否展示正确
```

---

# 17. Visual Review

所有页面必须进行视觉检查。

检查：

```text
Alignment
Spacing
Typography
Overflow
Table Width
Form Alignment
Button Position
Empty State
Loading
Content Density
Visual Hierarchy
```

Coding 完成不代表前端任务完成。

---

# 18. Responsive

后台项目采用：

```text
Desktop First
```

目标：

```text
主要设计：1920 × 1080
标准验证：1366 × 768 / 1440 × 900 / 1920 × 1080
最低支持：1366 × 768
```

普通后台页面不要求完整 Mobile Responsive。

移动端 Driver App 应建立独立移动端工程和独立设计体系。

---

# 19. Testing

基础要求：

```text
ESLint
TypeCheck
Build
```

复杂业务逻辑可以使用：

```text
Vitest
```

关键业务流程可使用：

```text
Playwright
```

测试重点：

```text
复杂Composable
关键业务逻辑
权限
关键表单
关键操作流程
```

不要求为了覆盖率对所有简单展示组件建立大量测试。

---

# 20. Codex 标准开发流程

Codex 处理所有前端任务必须遵循：

```text
Read
↓
Search
↓
Reuse
↓
Extend
↓
Create
↓
Lint
↓
TypeCheck
↓
Build
↓
Browser Test
↓
Visual Review
```

具体流程：

```text
STEP 1
读取 AGENTS.md

STEP 2
读取 frontend-engineering-standard.md

STEP 3
读取项目背景

STEP 4
读取 Feature PRD

STEP 5
读取 Page Specification

STEP 6
搜索当前 Feature

STEP 7
搜索 Shared Components

STEP 8
搜索 Business Components

STEP 9
搜索 Existing Composables / API / Types

STEP 10
搜索 Reference Implementation

STEP 11
确定复用方案

STEP 12
确定新增和修改文件

STEP 13
Coding

STEP 14
Lint

STEP 15
TypeCheck

STEP 16
Build

STEP 17
启动项目

STEP 18
Browser Test

STEP 19
Visual Review

STEP 20
修正问题
```

---

# 21. Coding 前检查

开始新增代码前，Codex 必须确定：

```text
Existing Components
Existing Business Components
Existing APIs
Existing Composables
Existing Utilities
Existing Types
Existing Constants

Files To Modify
Files To Create

Reusable Logic
```

禁止未经搜索直接创建大量新文件。

---

# 22. 前端重构规则

现有旧项目不得直接复制后继续扩展。

重构顺序必须为：

```text
分析旧功能
↓
识别业务需求
↓
搭建新工程架构
↓
建立Design System
↓
建立Shared Components
↓
建立Business Components
↓
建立Page Templates
↓
建立Reference Pages
↓
逐Feature迁移
```

旧项目主要作为：

```text
业务逻辑参考
功能参考
接口参考
```

不得自动作为：

```text
新项目代码规范
```

---

# 23. 新项目第一阶段基础设施

批量开发业务模块前，必须先完成：

## Engineering

```text
Vue 3
TypeScript
Vite
Vue Router
Pinia
Axios
ESLint
Prettier
pnpm
```

## Design

```text
Design Token
Global Style
App Layout
Typography
Spacing
Color
Page Density
```

## Shared Components

```text
AppPage
PageHeader
SearchPanel
DataTable
TableToolbar
Pagination
FormDialog
FormDrawer
DetailDrawer
StatusTag
EmptyState
LoadingState
```

## Business Components

根据实际项目首先建立高频：

```text
VehicleSelector
DriverSelector
CustomerSelector
OrganizationSelector
UserSelector
AddressSelector
DocumentUploader
```

## Reference Pages

建立：

```text
ReferenceListPage
ReferenceDetailPage
ReferenceFormPage
ReferenceDashboardPage
```

完成以上基础设施后，再开始批量开发业务 Feature。

---

# 24. 禁止事项

Codex 禁止：

```text
自行引入新的UI Framework

自行更换技术栈

自行引入新的State Library

自行引入新的HTTP Client

自行引入新的日期库

自行引入第二套图标系统

自行创建重复组件

忽略现有Business Component

忽略现有Shared Component

页面直接调用Axios

页面承担大量Business Logic

Feature直接引用其他Feature内部组件

大量使用any

大量使用Magic Value

大量使用Inline Style

大量硬编码颜色

大量硬编码状态字符串

创建超大型Vue文件

为了少量重复进行过度抽象

未经搜索直接创建组件

标准页面从零开始设计

只Build不运行页面

不进行Browser Test

不进行Visual Review
```

---

# 25. 核心工程原则

## 25.1 一致性优先

```text
Consistency
>
Cleverness
```

一致性优先于炫技。

---

## 25.2 复用优先

```text
Reuse Existing
>
Extend Existing
>
Create New
```

---

## 25.3 组合优先

```text
Composition
>
Duplication
```

页面应通过已有组件组合完成，而不是复制代码。

---

## 25.4 简单优先

```text
Simple
>
Abstract
```

没有明确复用价值时，不进行过度设计。

---

## 25.5 Feature 边界优先

业务代码首先归属明确 Feature。

只有确认跨业务复用后，才提升到 Shared。

---

# 26. 最终技术基线

技术栈：

```text
Vue 3
+
TypeScript
+
Vite
+
Element Plus
+
Pinia
+
Vue Router
+
Axios
+
SCSS
+
CSS Variables / Design Token
+
Iconify
+
ECharts
+
dayjs
+
ESLint
+
Prettier
+
pnpm
```

工程架构：

```text
Feature-Based Architecture
```

组件体系：

```text
Element Plus
↓
Shared Components
↓
Business Components
↓
Feature Components
```

页面体系：

```text
Page Specification
+
Page Templates
+
Reference Implementation
```

开发体系：

```text
Search
↓
Reuse
↓
Extend
↓
Create
↓
Lint
↓
TypeCheck
↓
Build
↓
Browser Test
↓
Visual Review
```

最终目标：

```text
统一技术栈
+
统一Design System
+
统一Component Library
+
统一Application Architecture
+
统一Page Specification
+
统一Coding Rules
```

使 Codex 的主要工作集中在：

```text
理解业务
+
组合现有能力
+
实现业务逻辑
```

而不是反复进行：

```text
技术选型
UI设计
工程架构设计
组件重复设计
基础能力重复开发
```
