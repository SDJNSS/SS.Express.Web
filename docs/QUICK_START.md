# 快速开始

## 1. 环境准备

确保已安装:

- Node.js >= 18
- pnpm >= 8

检查版本:

```bash
node -v
pnpm -v
```

## 2. 安装依赖

```bash
pnpm install
```

## 3. 启动开发服务器

启动 Shell (平台主壳):

```bash
pnpm dev:shell
```

访问: http://localhost:3000

启动 SaaS Admin:

```bash
pnpm dev:saas
```

启动所有应用:

```bash
pnpm dev
```

## 4. 项目结构说明

```text
logistics-platform-web
├── apps/                 # 应用目录
│   ├── shell/           # 平台主壳 (端口: 3000)
│   ├── saas-admin/      # SaaS 管理后台 (端口: 3001)
│   ├── wms/             # 仓储管理系统 (端口: 3002)
│   ├── yms/             # 园区管理系统 (端口: 3003)
│   ├── tms/             # 运输管理系统 (端口: 3004)
│   ├── oms/             # 订单管理系统 (端口: 3005)
│   └── crm/             # 客户管理系统 (端口: 3006)
│
├── packages/            # 共享包目录
│   ├── ui/             # UI 组件 (@logistics/ui)
│   ├── request/        # 请求封装 (@logistics/request)
│   ├── auth/           # 认证管理 (@logistics/auth)
│   ├── permission/     # 权限控制 (@logistics/permission)
│   ├── dict/           # 字典管理 (@logistics/dict)
│   ├── types/          # 类型定义 (@logistics/types)
│   ├── utils/          # 工具函数 (@logistics/utils)
│   └── config/         # 配置管理 (@logistics/config)
│
├── package.json         # 根配置
├── pnpm-workspace.yaml  # pnpm workspace 配置
├── turbo.json          # Turborepo 配置
├── tsconfig.base.json  # TypeScript 基础配置
├── eslint.config.js    # ESLint 配置
└── prettier.config.js  # Prettier 配置
```

## 5. 共享包使用

在应用中使用共享包:

```typescript
// 使用认证
import { useAuthStore } from '@logistics/auth'

// 使用权限
import { usePermissionStore } from '@logistics/permission'

// 使用字典
import { useDict } from '@logistics/dict'

// 使用请求
import { createRequestClient } from '@logistics/request'

// 使用 UI 组件
import { AuthButton, DictSelect, DictTag } from '@logistics/ui'

// 使用工具函数
import { formatDate, debounce } from '@logistics/utils'

// 使用类型
import type { ApiResponse, PageResult } from '@logistics/types'
```

## 6. 构建项目

构建所有应用:

```bash
pnpm build
```

构建指定应用:

```bash
pnpm build:shell
pnpm build:saas
```

## 7. 代码规范

运行 ESLint:

```bash
pnpm lint
```

格式化代码:

```bash
pnpm format
```

类型检查:

```bash
pnpm typecheck
```

## 8. 开发规范

详见 [prd.md](../prd.md)

## 9. 下一步

### Shell 应用

Shell 应用提供了基础的:
- 登录页面 (/login)
- 租户选择 (/tenant-select)
- 工作台 (/workbench)
- 权限拒绝页 (/forbidden)

### SaaS Admin 应用

需要开发的 21 个模块:
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
15. 用户/组织/岗位授权
16. 按钮与 API 绑定
17. 数据权限配置
18. 登录审计
19. 操作审计
20. 权限变更审计
21. 数据导出审计

### 其他应用

WMS、YMS、TMS、OMS、CRM 的业务模块需要根据具体需求开发。
