# SaaS Admin 后端接口规范文档

## 1. 通用说明

### 1.1 基础路径
所有接口统一前缀：`/api/saas/v1` 或 `/api/iam/v1`

### 1.2 通用响应格式

#### 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

#### 错误响应
```json
{
  "code": 1001,
  "message": "错误信息",
  "data": null
}
```

### 1.3 分页格式

#### 分页请求参数
```json
{
  "page": 1,
  "pageSize": 20,
  "sortBy": "created_at",
  "sortOrder": "desc"
}
```

#### 分页响应格式
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 1.4 租户信息说明
所有包含 `tenant_id` 的接口，请求和响应都必须同时包含 `tenant_code` 字段。

### 1.5 通用字段说明
- `id`: 主键ID (bigint)
- `created_at`: 创建时间 (timestamp)
- `updated_at`: 更新时间 (timestamp)
- `created_by`: 创建人 (varchar 50)
- `updated_by`: 更新人 (varchar 50)
- `is_del`: 逻辑删除标识 (boolean, false=未删除, true=已删除)
- `remarks`: 备注 (text)

---

## 2. 租户管理 (saas_tenant)

### 2.1 创建租户
**接口路径**: `POST /api/saas/v1/tenants`

**请求参数**:
```json
{
  "tenant_code": "string(50)",        // 必填，租户编码，唯一
  "tenant_name": "string(100)",       // 必填，租户名称
  "tenant_type": "string(50)",        // 必填，租户类型 (enterprise=企业, individual=个人, trial=试用)
  "status": "string(50)",             // 选填，状态 (active=正常, frozen=冻结, cancelled=注销)，默认 active
  "company_name": "string(200)",      // 选填，公司名称
  "contact_name": "string(100)",      // 选填，联系人姓名
  "contact_phone": "string(50)",      // 选填，联系人电话
  "contact_email": "string(100)",     // 选填，联系人邮箱
  "domain": "string(255)",            // 选填，自定义域名
  "subdomain": "string(100)",         // 选填，子域名
  "logo_url": "string(500)",          // 选填，Logo URL
  "timezone": "string(50)",           // 选填，时区，默认 Asia/Shanghai
  "language": "string(20)",           // 选填，语言，默认 zh-CN
  "isolation_mode": "string(50)",     // 选填，隔离模式 (shared_db=共享数据库, independent_db=独立数据库, schema=独立Schema)，默认 shared_db
  "db_key": "string(100)",            // 选填，数据库连接键，默认 default
  "schema_name": "string(100)",       // 选填，Schema名称，默认 public
  "remarks": "text"                   // 选填，备注
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "tenant_code": "T001",
    "tenant_name": "示例企业",
    "tenant_type": "enterprise",
    "status": "active",
    "company_name": "示例科技有限公司",
    "contact_name": "张三",
    "contact_phone": "13800138000",
    "contact_email": "zhangsan@example.com",
    "domain": "",
    "subdomain": "t001",
    "logo_url": "",
    "timezone": "Asia/Shanghai",
    "language": "zh-CN",
    "isolation_mode": "shared_db",
    "db_key": "default",
    "schema_name": "public",
    "remarks": "",
    "created_at": "2026-06-17T10:00:00Z",
    "updated_at": "2026-06-17T10:00:00Z",
    "created_by": "admin",
    "updated_by": "admin",
    "is_del": false
  }
}
```

### 2.2 分页查询租户列表
**接口路径**: `GET /api/saas/v1/tenants`

**请求参数**:
```json
{
  "page": 1,                          // 选填，页码，默认 1
  "pageSize": 20,                     // 选填，每页数量，默认 20
  "tenant_code": "string",            // 选填，租户编码，模糊查询
  "tenant_name": "string",            // 选填，租户名称，模糊查询
  "tenant_type": "string",            // 选填，租户类型过滤
  "status": "string",                 // 选填，状态过滤
  "sortBy": "created_at",             // 选填，排序字段，默认 created_at
  "sortOrder": "desc"                 // 选填，排序方向 (asc/desc)，默认 desc
}
```

**响应数据**: 返回分页格式数据，list 中每个元素同创建租户的响应数据结构。

### 2.3 获取租户详情
**接口路径**: `GET /api/saas/v1/tenants/{id}`

**路径参数**: `id` (必填，租户ID)

**响应数据**: 同创建租户的响应数据结构。

