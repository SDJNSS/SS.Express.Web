# SaaS Admin 后端接口规范文档

## 目录
- [1. 租户管理](#1-租户管理)
- [2. 应用管理](#2-应用管理)
- [3. 功能管理](#3-功能管理)
- [4. 套餐管理](#4-套餐管理)
- [5. 订阅管理](#5-订阅管理)
- [6. 用户管理](#6-用户管理)
- [7. 租户用户管理](#7-租户用户管理)
- [8. 组织架构管理](#8-组织架构管理)
- [9. 岗位管理](#9-岗位管理)
- [10. 角色管理](#10-角色管理)
- [11. 资源管理](#11-资源管理)
- [12. 数据权限管理](#12-数据权限管理)

---

## 通用说明

### 响应格式
所有接口均返回统一的响应格式：
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### 分页响应格式
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [],
    "total": 0,
    "pageNum": 1,
    "pageSize": 10
  }
}
```

### 分页请求参数
- `pageNum`: 页码，默认1
- `pageSize`: 每页条数，默认10

---

## 1. 租户管理

### 1.1 创建租户
**接口地址**: `POST /api/saas/v1/tenants`

**请求参数**:
```json
{
  "tenantCode": "string",       // 租户编码，必填，唯一
  "tenantName": "string",       // 租户名称，必填
  "tenantType": "string",       // 租户类型：enterprise/个人/试用，默认enterprise
  "companyName": "string",      // 企业名称
  "contactName": "string",      // 联系人姓名
  "contactPhone": "string",     // 联系人电话
  "contactEmail": "string",     // 联系人邮箱
  "domain": "string",           // 域名
  "subdomain": "string",        // 子域名
  "logoUrl": "string",          // Logo URL
  "timezone": "string",         // 时区，默认Asia/Shanghai
  "language": "string",         // 语言，默认zh-CN
  "isolationMode": "string",    // 隔离模式：shared_db/separate_schema/separate_db，默认shared_db
  "dbKey": "string",            // 数据库key，默认default
  "schemaName": "string",       // 数据库schema，默认public
  "remarks": "string"           // 备注
}
```

**响应数据**:
```json
{
  "id": 1,
  "tenantCode": "TENANT001",
  "tenantName": "示例租户",
  // ... 其他字段
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 1.2 分页查询租户列表
**接口地址**: `GET /api/saas/v1/tenants`

**请求参数**:
- `tenantCode`: 租户编码（模糊查询）
- `tenantName`: 租户名称（模糊查询）
- `tenantType`: 租户类型
- `status`: 状态（trial/active/frozen/expired/cancelled）
- `pageNum`: 页码
- `pageSize`: 每页条数

**响应数据**: 分页格式

### 1.3 获取租户详情
**接口地址**: `GET /api/saas/v1/tenants/{id}`

**响应数据**: 完整的租户信息对象

### 1.4 修改租户
**接口地址**: `PUT /api/saas/v1/tenants/{id}`

**请求参数**: 同创建接口（除tenantCode不可修改）

### 1.5 冻结租户
**接口地址**: `POST /api/saas/v1/tenants/{id}/freeze`

**请求参数**:
```json
{
  "reason": "string"  // 冻结原因
}
```

### 1.6 解冻租户
**接口地址**: `POST /api/saas/v1/tenants/{id}/unfreeze`

**请求参数**:
```json
{
  "reason": "string"  // 解冻原因
}
```

### 1.7 注销租户
**接口地址**: `POST /api/saas/v1/tenants/{id}/cancel`

**请求参数**:
```json
{
  "reason": "string"  // 注销原因
}
```

### 1.8 删除租户
**接口地址**: `DELETE /api/saas/v1/tenants/{id}`

---

## 2. 应用管理

### 2.1 创建应用
**接口地址**: `POST /api/saas/v1/apps`

**请求参数**:
```json
{
  "appCode": "string",          // 应用编码，必填，唯一，大写字母数字下划线
  "appName": "string",          // 应用名称，必填
  "appType": "string",          // 应用类型：web/mobile/api，必填
  "appVersion": "string",       // 应用版本
  "icon": "string",             // 图标URL或图标代码
  "routePath": "string",        // 路由路径
  "sortOrder": 0,               // 排序号，数字越小越靠前
  "status": "string",           // 状态：active/inactive，必填
  "remarks": "string"           // 备注
}
```

### 2.2 分页查询应用列表
**接口地址**: `GET /api/saas/v1/apps`

**请求参数**:
