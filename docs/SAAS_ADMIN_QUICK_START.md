# SaaS Admin 快速启动指南

## 环境要求

- Node.js >= 18
- pnpm >= 8
- 现代浏览器（Chrome、Edge、Firefox 等）

## 快速开始

### 1. 安装依赖

```bash
cd E:\project\SS.Express.Web
pnpm install
```

### 2. 启动开发服务器

```bash
# 启动 SaaS Admin
pnpm dev:saas

# 或者启动所有应用
pnpm dev
```

访问：http://localhost:3001

### 3. 登录系统

由于后端 API 未实现，当前使用模拟登录：

- 用户名：随意输入
- 密码：随意输入
- 点击登录即可进入系统

## 已实现功能导航

### 租户与计费域

1. **租户管理** (`/tenant`)
   - 租户列表查询
   - 新增租户（点击"新增租户"按钮）
   - 编辑租户（点击列表中的"编辑"）
   - 冻结/解冻/删除租户

2. **应用管理** (`/app`)
   - 应用列表查询
   - 新增应用
   - 启用/停用/删除应用

3. **功能管理** (`/feature`)
   - 选择应用
   - 查看功能树
   - 新增根功能/子功能
   - 编辑/启用/停用/删除功能

4. **套餐管理** (`/plan`)
   - 套餐列表查询
   - 新增套餐
   - 功能配置
   - 启用/停用/删除套餐

5. **订阅管理** (`/subscription`)
   - 订阅列表查询
   - 新增订阅
   - 续费/取消订阅

### 组织与身份域

6. **用户管理** (`/user`)
   - 用户列表查询
   - 新增用户
   - 禁用/删除用户

7. **其他模块** - 占位页面，显示"功能开发中..."
   - 租户用户管理 (`/tenant-user`)
   - 会话管理 (`/session`)
   - 组织架构管理 (`/org`)
   - 岗位管理 (`/position`)
   - 角色管理 (`/role`)
   - 等等...

## 功能演示流程

### 场景 1：创建租户

1. 访问 http://localhost:3001/tenant
2. 点击"新增租户"按钮
3. 填写表单：
   - 租户编码：TEST001（必填）
   - 租户名称：测试租户（必填）
   - 租户类型：企业版（必填）
   - 状态：试用（必填）
   - 时区：Asia/Shanghai（必填）
   - 语言：简体中文（必填）
   - 其他信息选填
4. 点击"创建"按钮
5. 返回列表页（注意：API 未实现，会报错）

### 场景 2：管理应用功能

1. 访问 http://localhost:3001/feature
2. 从下拉框选择一个应用（需要先在应用管理中创建）
3. 查看该应用的功能树
4. 点击"新增根功能"或某个功能的"新增子功能"
5. 填写功能信息：
   - 功能编码
   - 功能名称
   - 功能类型（模块/功能点）
   - 路由路径
   - 权限标识
   - 是否可见
   - 状态
6. 树形表格会展示层级关系

### 场景 3：配置套餐

1. 访问 http://localhost:3001/plan
2. 点击"新增套餐"
3. 填写套餐信息
4. 点击某个套餐的"功能配置"
5. 选择该套餐包含的功能（树形选择器）

## 组件使用示例

### PageContainer

```vue
<page-container 
  title="页面标题" 
  description="页面描述"
  :show-header="true"
  :show-search="true"
  :show-footer="true"
>
  <template #search>
    <!-- 搜索表单 -->
  </template>
  
  <!-- 主要内容 -->
  
  <template #footer>
    <!-- 底部操作按钮 -->
  </template>
</page-container>
```

### SearchForm

```vue
<search-form
  :form-items="searchFormItems"
  v-model="searchParams"
  @search="handleSearch"
  @reset="handleReset"
>
  <template #extra>
    <button class="btn btn-primary">额外按钮</button>
  </template>
</search-form>
```

### DataTable

```vue
<data-table
  :columns="columns"
  :data="dataList"
  :actions="actions"
  :pagination="true"
  :total="total"
  :page-num="pageNum"
  :page-size="pageSize"
  @page-change="handlePageChange"
/>
```

### TreeTable

```vue
<tree-table
  :columns="columns"
  :data="treeData"
  :actions="actions"
  :default-expand-all="true"
/>
```

## 开发提示

### 1. 热更新

修改代码后，浏览器会自动刷新。如果没有刷新，手动刷新浏览器即可。

### 2. API 错误

由于后端未实现，所有 API 调用都会失败。查看控制台可以看到错误信息。

### 3. 模拟数据

如需测试完整流程，可以：
- 修改 API 文件，返回模拟数据
- 或者使用 Mock.js 等工具

### 4. 调试

打开浏览器开发者工具（F12）：
- Console：查看日志和错误
- Network：查看 API 请求
- Vue DevTools：查看组件状态

## 常见问题

### Q1: 端口被占用

```bash
Error: listen EADDRINUSE: address already in use :::3001
```

**解决方案：**
- 关闭占用 3001 端口的程序
- 或修改 `apps/saas-admin/vite.config.ts` 中的端口号

### Q2: 依赖安装失败

```bash
pnpm install 报错
```

**解决方案：**
- 确保 Node.js 版本 >= 18
- 确保 pnpm 版本 >= 8
- 清除缓存：`pnpm store prune`
- 重新安装：`rm -rf node_modules && pnpm install`

### Q3: TypeScript 报错

**解决方案：**
- 重启 VS Code
- 运行类型检查：`pnpm typecheck`

### Q4: 登录后白屏

**原因：** 路由配置或组件导入错误

**解决方案：**
- 查看控制台错误信息
- 检查路由配置
- 确保组件路径正确

## 项目结构说明

```
apps/saas-admin/src/
├── api/           # API 接口（25+ 个模块）
├── components/    # 通用组件（5 个）
├── layouts/       # 布局组件
├── stores/        # 状态管理
├── types/         # 类型定义
├── views/         # 视图页面（15+ 个）
├── router/        # 路由配置
└── main.ts        # 应用入口
```

## 下一步

1. **对接后端 API**
   - 配置 API 基础 URL
   - 实现真实登录
   - 处理 API 响应

2. **完善用户体验**
   - 添加 Loading 指示器
   - 添加 Toast 消息提示
   - 优化表单验证

3. **继续开发**
   - 完成组织与身份域
   - 实现权限控制域
   - 实现审计域

## 技术支持

- 项目文档：`docs/SAAS_ADMIN_DEVELOPMENT_REPORT.md`
- 进度更新：`docs/SAAS_ADMIN_PROGRESS_UPDATE.md`
- PRD 文档：`docs/saas-prd-v1.1-revised.md`

## 相关命令

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

# 清理
pnpm clean             # 清理所有应用
```

## 祝你开发愉快！🚀