### 2.4 修改租户
**接口路径**: `PUT /api/saas/v1/tenants/{id}`

**路径参数**: `id` (必填，租户ID)

**请求参数**: 同创建租户，但 `tenant_code` 不可修改。

**响应数据**: 同创建租户的响应数据结构。

### 2.5 冻结租户
**接口路径**: `POST /api/saas/v1/tenants/{id}/freeze`

**路径参数**: `id` (必填，租户ID)

**请求参数**:
```json
{
  "reason": "string"                  // 选填，冻结原因
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 2.6 解冻租户
**接口路径**: `POST /api/saas/v1/tenants/{id}/unfreeze`

**路径参数**: `id` (必填，租户ID)

**请求参数**:
```json
{
  "reason": "string"                  // 选填，解冻原因
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 2.7 注销租户
**接口路径**: `POST /api/saas/v1/tenants/{id}/cancel`

**路径参数**: `id` (必填，租户ID)

**请求参数**:
```json
{
  "reason": "string"                  // 选填，注销原因
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 2.8 删除租户
**接口路径**: `DELETE /api/saas/v1/tenants/{id}`

**路径参数**: `id` (必填，租户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

## 3. 应用管理 (saas_app)

### 3.1 创建应用
**接口路径**: `POST /api/saas/v1/apps`

**请求参数**:
```json
{
  "app_code": "string(50)",           // 必填，应用编码，唯一
  "app_name": "string(100)",          // 必填，应用名称
  "app_type": "string(50)",           // 必填，应用类型 (business=业务应用, platform=平台应用, tool=工具应用)
  "app_version": "string(50)",        // 选填，应用版本
  "icon": "string(255)",              // 选填，应用图标
  "route_path": "string(255)",        // 选填，路由路径
  "sort_order": 0,                    // 选填，排序序号，默认 0
  "status": "string(50)",             // 选填，状态 (active=启用, disabled=停用)，默认 active
  "remarks": "text"                   // 选填，备注
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "app_code": "SAAS_ADMIN",
    "app_name": "SaaS管理系统",
    "app_type": "platform",
    "app_version": "1.0.0",
    "icon": "/icons/saas-admin.svg",
    "route_path": "/saas-admin",
    "sort_order": 1,
    "status": "active",
    "remarks": "",
    "created_at": "2026-06-17T10:00:00Z",
    "updated_at": "2026-06-17T10:00:00Z",
    "created_by": "admin",
    "updated_by": "admin",
    "is_del": false
  }
}
```

### 3.2 分页查询应用列表
**接口路径**: `GET /api/saas/v1/apps`

**请求参数**:
```json
{
  "page": 1,
  "pageSize": 20,
  "app_code": "string",               // 选填，应用编码，模糊查询
  "app_name": "string",               // 选填，应用名称，模糊查询
  "app_type": "string",               // 选填，应用类型过滤
  "status": "string",                 // 选填，状态过滤
  "sortBy": "sort_order",
  "sortOrder": "asc"
}
```

**响应数据**: 返回分页格式数据。

### 3.3 获取应用详情
**接口路径**: `GET /api/saas/v1/apps/{id}`

**路径参数**: `id` (必填，应用ID)

**响应数据**: 同创建应用的响应数据结构。

### 3.4 修改应用
**接口路径**: `PUT /api/saas/v1/apps/{id}`

**路径参数**: `id` (必填，应用ID)

**请求参数**: 同创建应用，但 `app_code` 不可修改。

**响应数据**: 同创建应用的响应数据结构。

### 3.5 启用应用
**接口路径**: `POST /api/saas/v1/apps/{id}/enable`

**路径参数**: `id` (必填，应用ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 3.6 停用应用
**接口路径**: `POST /api/saas/v1/apps/{id}/disable`

**路径参数**: `id` (必填，应用ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 3.7 删除应用
**接口路径**: `DELETE /api/saas/v1/apps/{id}`

**路径参数**: `id` (必填，应用ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

## 4. 功能管理 (saas_feature)

### 4.1 创建功能
**接口路径**: `POST /api/saas/v1/features`

**请求参数**:
```json
{
  "app_id": 1,                        // 必填，所属应用ID
  "parent_id": 0,                     // 必填，父功能ID，顶级为 0
  "feature_code": "string(100)",      // 必填，功能编码，应用下唯一
  "feature_name": "string(100)",      // 必填，功能名称
  "feature_type": "string(50)",       // 必填，功能类型 (feature=功能, module=模块, page=页面)
  "route_path": "string(255)",        // 选填，路由路径
  "permission_code": "string(150)",   // 选填，权限码
  "sort_order": 0,                    // 选填，排序序号，默认 0
  "is_visible": true,                 // 选填，是否可见，默认 true
  "status": "string(50)",             // 选填，状态 (active=启用, disabled=停用)，默认 active
  "remarks": "text"                   // 选填，备注
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "app_id": 1,
    "parent_id": 0,
    "feature_code": "TENANT_MANAGE",
    "feature_name": "租户管理",
    "feature_type": "module",
    "route_path": "/tenant",
    "permission_code": "saas:tenant",
    "sort_order": 1,
    "is_visible": true,
    "status": "active",
    "remarks": "",
    "created_at": "2026-06-17T10:00:00Z",
    "updated_at": "2026-06-17T10:00:00Z",
    "created_by": "admin",
    "updated_by": "admin",
    "is_del": false
  }
}
```

### 4.2 分页查询功能列表
**接口路径**: `GET /api/saas/v1/features`

**请求参数**:
```json
{
  "page": 1,
  "pageSize": 20,
  "app_id": 1,                        // 选填，应用ID过滤
  "parent_id": 0,                     // 选填，父功能ID过滤
  "feature_code": "string",           // 选填，功能编码，模糊查询
  "feature_name": "string",           // 选填，功能名称，模糊查询
  "feature_type": "string",           // 选填，功能类型过滤
  "status": "string",                 // 选填，状态过滤
  "sortBy": "sort_order",
  "sortOrder": "asc"
}
```

**响应数据**: 返回分页格式数据。

### 4.3 获取功能详情
**接口路径**: `GET /api/saas/v1/features/{id}`

**路径参数**: `id` (必填，功能ID)

**响应数据**: 同创建功能的响应数据结构。

### 4.4 修改功能
**接口路径**: `PUT /api/saas/v1/features/{id}`

**路径参数**: `id` (必填，功能ID)

**请求参数**: 同创建功能。

**响应数据**: 同创建功能的响应数据结构。

### 4.5 启用功能
**接口路径**: `POST /api/saas/v1/features/{id}/enable`

**路径参数**: `id` (必填，功能ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 4.6 停用功能
**接口路径**: `POST /api/saas/v1/features/{id}/disable`

**路径参数**: `id` (必填，功能ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 4.7 删除功能
**接口路径**: `DELETE /api/saas/v1/features/{id}`

**路径参数**: `id` (必填，功能ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 4.8 获取应用的功能树
**接口路径**: `GET /api/saas/v1/apps/{appId}/features/tree`

**路径参数**: `appId` (必填，应用ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "feature_code": "TENANT_MANAGE",
      "feature_name": "租户管理",
      "feature_type": "module",
      "children": [
        {
          "id": 2,
          "feature_code": "TENANT_LIST",
          "feature_name": "租户列表",
          "feature_type": "page",
          "children": []
        }
      ]
    }
  ]
}
```

