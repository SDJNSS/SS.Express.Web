# SaaS Admin 管理后台

> 基于 Vue 3 + TypeScript + Vite 的企业级 SaaS 管理后台系统

## 项目简介

SaaS Admin 是一个功能完整的 SaaS 管理后台前端项目，包含租户管理、用户管理、权限管理、审计日志等核心功能模块。严格按照 PRD 文档实现，提供企业级的代码质量和用户体验。

## 功能模块

### 租户与计费域
- ✅ 租户管理
- ✅ 应用管理
- ✅ 功能管理（树形）
- ✅ 套餐管理
- ✅ 订阅管理

### 组织与身份域
- ✅ 用户管理
- ✅ 租户用户管理
- ✅ 会话管理
- ✅ 组织架构管理（树形）
- ✅ 岗位管理

### 权限控制域
- ✅ 角色管理
- ✅ 角色模板管理
- ✅ 权限资源管理（树形）
- ✅ 数据权限配置

### 审计域
- ✅ 登录审计
- ✅ 操作审计
- ✅ 权限变更审计
- ✅ 数据导出审计

## 技术栈

- **框架**：Vue 3 (Composition API + script setup)
- **语言**：TypeScript 5.x
- **构建工具**：Vite 5.x
- **状态管理**：Pinia
- **路由**：Vue Router 4.x
- **HTTP 客户端**：Axios
- **代码规范**：ESLint + Prettier

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
cd E:\project\SS.Express.Web
pnpm install
```

### 启动开发服务器

```bash
pnpm dev:saas
```

访问：http://localhost:3001

### 构建生产版本

```bash
pnpm build:saas
```

## 项目结构

```
apps/saas-admin/
├── src/
│   ├── api/              # API 接口（25+ 模块）
│   │   ├── saas/        # SaaS 域
│   │   ├── iam/         # IAM 域
│   │   └── audit/       # 审计域
│   ├── components/       # 通用组件
│   │   └── common/
│   │       ├── PageContainer.vue
│   │       ├── SearchForm.vue
│   │       ├── DataTable.vue
│   │       ├── TreeTable.vue
│   │       └── ConfirmModal.vue
│   ├── layouts/          # 布局组件
│   ├── stores/           # 状态管理
│   ├── types/            # 类型定义
│   ├── views/            # 页面视图
│   ├── router/           # 路由配置
│   └── main.ts           # 入口文件
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 核心组件

### PageContainer

统一的页面容器，提供标题、搜索区、内容区、底部操作区。

```vue
<page-container 
  title="页面标题" 
  :show-header="true"
  :show-search="true"
>
  <template #search>
    <search-form />
  </template>
  <!-- 内容 -->
</page-container>
```

### DataTable

功能完整的数据表格，支持分页、排序、操作按钮。

```vue
<data-table
  :columns="columns"
  :data="list"
  :actions="actions"
  :pagination="true"
  :total="total"
  @page-change="handlePageChange"
/>
```

### TreeTable

树形表格组件，支持层级展示、展开/收起。

```vue
<tree-table
  :columns="columns"
  :data="treeData"
  :actions="actions"
  :default-expand-all="true"
/>
```

## 开发规范

### 命名约定

- 组件：PascalCase (PageContainer.vue)
- 页面：Index.vue 或 Form.vue
- 类型文件：kebab-case (tenant-user.ts)
- API 文件：kebab-case (tenant-user.ts)

### 代码组织

```typescript
// 1. 导入
import { ref, reactive } from 'vue';

// 2. Router/Store
const router = useRouter();
const authStore = useAuthStore();

// 3. 配置数据
const searchFormItems = [];
const columns = [];
const actions = [];

// 4. 响应式变量
const list = ref([]);
const loading = ref(false);

// 5. 方法
const loadList = async () => {};
const handleCreate = () => {};

// 6. 生命周期
onMounted(() => {});
```

## 文档

- [开发报告](../../docs/SAAS_ADMIN_DEVELOPMENT_REPORT.md)
- [进度更新](../../docs/SAAS_ADMIN_PROGRESS_UPDATE.md)
- [快速启动](../../docs/SAAS_ADMIN_QUICK_START.md)
- [最终报告](../../docs/SAAS_ADMIN_FINAL_REPORT.md)
- [PRD 文档](../../docs/saas-prd-v1.1-revised.md)

## 功能特色

### 1. 完全类型安全

所有 API、组件、数据都有完整的 TypeScript 类型定义。

### 2. 组件化设计

高度可复用的组件库，统一的交互体验。

### 3. PRD 完全对齐

严格按照 PRD 文档实现，字段命名、API 规范完全一致。

### 4. 易于扩展

模块化架构，新增功能只需复用现有模式。

### 5. 代码规范

统一的代码风格、清晰的目录结构、完善的注释。

## 开发指南

### 新增模块

1. 在 `types/` 中定义类型
2. 在 `api/` 中创建 API 接口
3. 在 `views/` 中创建页面组件
4. 在 `router/` 中添加路由配置

### 新增列表页

复用现有模式，参考 `views/tenant/Index.vue`：

1. 定义 searchFormItems（搜索表单配置）
2. 定义 columns（表格列配置）
3. 定义 actions（操作按钮配置）
4. 实现加载数据方法
5. 实现增删改查操作

### 新增表单页

参考 `views/tenant/Form.vue`：

1. 定义 formData（表单数据）
2. 实现表单验证
3. 实现提交/取消操作
4. 处理创建/编辑模式

## 常用命令

```bash
# 开发
pnpm dev:saas           # 启动 SaaS Admin
pnpm dev               # 启动所有应用

# 构建
pnpm build:saas        # 构建 SaaS Admin
pnpm build             # 构建所有应用

# 代码检查
pnpm lint              # ESLint 检查
pnpm format            # Prettier 格式化
pnpm typecheck         # TypeScript 类型检查
```

## 待完善功能

- [ ] 补充各模块的创建/编辑表单页
- [ ] 对接后端 API
- [ ] 实现真实登录流程
- [ ] 添加 Loading 和 Toast 组件
- [ ] 引入 UI 库（Element Plus / Ant Design Vue）
- [ ] 优化表单验证
- [ ] 响应式设计优化

## 浏览器支持

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## License

MIT

## 联系方式

如有问题，请参考项目文档或提交 Issue。
