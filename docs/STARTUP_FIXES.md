# 启动错误修复记录

## 🐛 遇到的问题

### 错误 1：Request 包导出问题
```
Error: Failed to scan for dependencies from entries:
X [ERROR] No matching export in "../../packages/request/src/index.ts" for import "request"
```

### 错误 2：相对路径导入失败
```
Failed to resolve import "../../stores/auth" from "src/layouts/MainLayout.vue". Does the file exist?
```

## ✅ 已修复的问题

### 1. Request 包缺少默认导出

**问题**：`packages/request/src/index.ts` 只导出了 `RequestClient` 类和 `createRequestClient` 工厂函数，但没有导出 `request` 实例。

**修复**：在 `packages/request/src/index.ts` 中添加了默认实例导出：

```typescript
// 默认实例（使用环境变量或默认值）
const defaultBaseURL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL || '/api'
export const request = new RequestClient(defaultBaseURL)
```

### 2. API 文件导入路径错误

**问题**：所有 API 文件中的类型导入路径为 `from '../types'` 或 `from '../../types'`，但这些路径不存在。

**修复**：批量修改了 20+ 个文件的导入路径为 `from '@/types'`。

**影响文件**：
- `apps/saas-admin/src/api/saas/*.ts`（5个文件）
- `apps/saas-admin/src/api/iam/*.ts`（11个文件）
- `apps/saas-admin/src/api/audit/*.ts`（4个文件）

### 3. 缺少环境变量配置

**问题**：没有 `.env` 文件配置 API 基础 URL。

**修复**：创建了两个环境配置文件：

**`.env`**（基础配置）：
```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_APP_TITLE=SaaS Admin
VITE_APP_CODE=saas-admin
```

**`.env.development`**（开发环境）：
```env
VITE_API_BASE_URL=/mock-api
VITE_DEBUG=true
```

### 4. 优化开发服务器配置

**问题**：端口配置为 3006，与文档不一致。

**修复**：更新 `vite.config.ts`：
```typescript
server: {
  port: 3001,      // 改为 3001
  open: true,      // 自动打开浏览器
  host: '0.0.0.0'  // 允许外部访问
}
```

### 5. 完善 main.ts 初始化

**问题**：Request 客户端没有在应用启动时正确配置。

**修复**：在 `apps/saas-admin/src/main.ts` 中添加了 request 配置：

```typescript
import { request } from '@logistics/request';
import { useAuthStore } from '@/stores/auth';

// ... pinia 和 router 初始化 ...

// 配置请求客户端
const authStore = useAuthStore();
authStore.restoreFromStorage();

request.setTokenGetter(() => authStore.token);
request.setTenantIdGetter(() => authStore.tenantId);
request.onUnauthorizedCallback(() => {
  authStore.logout();
  router.push('/login');
});
```

### 6. 统一使用路径别名 @ 

**问题**：项目中大量使用相对路径导入（`../../`），导致路径解析失败。

**修复**：批量替换所有相对路径为 `@` 别名：

```typescript
// 修复前
import { useAuthStore } from '../../stores/auth';
import PageContainer from '../../components/common/PageContainer.vue';
import { getAppList } from '../../api/saas/app';

// 修复后  
import { useAuthStore } from '@/stores/auth';
import PageContainer from '@/components/common/PageContainer.vue';
import { getAppList } from '@/api/saas/app';
```

**影响范围**：
- 所有 `src/views/**/*.vue` 文件（50+ 处导入）
- `src/layouts/MainLayout.vue`
- `src/router/index.ts`
- `src/main.ts`

## 🚀 修复后的启动流程

### 1. 安装依赖（首次运行）
```bash
cd E:\project\SS.Express.Web
pnpm install
```

### 2. 启动开发服务器

**方法 1：使用 VSCode**
- 按 `F5`
- 选择 "🚀 启动 SaaS Admin (开发模式)"

**方法 2：使用命令行**
```bash
pnpm dev:saas
```

### 3. 访问应用
- 浏览器会自动打开
- 或手动访问：http://localhost:3001

## 📝 相关文件

### 修改的文件
1. `packages/request/src/index.ts` - 添加 request 默认导出
2. `apps/saas-admin/vite.config.ts` - 更新端口配置
3. `apps/saas-admin/src/main.ts` - 添加 request 初始化
4. `apps/saas-admin/src/api/**/*.ts` - 修复导入路径（20+ 文件）
5. `apps/saas-admin/src/views/**/*.vue` - 统一使用 @ 别名（50+ 处）
6. `apps/saas-admin/src/layouts/MainLayout.vue` - 修复导入路径
7. `apps/saas-admin/src/router/index.ts` - 修复导入路径

### 新建的文件
1. `apps/saas-admin/.env` - 环境变量基础配置
2. `apps/saas-admin/.env.development` - 开发环境配置

## ✨ 现在可以正常启动了！

所有依赖问题已解决，项目应该可以正常启动和运行。

如果还有其他问题，请检查：
1. Node.js 版本 >= 18
2. pnpm 版本 >= 8
3. 是否有端口冲突
4. 依赖是否完整安装