---

## 5. 套餐管理 (saas_plan, saas_plan_feature)

### 5.1 创建套餐
**接口路径**: `POST /api/saas/v1/plans`

**请求参数**:
```json
{
  "plan_code": "string(50)",          // 必填，套餐编码，唯一
  "plan_name": "string(100)",         // 必填，套餐名称
  "plan_type": "string(50)",          // 必填，套餐类型 (basic=基础版, standard=标准版, professional=专业版, enterprise=企业版)
  "billing_cycle": "string(50)",      // 必填，计费周期 (monthly=月付, quarterly=季付, yearly=年付, permanent=永久)
  "price": 0.00,                      // 必填，价格 (decimal 18,2)
  "currency": "string(20)",           // 选填，货币单位，默认 CNY
  "sort_order": 0,                    // 选填，排序序号，默认 0
  "status": "string(50)",             // 选填，状态 (active=启用, disabled=停用)，默认 active
  "remarks": "text"                   // 选填，备注
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "plan_code": "BASIC",
    "plan_name": "基础版",
    "plan_type": "basic",
    "billing_cycle": "yearly",
    "price": 9999.00,
    "currency": "CNY",
    "sort_order": 1,
    "status": "active",
    "remarks": "",
    "created_at": "2026-06-17T10:00:00Z",
    "updated_at": "2026-06-17T10:00:00Z",
    "created_by": "admin",
    "updated_by": "admin",
    "is_del": false
  }
}
```

