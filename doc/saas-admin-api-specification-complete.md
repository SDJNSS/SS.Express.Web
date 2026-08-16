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
- [13. 会话管理](#13-会话管理)
- [14. 审计日志](#14-审计日志)

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

### 租户隔离说明
**重要**: 所有包含 `tenant_id` 的表和接口，都必须同时包含 `tenant_code` 字段。
- 请求时：如果需要tenant_id，则同时需要tenant_code
- 响应时：返回的数据对象中包含tenant_id的，也必须包含tenant_code

---

## 1. 租户管理

### 1.1 创建租户
**接口地址**: `POST /api/saas/v1/tenants`

**请求参数**:
```json
{
  "tenantCode": "string",       // 租户编码，必填，唯一
  "tenantName": "string",       // 租户名称，必填
  "tenantType": "string",       // 租户类型：enterprise/personal/trial，默认enterprise
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
  "tenantType": "enterprise",
  "status": "active",
  "companyName": "示例公司",
  "contactName": "张三",
  "contactPhone": "13800138000",
  "contactEmail": "contact@example.com",