### 5.2 分页查询套餐列表
**接口路径**: `GET /api/saas/v1/plans`

**请求参数**:
```json
{
  "page": 1,
  "pageSize": 20,
  "plan_code": "string",              // 选填，套餐编码，模糊查询
  "plan_name": "string",              // 选填，套餐名称，模糊查询
  "plan_type": "string",              // 选填，套餐类型过滤
  "billing_cycle": "string",          // 选填，计费周期过滤
  "status": "string",                 // 选填，状态过滤
  "sortBy": "sort_order",
  "sortOrder": "asc"
}
```

**响应数据**: 返回分页格式数据。

### 5.3 获取套餐详情
**接口路径**: `GET /api/saas/v1/plans/{id}`

**路径参数**: `id` (必填，套餐ID)

**响应数据**: 同创建套餐的响应数据结构。

### 5.4 修改套餐
**接口路径**: `PUT /api/saas/v1/plans/{id}`

**路径参数**: `id` (必填，套餐ID)

**请求参数**: 同创建套餐，但 `plan_code` 不可修改。

**响应数据**: 同创建套餐的响应数据结构。

### 5.5 启用套餐
**接口路径**: `POST /api/saas/v1/plans/{id}/enable`

**路径参数**: `id` (必填，套餐ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 5.6 停用套餐
**接口路径**: `POST /api/saas/v1/plans/{id}/disable`

**路径参数**: `id` (必填，套餐ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 5.7 删除套餐
**接口路径**: `DELETE /api/saas/v1/plans/{id}`

**路径参数**: `id` (必填，套餐ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 5.8 为套餐添加功能
**接口路径**: `POST /api/saas/v1/plans/{planId}/features`

**路径参数**: `planId` (必填，套餐ID)

**请求参数**:
```json
{
  "app_id": 1,                        // 必填，应用ID
  "feature_id": 1,                    // 必填，功能ID
  "grant_type": "string(50)",         // 必填，授权类型 (included=包含, excluded=排除, addon=插件)
  "status": "string(50)",             // 选填，状态 (active=启用, disabled=停用)，默认 active
  "remarks": "text"                   // 选填，备注
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "plan_id": 1,
    "app_id": 1,
    "feature_id": 1,
    "grant_type": "included",
    "status": "active",
    "remarks": "",
    "created_at": "2026-06-17T10:00:00Z",
    "updated_at": "2026-06-17T10:00:00Z",
    "created_by": "admin",
    "updated_by": "admin",
    "is_del": false
  }
}
```

### 5.9 查询套餐的功能列表
**接口路径**: `GET /api/saas/v1/plans/{planId}/features`

**路径参数**: `planId` (必填，套餐ID)

**请求参数**:
```json
{
  "app_id": 1,                        // 选填，应用ID过滤
  "grant_type": "string",             // 选填，授权类型过滤
  "status": "string"                  // 选填，状态过滤
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "plan_id": 1,
      "app_id": 1,
      "feature_id": 1,
      "grant_type": "included",
      "status": "active",
      "feature_code": "TENANT_MANAGE",
      "feature_name": "租户管理",
      "remarks": ""
    }
  ]
}
```

### 5.10 删除套餐功能
**接口路径**: `DELETE /api/saas/v1/plans/{planId}/features/{featureId}`

**路径参数**: 
- `planId` (必填，套餐ID)
- `featureId` (必填，功能ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

## 6. 订阅管理 (saas_subscription)

### 6.1 创建订阅
**接口路径**: `POST /api/saas/v1/subscriptions`

**请求参数**:
```json
{
  "tenant_id": 1,                     // 必填，租户ID
  "tenant_code": "string(50)",        // 必填，租户编码
  "plan_id": 1,                       // 必填，套餐ID
  "subscription_code": "string(50)",  // 必填，订阅编码，唯一
  "subscription_status": "string(50)",// 必填，订阅状态 (active=正常, frozen=冻结, expired=过期, cancelled=取消)
  "start_at": "2026-06-17T00:00:00Z", // 必填，开始时间
  "end_at": "2027-06-17T00:00:00Z",   // 必填，结束时间
  "auto_renew": false,                // 选填，是否自动续费，默认 false
  "remarks": "text"                   // 选填，备注
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "tenant_id": 1,
    "tenant_code": "T001",
    "plan_id": 1,
    "subscription_code": "SUB20260617001",
    "subscription_status": "active",
    "start_at": "2026-06-17T00:00:00Z",
    "end_at": "2027-06-17T00:00:00Z",
    "auto_renew": false,
    "remarks": "",
    "created_at": "2026-06-17T10:00:00Z",
    "updated_at": "2026-06-17T10:00:00Z",
    "created_by": "admin",
    "updated_by": "admin",
    "is_del": false
  }
}
```

### 6.2 分页查询订阅列表
**接口路径**: `GET /api/saas/v1/subscriptions`

**请求参数**:
```json
{
  "page": 1,
  "pageSize": 20,
  "tenant_id": 1,                     // 选填，租户ID过滤
  "tenant_code": "string",            // 选填，租户编码过滤
  "plan_id": 1,                       // 选填，套餐ID过滤
  "subscription_code": "string",      // 选填，订阅编码，模糊查询
  "subscription_status": "string",    // 选填，订阅状态过滤
  "sortBy": "created_at",
  "sortOrder": "desc"
}
```

**响应数据**: 返回分页格式数据。

### 6.3 获取订阅详情
**接口路径**: `GET /api/saas/v1/subscriptions/{id}`

**路径参数**: `id` (必填，订阅ID)

**响应数据**: 同创建订阅的响应数据结构。

### 6.4 修改订阅
**接口路径**: `PUT /api/saas/v1/subscriptions/{id}`

**路径参数**: `id` (必填，订阅ID)

**请求参数**: 同创建订阅，但 `subscription_code` 不可修改。

**响应数据**: 同创建订阅的响应数据结构。

### 6.5 续费订阅
**接口路径**: `POST /api/saas/v1/subscriptions/{id}/renew`

**路径参数**: `id` (必填，订阅ID)

**请求参数**:
```json
{
  "end_at": "2028-06-17T00:00:00Z"    // 必填，新的结束时间
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 6.6 变更套餐
**接口路径**: `POST /api/saas/v1/subscriptions/{id}/change-plan`

**路径参数**: `id` (必填，订阅ID)

**请求参数**:
```json
{
  "plan_id": 2                        // 必填，新的套餐ID
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 6.7 冻结订阅
**接口路径**: `POST /api/saas/v1/subscriptions/{id}/freeze`

**路径参数**: `id` (必填，订阅ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 6.8 取消订阅
**接口路径**: `POST /api/saas/v1/subscriptions/{id}/cancel`

**路径参数**: `id` (必填，订阅ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 6.9 删除订阅
**接口路径**: `DELETE /api/saas/v1/subscriptions/{id}`

**路径参数**: `id` (必填，订阅ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

## 7. 用户管理 (iam_user)

### 7.1 创建用户
**接口路径**: `POST /api/iam/v1/users`

**请求参数**:
```json
{
  "user_name": "string(100)",         // 必填，用户名，唯一
  "password": "string",               // 必填，密码（传输时应加密）
  "real_name": "string(100)",         // 选填，真实姓名
  "nick_name": "string(100)",         // 选填，昵称
  "phone": "string(50)",              // 选填，手机号
  "email": "string(100)",             // 选填，邮箱
  "avatar_url": "string(500)",        // 选填，头像URL
  "user_type": "string(50)",          // 选填，用户类型 (internal=内部用户, external=外部用户, system=系统用户)，默认 internal
  "status": "string(50)",             // 选填，状态 (active=正常, disabled=禁用, locked=锁定)，默认 active
  "remarks": "text"                   // 选填，备注
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "user_name": "zhangsan",
    "real_name": "张三",
    "nick_name": "小三",
    "phone": "13800138000",
    "email": "zhangsan@example.com",
    "avatar_url": "",
    "user_type": "internal",
    "status": "active",
    "last_login_at": null,
    "last_login_ip": "",
    "password_updated_at": null,
    "remarks": "",
    "created_at": "2026-06-17T10:00:00Z",
    "updated_at": "2026-06-17T10:00:00Z",
    "created_by": "admin",
    "updated_by": "admin",
    "is_del": false
  }
}
```
**注意**: 响应数据中不包含 `password_hash` 和 `password_salt` 等敏感字段。

### 7.2 分页查询用户列表
**接口路径**: `GET /api/iam/v1/users`

**请求参数**:
```json
{
  "page": 1,
  "pageSize": 20,
  "user_name": "string",              // 选填，用户名，模糊查询
  "real_name": "string",              // 选填，真实姓名，模糊查询
  "phone": "string",                  // 选填，手机号，模糊查询
  "email": "string",                  // 选填，邮箱，模糊查询
  "user_type": "string",              // 选填，用户类型过滤
  "status": "string",                 // 选填，状态过滤
  "sortBy": "created_at",
  "sortOrder": "desc"
}
```

**响应数据**: 返回分页格式数据。

### 7.3 获取用户详情
**接口路径**: `GET /api/iam/v1/users/{id}`

**路径参数**: `id` (必填，用户ID)

**响应数据**: 同创建用户的响应数据结构。

### 7.4 修改用户
**接口路径**: `PUT /api/iam/v1/users/{id}`

**路径参数**: `id` (必填，用户ID)

**请求参数**: 同创建用户，但不包含 `password` 和 `user_name`（用户名不可修改）。

**响应数据**: 同创建用户的响应数据结构。

### 7.5 修改密码
**接口路径**: `POST /api/iam/v1/users/{id}/change-password`

**路径参数**: `id` (必填，用户ID)

**请求参数**:
```json
{
  "old_password": "string",           // 必填，旧密码（传输时应加密）
  "new_password": "string"            // 必填，新密码（传输时应加密）
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 7.6 重置密码
**接口路径**: `POST /api/iam/v1/users/{id}/reset-password`

**路径参数**: `id` (必填，用户ID)

**请求参数**:
```json
{
  "new_password": "string"            // 必填，新密码（传输时应加密）
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 7.7 启用用户
**接口路径**: `POST /api/iam/v1/users/{id}/enable`

**路径参数**: `id` (必填，用户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 7.8 禁用用户
**接口路径**: `POST /api/iam/v1/users/{id}/disable`

**路径参数**: `id` (必填，用户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 7.9 锁定用户
**接口路径**: `POST /api/iam/v1/users/{id}/lock`

**路径参数**: `id` (必填，用户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 7.10 解锁用户
**接口路径**: `POST /api/iam/v1/users/{id}/unlock`

**路径参数**: `id` (必填，用户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 7.11 删除用户
**接口路径**: `DELETE /api/iam/v1/users/{id}`

**路径参数**: `id` (必填，用户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

## 8. 租户用户管理 (iam_tenant_user)

### 8.1 创建租户用户关联
**接口路径**: `POST /api/iam/v1/tenant-users`

**请求参数**:
```json
{
  "tenant_id": 1,                     // 必填，租户ID
  "tenant_code": "string(50)",        // 必填，租户编码
  "user_id": 1,                       // 必填，用户ID
  "tenant_user_code": "string(50)",   // 选填，租户用户编码
  "display_name": "string(100)",      // 选填，显示名称
  "user_type": "string(50)",          // 必填，用户类型 (internal=内部员工, external=外部用户, partner=合作伙伴)
  "status": "string(50)",             // 选填，状态 (active=正常, disabled=禁用, left=离职)，默认 active
  "is_tenant_admin": false,           // 选填，是否租户管理员，默认 false
  "joined_at": "2026-06-17T00:00:00Z",// 选填，加入时间，默认当前时间
  "left_at": null,                    // 选填，离职时间
  "remarks": "text"                   // 选填，备注
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "tenant_id": 1,
    "tenant_code": "T001",
    "user_id": 1,
    "tenant_user_code": "TU001",
    "display_name": "张三",
    "user_type": "internal",
    "status": "active",
    "is_tenant_admin": false,
    "joined_at": "2026-06-17T00:00:00Z",
    "left_at": null,
    "remarks": "",
    "created_at": "2026-06-17T10:00:00Z",
    "updated_at": "2026-06-17T10:00:00Z",
    "created_by": "admin",
    "updated_by": "admin",
    "is_del": false
  }
}
```

### 8.2 分页查询租户用户列表
**接口路径**: `GET /api/iam/v1/tenant-users`

**请求参数**:
```json
{
  "page": 1,
  "pageSize": 20,
  "tenant_id": 1,                     // 选填，租户ID过滤
  "tenant_code": "string",            // 选填，租户编码过滤
  "user_id": 1,                       // 选填，用户ID过滤
  "display_name": "string",           // 选填，显示名称，模糊查询
  "user_type": "string",              // 选填，用户类型过滤
  "status": "string",                 // 选填，状态过滤
  "is_tenant_admin": true,            // 选填，是否租户管理员过滤
  "sortBy": "joined_at",
  "sortOrder": "desc"
}
```

**响应数据**: 返回分页格式数据。

### 8.3 获取租户用户详情
**接口路径**: `GET /api/iam/v1/tenant-users/{id}`

**路径参数**: `id` (必填，租户用户ID)

**响应数据**: 同创建租户用户的响应数据结构。

### 8.4 修改租户用户
**接口路径**: `PUT /api/iam/v1/tenant-users/{id}`

**路径参数**: `id` (必填，租户用户ID)

**请求参数**: 同创建租户用户，但 `tenant_id`、`user_id` 不可修改。

**响应数据**: 同创建租户用户的响应数据结构。

### 8.5 设置为租户管理员
**接口路径**: `POST /api/iam/v1/tenant-users/{id}/set-admin`

**路径参数**: `id` (必填，租户用户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 8.6 取消租户管理员
**接口路径**: `POST /api/iam/v1/tenant-users/{id}/unset-admin`

**路径参数**: `id` (必填，租户用户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 8.7 离职处理
**接口路径**: `POST /api/iam/v1/tenant-users/{id}/leave`

**路径参数**: `id` (必填，租户用户ID)

**请求参数**:
```json
{
  "left_at": "2026-06-17T00:00:00Z"   // 必填，离职时间
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 8.8 删除租户用户
**接口路径**: `DELETE /api/iam/v1/tenant-users/{id}`

**路径参数**: `id` (必填，租户用户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 8.9 获取用户的组织信息
**接口路径**: `GET /api/iam/v1/tenant-users/{id}/organizations`

**路径参数**: `id` (必填，租户用户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "tenant_user_id": 1,
      "org_id": 1,
      "org_code": "DEPT001",
      "org_name": "技术部",
      "relation_type": "primary",
      "is_primary": true,
      "status": "active"
    }
  ]
}
```

### 8.10 获取用户的岗位信息
**接口路径**: `GET /api/iam/v1/tenant-users/{id}/positions`

**路径参数**: `id` (必填，租户用户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "tenant_user_id": 1,
      "position_id": 1,
      "position_code": "DEV",
      "position_name": "开发工程师",
      "relation_type": "primary",
      "status": "active"
    }
  ]
}
```

---

## 9. 组织架构管理 (iam_org)

### 9.1 创建组织
**接口路径**: `POST /api/iam/v1/organizations`

**请求参数**:
```json
{
  "tenant_id": 1,                     // 必填，租户ID
  "tenant_code": "string(50)",        // 必填，租户编码
  "parent_id": 0,                     // 必填，父组织ID，顶级为 0
  "org_code": "string(50)",           // 必填，组织编码，租户下唯一
  "org_name": "string(100)",          // 必填，组织名称
  "org_type": "string(50)",           // 必填，组织类型 (company=公司, department=部门, team=团队)
  "leader_tenant_user_id": 0,         // 选填，负责人租户用户ID，默认 0
  "path": "string(500)",              // 选填，组织路径（自动生成）
  "level": 1,                         // 选填，组织层级（自动计算）
  "sort_order": 0,                    // 选填，排序序号，默认 0
  "status": "string(50)",             // 选填，状态 (active=启用, disabled=停用)，默认 active
  "remarks": "text"                   // 选填，备注
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "tenant_id": 1,
    "tenant_code": "T001",
    "parent_id": 0,
    "org_code": "TECH_DEPT",
    "org_name": "技术部",
    "org_type": "department",
    "leader_tenant_user_id": 1,
    "path": "/1",
    "level": 1,
    "sort_order": 1,
    "status": "active",
    "remarks": "",
    "created_at": "2026-06-17T10:00:00Z",
    "updated_at": "2026-06-17T10:00:00Z",
    "created_by": "admin",
    "updated_by": "admin",
    "is_del": false
  }
}
```

### 9.2 分页查询组织列表
**接口路径**: `GET /api/iam/v1/organizations`

**请求参数**:
```json
{
  "page": 1,
  "pageSize": 20,
  "tenant_id": 1,                     // 选填，租户ID过滤
  "tenant_code": "string",            // 选填，租户编码过滤
  "parent_id": 0,                     // 选填，父组织ID过滤
  "org_code": "string",               // 选填，组织编码，模糊查询
  "org_name": "string",               // 选填，组织名称，模糊查询
  "org_type": "string",               // 选填，组织类型过滤
  "status": "string",                 // 选填，状态过滤
  "sortBy": "sort_order",
  "sortOrder": "asc"
}
```

**响应数据**: 返回分页格式数据。

### 9.3 获取组织详情
**接口路径**: `GET /api/iam/v1/organizations/{id}`

**路径参数**: `id` (必填，组织ID)

**响应数据**: 同创建组织的响应数据结构。

### 9.4 修改组织
**接口路径**: `PUT /api/iam/v1/organizations/{id}`

**路径参数**: `id` (必填，组织ID)

**请求参数**: 同创建组织，但 `org_code` 不可修改。

**响应数据**: 同创建组织的响应数据结构。

### 9.5 启用组织
**接口路径**: `POST /api/iam/v1/organizations/{id}/enable`

**路径参数**: `id` (必填，组织ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 9.6 停用组织
**接口路径**: `POST /api/iam/v1/organizations/{id}/disable`

**路径参数**: `id` (必填，组织ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 9.7 删除组织
**接口路径**: `DELETE /api/iam/v1/organizations/{id}`

**路径参数**: `id` (必填，组织ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

### 9.8 获取组织树
**接口路径**: `GET /api/iam/v1/organizations/tree`

**请求参数**:
```json
{
  "tenant_id": 1,                     // 必填，租户ID
  "tenant_code": "string"             // 必填，租户编码
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "org_code": "TECH_DEPT",
      "org_name": "技术部",
      "org_type": "department",
      "children": [
        {
          "id": 2,
          "org_code": "DEV_TEAM",
          "org_name": "开发团队",
          "org_type": "team",
          "children": []
        }
      ]
    }
  ]
}
```

### 9.9 为组织添加用户
**接口路径**: `POST /api/iam/v1/organizations/{orgId}/users`

**路径参数**: `orgId` (必填，组织ID)

**请求参数**:
```json
{
  "tenant_id": 1,                     // 必填，租户ID
  "tenant_code": "string(50)",        // 必填，租户编码
  "org_code": "string(50)",           // 必填，组织编码
  "tenant_user_id": 1,                // 必填，租户用户ID
  "relation_type": "string(50)",      // 必填，关系类型 (primary=主要, concurrent=兼职)
  "is_primary": true,                 // 选填，是否主组织，默认 true
  "effective_start": "2026-06-17T00:00:00Z", // 选填，生效开始时间，默认当前时间
  "effective_end": null,              // 选填，生效结束时间
  "status": "string(50)",             // 选填，状态 (active=启用, disabled=停用)，默认 active
  "remarks": "text"                   // 选填，备注
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "tenant_id": 1,
    "tenant_code": "T001",
    "org_code": "TECH_DEPT",
    "tenant_user_id": 1,
    "org_id": 1,
    "relation_type": "primary",
    "is_primary": true,
    "effective_start": "2026-06-17T00:00:00Z",
    "effective_end": null,
    "status": "active",
    "remarks": "",
    "created_at": "2026-06-17T10:00:00Z",
    "updated_at": "2026-06-17T10:00:00Z",
    "created_by": "admin",
    "updated_by": "admin",
    "is_del": false
  }
}
```

### 9.10 查询组织的用户列表
**接口路径**: `GET /api/iam/v1/organizations/{orgId}/users`

**路径参数**: `orgId` (必填，组织ID)

**请求参数**:
```json
{
  "relation_type": "string",          // 选填，关系类型过滤
  "status": "string"                  // 选填，状态过滤
}
```

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "id": 1,
      "tenant_user_id": 1,
      "user_id": 1,
      "user_name": "zhangsan",
      "real_name": "张三",
      "display_name": "张三",
      "relation_type": "primary",
      "is_primary": true,
      "status": "active"
    }
  ]
}
```

### 9.11 从组织移除用户
**接口路径**: `DELETE /api/iam/v1/organizations/{orgId}/users/{tenantUserId}`

**路径参数**: 
- `orgId` (必填，组织ID)
- `tenantUserId` (必填，租户用户ID)

**响应数据**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

## 10. 岗位管理 (iam_position)