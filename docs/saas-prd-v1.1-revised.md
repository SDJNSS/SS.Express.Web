# SaaS 用户、租户、权限与审计系统开发规格文档

> 版本：v1.1 修正版  
> 修订日期：2026-06-15  
> 修订范围：修正删除“按钮与 API 绑定”后的模块编号与依赖引用；统一登录审计 pending 状态；修正多套餐订阅上下文；拆分组织型与业务资源型数据权限；补充 module 级套餐授权递归展开与商业边界。


## 0. 文档边界

本开发规格文档严格基于 `saas-db-design.sql` 中的表结构生成，功能范围限定为以下 20 个模块：

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
16. 数据权限配置
17. 登录审计
18. 操作审计
19. 权限变更审计
20. 数据导出审计

本系统不包含以下能力：

```text
1. 在线支付
2. 发票管理
3. 复杂账单
4. 用户数、仓库数、车辆数等配额控制
5. MFA 多因素认证
6. 企业微信、钉钉、OIDC、LDAP 身份源
7. 字段级动态权限配置
8. 外部合作伙伴门户
9. 微前端运行时治理
```

原因：当前数据库表结构未提供对应表或字段。

---

## 0.1 涉及数据表

### 租户与计费域

```text
saas_tenant
saas_app
saas_feature
saas_plan
saas_plan_feature
saas_subscription
```

### 组织与身份域

```text
iam_user
iam_tenant_user
iam_session
iam_org
iam_position
iam_user_org
iam_user_position
```

### 高阶权限与访问控制域

```text
iam_role
iam_role_template
iam_resource
iam_role_resource
iam_role_assignment
iam_data_scope
iam_data_scope_item
```

### 安全与审计域

```text
audit_login_log
audit_operation_log
audit_permission_change_log
audit_data_export_log
```

### 字典支撑表

```text
sys_dict_type
sys_dict_item
```

字典表仅作为类型字段枚举支撑，不作为独立业务模块展开。

---

## 0.2 通用开发约束

### 0.2.1 软删除约束

所有业务查询默认必须追加：

```sql
is_del = false
```

删除操作默认执行软删除：

```sql
UPDATE table_name
SET is_del = true,
    updated_at = now(),
    updated_by = :operator
WHERE id = :id;
```

除非后续明确要求，不允许物理删除。

---

### 0.2.2 租户隔离约束

以下表具备 `tenant_id`，属于租户级数据：

```text
saas_subscription

iam_tenant_user
iam_session
iam_org
iam_position
iam_user_org
iam_user_position

iam_role
iam_resource
iam_role_resource
iam_role_assignment
iam_data_scope
iam_data_scope_item

audit_login_log
audit_operation_log
audit_permission_change_log
audit_data_export_log
```

租户级查询必须追加：

```sql
tenant_id = :currentTenantId
AND is_del = false
```

平台级表不按租户隔离：

```text
saas_tenant
saas_app
saas_feature
saas_plan
saas_plan_feature
iam_user
iam_role_template
sys_dict_type
sys_dict_item
```

**tenant_id = 0 的语义说明：**

- `tenant_id = 0` **仅用于审计表**，表示"平台级操作"，而非表示"平台级表"
- 平台级表（如 `saas_tenant`、`saas_app`）本身不包含 `tenant_id` 字段
- 当平台管理员操作平台级资源（如创建应用、创建套餐）时，审计表中记录 `tenant_id = 0`
- 租户级表的数据 `tenant_id` 永远 > 0，表示归属于具体租户

---

### 0.2.3 状态字段通用约束

凡存在 `status` 字段的表，默认有效条件为：

```sql
status = 'active'
AND is_del = false
```

状态字段包括但不限于：

```text
saas_tenant.status
saas_app.status
saas_feature.status
saas_plan.status
saas_plan_feature.status
iam_user.status
iam_tenant_user.status
iam_session.session_status
iam_org.status
iam_position.status
iam_role.status
iam_role_template.status
iam_resource.status
iam_role_resource.status
iam_role_assignment.status
iam_data_scope.status
iam_data_scope_item.status
```

---

### 0.2.4 审计字段写入约束

所有新增记录必须写入：

```text
created_at
updated_at
created_by（格式：username——user_id，如 "zhangsan——1001"）
updated_by（格式：username——user_id，如 "zhangsan——1001"）
is_del
```

所有更新操作必须更新：

```text
updated_at
updated_by（格式：username——user_id）
```

说明：
- `created_by` 和 `updated_by` 字段采用组合格式 `username——user_id`，既保留可读性，又确保可追溯性
- 即使用户名变更，仍可通过 user_id 准确追溯操作人
- 系统自动化操作可使用 `system——0` 表示

---

# 一、租户与计费域

本域包含模块 1-5：

```text
1. 租户管理
2. 应用管理
3. 功能管理
4. 套餐管理
5. 订阅管理
```

---

## 1. 租户管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

租户主数据存储于 `saas_tenant`。

核心字段：

```text
id
tenant_code
tenant_name
tenant_type
status
company_name
contact_name
contact_phone
contact_email
domain
subdomain
logo_url
timezone
language
isolation_mode
db_key
schema_name
remarks
```

租户创建流程：

```text
1. 平台管理员录入租户基础信息。
2. 后端校验 tenant_code 唯一。
3. 后端校验 domain、subdomain 不与其他有效租户冲突。
4. 写入 saas_tenant。
5. 如需开通服务，由订阅管理创建 saas_subscription。
6. 操作写入 audit_operation_log。
```

租户状态流转建议：

```text
trial -> active
active -> frozen
active -> expired
active -> cancelled
frozen -> active
expired -> active
expired -> cancelled
cancelled 为终态
```

当前表结构中没有独立租户状态日志表，因此租户状态变更必须通过：

```text
audit_operation_log
audit_permission_change_log
```

记录。

租户可用性判断：

```text
saas_tenant.is_del = false
saas_tenant.status in ('active', 'trial')
存在有效 saas_subscription
```

有效订阅判断：

```text
saas_subscription.subscription_status in ('active', 'trial')
saas_subscription.start_at <= now()
saas_subscription.end_at >= now()
saas_subscription.is_del = false
```

#### 跨模块依赖

强依赖模块：

```text
5. 订阅管理：租户是否可使用系统取决于有效订阅。
6. 用户管理：租户管理员或租户用户需要关联 iam_user。
7. 租户用户管理：租户内用户身份由 iam_tenant_user 表达。
8. 登录与会话管理：登录时必须校验租户状态。
18. 操作审计：租户新增、修改、冻结、解冻、注销、删除必须审计。
19. 权限变更审计：租户状态变化会影响访问边界，必须记录。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                  | Method   | 说明     | 读写表                                                 |
| ------------------------------------ | -------- | ------ | --------------------------------------------------- |
| `/api/saas/v1/tenants`               | `POST`   | 创建租户   | 写 `saas_tenant`，写 `audit_operation_log`             |
| `/api/saas/v1/tenants`               | `GET`    | 分页查询租户 | 读 `saas_tenant`，可联查 `saas_subscription`、`saas_plan` |
| `/api/saas/v1/tenants/{id}`          | `GET`    | 租户详情   | 读 `saas_tenant`，读订阅摘要                               |
| `/api/saas/v1/tenants/{id}`          | `PUT`    | 修改租户   | 读写 `saas_tenant`，写 `audit_operation_log`            |
| `/api/saas/v1/tenants/{id}/freeze`   | `POST`   | 冻结租户   | 写 `saas_tenant.status`，写审计                          |
| `/api/saas/v1/tenants/{id}/unfreeze` | `POST`   | 解冻租户   | 写 `saas_tenant.status`，写审计                          |
| `/api/saas/v1/tenants/{id}/cancel`   | `POST`   | 注销租户   | 写 `saas_tenant.status`，写审计                          |
| `/api/saas/v1/tenants/{id}`          | `DELETE` | 软删除租户  | 写 `saas_tenant.is_del`，写审计                          |

#### 关键业务校验规则

创建时必须校验：

```sql
SELECT COUNT(1)
FROM saas_tenant
WHERE tenant_code = :tenantCode
  AND is_del = false;
```

`domain` 非空时必须唯一：

```sql
SELECT COUNT(1)
FROM saas_tenant
WHERE domain = :domain
  AND domain <> ''
  AND id <> :id
  AND is_del = false;
```

`subdomain` 非空时必须唯一：

```sql
SELECT COUNT(1)
FROM saas_tenant
WHERE subdomain = :subdomain
  AND subdomain <> ''
  AND id <> :id
  AND is_del = false;
```

状态校验：

```text
1. status = cancelled 的租户不可修改、不可解冻、不可登录。
2. status = frozen 的租户不可进入业务系统，但可续费、可解冻。
3. status = expired 的租户不可进入业务系统，但可续费。
4. is_del = true 的租户对所有业务接口视为不存在。
```

字段边界校验：

```text
tenant_code：必填，长度 <= 50
tenant_name：必填，长度 <= 100
tenant_type：必填
contact_email：非空时必须符合邮箱格式
domain：长度 <= 255
subdomain：长度 <= 100
timezone：必填，默认 Asia/Shanghai
language：必填，默认 zh-CN
isolation_mode：当前仅保存配置，不执行真实分库逻辑
```

禁止项：

```text
当前表结构没有租户配额表，因此不能在租户管理中实现用户数、仓库数、车辆数、API 次数等额度校验。
```

---

### 3. 前端开发规约

#### UI 交互边界控制

租户列表字段：

```text
租户编码
租户名称
租户类型
状态
企业名称
联系人
联系电话
邮箱
域名
子域名
时区
语言
创建时间
操作
```

创建 / 编辑表单强校验：

```text
tenantCode 必填
tenantName 必填
tenantType 必填
contactEmail 非空时校验邮箱格式
domain 长度 <= 255
subdomain 长度 <= 100
timezone 必填
language 必填
```

以下操作必须二次确认：

```text
冻结租户
解冻租户
注销租户
删除租户
```

状态展示必须使用字典：

```text
saas_tenant_status
saas_tenant_type
saas_isolation_mode
```

#### 状态与缓存

当前租户上下文需要放入全局 Store：

```text
tenantId
tenantCode
tenantName
tenantStatus
timezone
language
logoUrl
subscriptions：当前租户有效订阅数组
nearestSubscriptionEndAt：所有有效订阅中最近到期时间
planSummary：当前有效套餐名称摘要
enabledAppCodes
enabledFeatureCodes
```

前端只用于 UI 控制，最终访问权限以后端校验为准。

---

## 2. 应用管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

应用主数据存储于 `saas_app`。

核心字段：

```text
id
app_code
app_name
app_type
app_version
icon
route_path
sort_order
status
remarks
```

应用用于定义平台业务系统入口，例如：

```text
SAAS
WMS
YMS
TMS
OMS
CRM
```

应用创建后，功能管理模块在 `saas_feature.app_id` 下维护模块和功能点。

租户是否可访问某应用，不直接由 `saas_app` 决定，而由以下链路决定：

```text
saas_subscription
 -> saas_plan
 -> saas_plan_feature
 -> saas_feature
 -> saas_app
```

#### 跨模块依赖

```text
3. 功能管理：应用下必须维护功能树。
4. 套餐管理：套餐通过功能间接包含应用。
5. 订阅管理：租户通过订阅套餐获得应用访问权。
13. 权限资源管理：iam_resource.app_id 可关联应用。
18. 操作审计：应用新增、修改、启停、删除需要审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                              | Method   | 说明    | 读写表                            |
| -------------------------------- | -------- | ----- | ------------------------------ |
| `/api/saas/v1/apps`              | `POST`   | 创建应用  | 写 `saas_app`，写审计               |
| `/api/saas/v1/apps`              | `GET`    | 应用列表  | 读 `saas_app`                   |
| `/api/saas/v1/apps/{id}`         | `GET`    | 应用详情  | 读 `saas_app`，可读 `saas_feature` |
| `/api/saas/v1/apps/{id}`         | `PUT`    | 修改应用  | 写 `saas_app`                   |
| `/api/saas/v1/apps/{id}/enable`  | `POST`   | 启用应用  | 写 `saas_app.status`            |
| `/api/saas/v1/apps/{id}/disable` | `POST`   | 停用应用  | 写 `saas_app.status`            |
| `/api/saas/v1/apps/{id}`         | `DELETE` | 软删除应用 | 写 `saas_app.is_del`            |

#### 关键业务校验规则

`app_code` 必须唯一：

```sql
SELECT COUNT(1)
FROM saas_app
WHERE app_code = :appCode
  AND is_del = false;
```

应用删除前必须校验无有效功能：

```sql
SELECT COUNT(1)
FROM saas_feature
WHERE app_id = :appId
  AND is_del = false;
```

应用停用前建议校验是否存在套餐引用：

```sql
SELECT COUNT(1)
FROM saas_plan_feature pf
JOIN saas_feature f ON pf.feature_id = f.id
WHERE f.app_id = :appId
  AND pf.is_del = false
  AND pf.status = 'active'
  AND f.is_del = false;
```

如存在引用，第一阶段建议禁止停用。

字段校验：

```text
app_code：必填，长度 <= 50，建议大写字母、数字、下划线
app_name：必填，长度 <= 100
app_type：必填
app_version：长度 <= 50
route_path：长度 <= 255，建议以 / 开头
sort_order：整数
```

---

### 3. 前端开发规约

#### UI 交互边界控制

列表展示：

```text
应用编码
应用名称
应用类型
版本
图标
入口路由
排序
状态
创建时间
操作
```

停用和删除必须二次确认。

状态和类型使用字典：

```text
saas_app_type
common_status
```

#### 状态与缓存

平台端可缓存应用列表：

```text
appId
appCode
appName
appType
routePath
icon
status
sortOrder
```

租户工作台必须使用后端返回的当前租户可访问应用集合，不允许直接使用全量 `saas_app`。

---

## 3. 功能管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

功能主数据存储于 `saas_feature`。

核心字段：

```text
id
app_id
parent_id
feature_code
feature_name
feature_type
route_path
permission_code
sort_order
is_visible
status
remarks
```

`saas_feature` 同时表达模块和功能点：

```text
feature_type = module：模块节点
feature_type = feature：实际功能点
```

树形关系由 `parent_id` 表达。

套餐通过 `saas_plan_feature.feature_id` 绑定功能点。

#### 跨模块依赖

```text
2. 应用管理：功能必须归属有效应用。
4. 套餐管理：功能被套餐引用。
5. 订阅管理：租户通过订阅套餐获得功能。
13. 权限资源管理：feature.permission_code 可与 iam_resource.permission_code 形成约定式关联。
18. 操作审计：功能新增、修改、启停、删除需要审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                       | Method   | 说明    | 读写表                           |
| ----------------------------------------- | -------- | ----- | ----------------------------- |
| `/api/saas/v1/features`                   | `POST`   | 创建功能  | 读 `saas_app`，写 `saas_feature` |
| `/api/saas/v1/apps/{appId}/features/tree` | `GET`    | 应用功能树 | 读 `saas_feature`              |
| `/api/saas/v1/features/{id}`              | `GET`    | 功能详情  | 读 `saas_feature`              |
| `/api/saas/v1/features/{id}`              | `PUT`    | 修改功能  | 写 `saas_feature`              |
| `/api/saas/v1/features/{id}/enable`       | `POST`   | 启用功能  | 写 `saas_feature.status`       |
| `/api/saas/v1/features/{id}/disable`      | `POST`   | 停用功能  | 写 `saas_feature.status`       |
| `/api/saas/v1/features/{id}`              | `DELETE` | 删除功能  | 写 `saas_feature.is_del`       |

#### 关键业务校验规则

应用有效性：

```sql
SELECT COUNT(1)
FROM saas_app
WHERE id = :appId
  AND status = 'active'
  AND is_del = false;
```

同一应用下 `feature_code` 唯一：

```sql
SELECT COUNT(1)
FROM saas_feature
WHERE app_id = :appId
  AND feature_code = :featureCode
  AND is_del = false;
```

父级校验：

```text
parent_id = 0 表示根节点。
parent_id != 0 时，父级必须存在且 app_id 相同。
```

防循环校验：

```text
修改 parent_id 时，不允许将节点挂到自身或自身子孙节点下。
```

删除前校验：

```sql
SELECT COUNT(1)
FROM saas_feature
WHERE parent_id = :featureId
  AND is_del = false;
```

被套餐引用时不允许删除：

```sql
SELECT COUNT(1)
FROM saas_plan_feature
WHERE feature_id = :featureId
  AND is_del = false;
```

功能类型绑定规则：

```text
saas_plan_feature 允许绑定以下类型：
- feature_type = 'feature'：绑定具体功能点。
- feature_type = 'module'：绑定模块节点，运行时递归展开为该模块下所有可商用的功能点。

运行时展开逻辑（当绑定为 module 时）：
1. 以被绑定的 module 节点作为根节点。
2. 递归查询该 module 节点下所有子孙节点。
3. 仅筛选 feature_type = 'feature'、status = 'active'、is_visible = true、is_del = false 的功能点。
4. 将筛选结果视为套餐已授权功能。

商业边界：
- module 绑定是“动态展开 active + visible 功能”，不是无条件包含模块下所有历史和未来功能。
- 新增高价值功能、增值功能、试验功能时，业务层必须先创建为 status = 'inactive' 或 is_visible = false。
- 只有经过套餐边界确认并启用后，该功能才会被 module 绑定自动展开。
- 如果不希望新功能自动进入已有套餐，则必须保持该功能 inactive，或改用 feature 级精确绑定。
```

---

### 3. 前端开发规约

#### UI 交互边界控制

功能管理必须使用树形表格。

字段展示：

```text
功能名称
功能编码
功能类型
路由
权限标识
是否可见
状态
排序
操作
```

前端强校验：

```text
featureCode 必填
featureName 必填
featureType 必填
appId 必填
parentId 必填
sortOrder 整数
permissionCode 长度 <= 150
routePath 长度 <= 255
```

删除有子节点的功能时，前端应禁用删除按钮或提示无法删除。

#### 状态与缓存

平台管理端可缓存当前应用功能树。

租户端 Store 只保存后端返回的授权功能集合：

```text
enabledFeatureCodes
enabledFeaturePermissionCodes
```

---

## 4. 套餐管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

套餐主数据存储于 `saas_plan`。

套餐与功能关系存储于 `saas_plan_feature`。

核心字段：

```text
saas_plan:
plan_code
plan_name
plan_type
billing_cycle
price
currency
sort_order
status

saas_plan_feature:
plan_id
app_id
feature_id
grant_type
status
```

套餐创建流程：

```text
1. 创建 saas_plan。
2. 选择 saas_feature 中可授权的功能点。
3. 写入 saas_plan_feature。
4. 租户订阅该套餐后获得对应功能。
```

#### 跨模块依赖

```text
2. 应用管理：套餐功能关系包含 app_id。
3. 功能管理：套餐通过 feature_id 授权功能。
5. 订阅管理：订阅引用 plan_id。
18. 操作审计：套餐新增、修改、启停、删除、功能配置需要审计。
19. 权限变更审计：套餐功能变更影响租户功能边界，需要审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                | Method   | 说明     | 读写表                               |
| ---------------------------------- | -------- | ------ | --------------------------------- |
| `/api/saas/v1/plans`               | `POST`   | 创建套餐   | 写 `saas_plan`                     |
| `/api/saas/v1/plans`               | `GET`    | 套餐列表   | 读 `saas_plan`                     |
| `/api/saas/v1/plans/{id}`          | `GET`    | 套餐详情   | 读 `saas_plan`、`saas_plan_feature` |
| `/api/saas/v1/plans/{id}`          | `PUT`    | 修改套餐   | 写 `saas_plan`                     |
| `/api/saas/v1/plans/{id}/features` | `PUT`    | 配置套餐功能 | 写 `saas_plan_feature`，写权限变更审计     |
| `/api/saas/v1/plans/{id}/enable`   | `POST`   | 启用套餐   | 写 `saas_plan.status`              |
| `/api/saas/v1/plans/{id}/disable`  | `POST`   | 停用套餐   | 写 `saas_plan.status`              |
| `/api/saas/v1/plans/{id}`          | `DELETE` | 删除套餐   | 写 `saas_plan.is_del`              |

#### 关键业务校验规则

`plan_code` 唯一：

```sql
SELECT COUNT(1)
FROM saas_plan
WHERE plan_code = :planCode
  AND is_del = false;
```

价格校验：

```text
price >= 0
currency 必填
billing_cycle 必填
```

套餐功能配置校验：

```sql
SELECT COUNT(1)
FROM saas_feature f
JOIN saas_app a ON f.app_id = a.id
WHERE f.id = :featureId
  AND f.app_id = :appId
  AND f.status = 'active'
  AND f.is_del = false
  AND a.status = 'active'
  AND a.is_del = false;
```

同一套餐同一功能唯一：

```text
数据库约束：uk_saas_plan_feature(plan_id, feature_id)
```

软删除后重新添加时，应优先恢复旧记录，而不是直接插入导致唯一约束冲突。

删除套餐前校验订阅引用：

```sql
SELECT COUNT(1)
FROM saas_subscription
WHERE plan_id = :planId
  AND is_del = false;
```

存在订阅引用时禁止删除。

当前表结构无配额字段，因此套餐不能实现：

```text
用户数限制
仓库数限制
车辆数限制
API 调用次数限制
```

---

### 3. 前端开发规约

#### UI 交互边界控制

套餐列表字段：

```text
套餐编码
套餐名称
套餐类型
计费周期
价格
币种
状态
排序
创建时间
操作
```

套餐功能配置必须使用应用-功能树：

```text
应用
  └── 模块
      └── 功能点
```

允许勾选以下类型节点：
- `feature_type = 'module'`：勾选整个模块，运行时递归展开为该模块下所有 active + visible 的功能点。
- `feature_type = 'feature'`：勾选单个功能点。

推荐配置策略：
- 标准基础能力可勾选模块级节点，减少配置工作量。
- 高价值、增值、试验性功能必须使用 feature 级精确绑定，或创建时保持 inactive / invisible。
- 套餐功能配置页必须提示：模块级绑定会动态包含后续启用的子功能。

修改套餐功能必须二次确认：

```text
修改套餐功能会影响订阅该套餐的租户可访问功能。
```

#### 状态与缓存

平台端可缓存套餐列表。

套餐功能配置页面必须实时读取：

```text
saas_app
saas_feature
saas_plan_feature
```

租户端不得直接缓存套餐明细，只能缓存后端计算后的授权结果。

---

## 5. 订阅管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

订阅主数据存储于 `saas_subscription`。

核心字段：

```text
tenant_id
plan_id
subscription_code
subscription_status
start_at
end_at
auto_renew
remarks
```

订阅创建流程：

```text
1. 选择有效租户。
2. 选择有效套餐。
3. 设置 start_at、end_at。
4. 写入 saas_subscription。
5. 登录、应用入口、菜单加载时校验订阅有效性。
```

有效订阅判断：

```text
subscription_status in ('active', 'trial')
start_at <= now()
end_at >= now()
is_del = false
```

租户可访问应用计算链路：

```text
saas_subscription.tenant_id
 -> saas_subscription.plan_id
 -> saas_plan.id
 -> saas_plan_feature.plan_id
 -> saas_feature.id
 -> saas_app.id
```

#### 跨模块依赖

```text
1. 租户管理：订阅必须归属有效租户。
4. 套餐管理：订阅必须引用有效套餐。
2. 应用管理：根据套餐功能计算应用。
3. 功能管理：根据套餐功能计算功能。
8. 登录与会话管理：登录后必须校验订阅。
18. 操作审计：订阅新增、续费、变更、取消需要审计。
19. 权限变更审计：订阅变更会影响功能边界。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                           | Method | 说明        | 读写表                                               |
| --------------------------------------------- | ------ | --------- | ------------------------------------------------- |
| `/api/saas/v1/subscriptions`                  | `POST` | 创建订阅      | 读 `saas_tenant`、`saas_plan`，写 `saas_subscription` |
| `/api/saas/v1/subscriptions`                  | `GET`  | 查询订阅      | 读 `saas_subscription`，联查租户、套餐                     |
| `/api/saas/v1/subscriptions/{id}`             | `GET`  | 订阅详情      | 读 `saas_subscription`                             |
| `/api/saas/v1/subscriptions/{id}`             | `PUT`  | 修改订阅      | 写 `saas_subscription`                             |
| `/api/saas/v1/subscriptions/{id}/renew`       | `POST` | 续费        | 更新 `end_at`                                       |
| `/api/saas/v1/subscriptions/{id}/change-plan` | `POST` | 变更套餐      | 更新 `plan_id`                                      |
| `/api/saas/v1/subscriptions/{id}/freeze`      | `POST` | 冻结订阅      | 更新 `subscription_status`                          |
| `/api/saas/v1/subscriptions/{id}/cancel`      | `POST` | 取消订阅      | 更新 `subscription_status`                          |
| `/api/saas/v1/current-tenant/apps`            | `GET`  | 当前租户可访问应用 | 联查订阅、套餐、功能、应用                                     |
| `/api/saas/v1/current-tenant/features`        | `GET`  | 当前租户可访问功能 | 联查订阅、套餐、功能、应用                                     |

#### 关键业务校验规则

租户存在：

```sql
SELECT COUNT(1)
FROM saas_tenant
WHERE id = :tenantId
  AND is_del = false;
```

套餐有效：

```sql
SELECT COUNT(1)
FROM saas_plan
WHERE id = :planId
  AND status = 'active'
  AND is_del = false;
```

`subscription_code` 唯一：

```sql
SELECT COUNT(1)
FROM saas_subscription
WHERE subscription_code = :subscriptionCode
  AND is_del = false;
```

时间边界：

```text
start_at < end_at
active/trial 状态的 end_at 必须大于当前时间
```

同一租户同一套餐不允许存在重叠的 active/trial 订阅：

```sql
SELECT COUNT(1)
FROM saas_subscription
WHERE tenant_id = :tenantId
  AND plan_id = :planId
  AND subscription_status IN ('active', 'trial')
  AND is_del = false
  AND id <> :subscriptionId
  AND start_at <= :newEndAt
  AND end_at >= :newStartAt;
```

说明：
- 允许同一租户同时订阅多个不同套餐（如同时订阅 WMS + TMS）
- 同一套餐不允许时间重叠，避免计费混乱
- 套餐变更时建议先结束旧订阅，再创建新订阅，或使用变更接口原子性处理
- 登录上下文、租户工作台和权限初始化必须按“多有效订阅”聚合计算，不允许只取单个 plan_id
- 如果多个有效套餐授予同一功能，去重后合并为一个 enabledFeatureCodes 集合

取消订阅后：

```text
subscription_status = cancelled
不可续费
不可变更套餐
```

冻结订阅后：

```text
不可访问业务应用
可续费
可取消
```

---

### 3. 前端开发规约

#### UI 交互边界控制

订阅列表字段：

```text
订阅编码
租户
套餐
订阅状态
开始时间
结束时间
是否自动续费
创建时间
操作
```

创建表单必填：

```text
tenantId
planId
subscriptionCode
subscriptionStatus
startAt
endAt
```

续费、变更套餐、冻结、取消必须二次确认。

状态使用字典：

```text
saas_subscription_status
```

#### 状态与缓存

登录后必须缓存当前订阅摘要：

```text
subscriptions: [
  {
    subscriptionId,
    subscriptionStatus,
    planId,
    planCode,
    planName,
    subscriptionStartAt,
    subscriptionEndAt
  }
]
nearestSubscriptionEndAt
planSummary
enabledAppCodes
enabledFeatureCodes
```

订阅变更后必须清理：

```text
应用入口缓存
功能缓存
菜单缓存
按钮权限缓存
```

---

# 二、组织与身份域

本域包含模块 6-10：

```text
6. 用户管理
7. 租户用户管理
8. 登录与会话管理
9. 组织架构管理
10. 岗位管理
```

---

## 6. 用户管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

用户主数据存储于 `iam_user`。

核心字段：

```text
username
password_hash
password_salt
real_name
nick_name
phone
email
avatar_url
user_type
status
last_login_at
last_login_ip
password_updated_at
remarks
```

`iam_user` 是全局用户表，不带 `tenant_id`。用户进入租户后的身份由 `iam_tenant_user` 表表达。

用户生命周期：

```text
1. 创建全局用户。
2. 用户可被绑定到一个或多个租户，形成 iam_tenant_user。
3. 用户可被禁用、锁定。
4. 用户登录成功后更新 last_login_at、last_login_ip。
5. 用户逻辑删除后不可登录、不可绑定租户。
```

#### 跨模块依赖

```text
7. 租户用户管理：用户必须通过 iam_tenant_user 才能进入租户。
8. 登录与会话管理：登录校验 iam_user。
15. 用户 / 组织 / 岗位授权：用户可作为 subject_type = user 的授权主体。
17. 登录审计：登录行为记录 audit_login_log。
18. 操作审计：用户新增、修改、禁用、删除需要审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                     | Method   | 说明    | 读写表                                                 |
| --------------------------------------- | -------- | ----- | --------------------------------------------------- |
| `/api/iam/v1/users`                     | `POST`   | 创建用户  | 写 `iam_user`                                        |
| `/api/iam/v1/users`                     | `GET`    | 用户分页  | 读 `iam_user`                                        |
| `/api/iam/v1/users/{id}`                | `GET`    | 用户详情  | 读 `iam_user`                                        |
| `/api/iam/v1/users/{id}`                | `PUT`    | 修改用户  | 写 `iam_user`                                        |
| `/api/iam/v1/users/{id}/disable`        | `POST`   | 禁用用户  | 写 `iam_user.status`                                 |
| `/api/iam/v1/users/{id}/lock`           | `POST`   | 锁定用户  | 写 `iam_user.status`                                 |
| `/api/iam/v1/users/{id}/reset-password` | `POST`   | 重置密码  | 写 `password_hash/password_salt/password_updated_at` |
| `/api/iam/v1/users/{id}`                | `DELETE` | 软删除用户 | 写 `iam_user.is_del`                                 |

#### 关键业务校验规则

`username` 唯一：

```sql
SELECT COUNT(1)
FROM iam_user
WHERE username = :username
  AND is_del = false;
```

创建用户必须校验：

```text
username 必填，长度 <= 100
password_hash 必填
real_name 长度 <= 100
phone 长度 <= 50
email 非空时必须符合邮箱格式
user_type 必填
status 默认 active
```

用户状态校验：

```text
status != active 的用户不可登录。
is_del = true 的用户不可登录、不可绑定租户。
```

删除用户前必须校验是否仍存在有效租户用户：

```sql
SELECT COUNT(1)
FROM iam_tenant_user
WHERE user_id = :userId
  AND status = 'active'
  AND is_del = false;
```

第一阶段建议存在有效租户用户时禁止删除全局用户。

当前表结构没有登录失败次数、密码策略表，因此不得实现可配置密码策略；只能在代码中执行固定密码复杂度校验。

---

### 3. 前端开发规约

#### UI 交互边界控制

用户列表字段：

```text
账号
真实姓名
昵称
手机号
邮箱
用户类型
状态
最后登录时间
最后登录 IP
创建时间
操作
```

创建 / 编辑强校验：

```text
username 必填
realName 建议必填
email 非空时校验格式
phone 长度限制
userType 必填
status 必填
```

禁用、锁定、重置密码、删除必须二次确认。

#### 状态与缓存

登录用户信息放入全局 Store：

```text
userId
username
realName
nickName
avatarUrl
userType
status
```

用户管理列表数据不建议长期缓存。

---

## 7. 租户用户管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

租户用户主数据存储于 `iam_tenant_user`。

核心字段：

```text
tenant_id
user_id
tenant_user_code
display_name
user_type
status
is_tenant_admin
joined_at
left_at
remarks
```

租户用户表示全局用户在某租户下的身份。

创建流程：

```text
1. 选择有效租户。
2. 选择已存在 iam_user，或先创建 iam_user。
3. 写入 iam_tenant_user。
4. 可继续绑定组织 iam_user_org。
5. 可继续绑定岗位 iam_user_position。
6. 可通过 iam_role_assignment 分配角色。
```

一个用户在同一租户下只能存在一条有效租户用户关系：

```text
数据库唯一约束：uk_iam_tenant_user(tenant_id, user_id)
```

#### 跨模块依赖

```text
1. 租户管理：tenant_id 必须有效。
6. 用户管理：user_id 必须有效。
9. 组织架构管理：可绑定组织。
10. 岗位管理：可绑定岗位。
15. 用户 / 组织 / 岗位授权：租户用户可作为用户授权主体。
8. 登录与会话管理：登录切换租户时依赖 iam_tenant_user。
18. 操作审计：绑定、禁用、移出租户需要审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                     | Method | 说明         | 读写表                            |
| --------------------------------------- | ------ | ---------- | ------------------------------ |
| `/api/iam/v1/tenant-users`              | `POST` | 新增租户用户     | 写 `iam_tenant_user`            |
| `/api/iam/v1/tenant-users`              | `GET`  | 租户用户分页     | 读 `iam_tenant_user`、`iam_user` |
| `/api/iam/v1/tenant-users/{id}`         | `GET`  | 租户用户详情     | 读 `iam_tenant_user`、`iam_user` |
| `/api/iam/v1/tenant-users/{id}`         | `PUT`  | 修改租户用户     | 写 `iam_tenant_user`            |
| `/api/iam/v1/tenant-users/{id}/disable` | `POST` | 禁用租户用户     | 写 `status`                     |
| `/api/iam/v1/tenant-users/{id}/leave`   | `POST` | 移出租户       | 写 `status`、`left_at`           |
| `/api/iam/v1/tenant-users/{id}/admin`   | `POST` | 设置/取消租户管理员 | 写 `is_tenant_admin`            |

#### 关键业务校验规则

租户有效：

```sql
SELECT COUNT(1)
FROM saas_tenant
WHERE id = :tenantId
  AND status IN ('active', 'trial')
  AND is_del = false;
```

用户有效：

```sql
SELECT COUNT(1)
FROM iam_user
WHERE id = :userId
  AND status = 'active'
  AND is_del = false;
```

同租户同用户唯一：

```sql
SELECT COUNT(1)
FROM iam_tenant_user
WHERE tenant_id = :tenantId
  AND user_id = :userId
  AND is_del = false;
```

状态规则：

```text
status != active 的租户用户不可进入该租户。
left_at 非空表示已离开租户，不允许登录该租户。
is_del = true 不可参与授权和登录。
```

当前表结构没有套餐配额字段，因此新增租户用户时不能比对套餐用户数上限。

---

### 3. 前端开发规约

#### UI 交互边界控制

租户用户列表字段：

```text
租户
账号
显示名称
用户类型
状态
是否租户管理员
加入时间
离开时间
操作
```

新增时必须选择：

```text
tenantId
userId
userType
displayName
```

设置租户管理员、禁用、移出租户必须二次确认。

#### 状态与缓存

当前租户用户身份必须进入全局 Store：

```text
tenantUserId
tenantId
userId
displayName
isTenantAdmin
tenantUserStatus
```

---

## 8. 登录与会话管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

会话数据存储于 `iam_session`。

核心字段：

```text
tenant_id
user_id
tenant_user_id
token_hash
refresh_token_hash
device_id
device_type
login_ip
user_agent
session_status
issued_at
expires_at
revoked_at
```

登录流程：

```text
1. 用户提交 username/password
2. 校验 iam_user 账号和密码
   - 失败：立即写入 audit_login_log（login_status = 'failure'，记录 failure_reason），返回错误
   - 成功：写入 audit_login_log（login_status = 'pending'），继续下一步
3. 查询该用户可进入的 iam_tenant_user 列表
   - 如果用户只能进入一个租户，自动选择该租户，跳到步骤5
   - 如果用户可进入多个租户，返回租户列表供用户选择
4. 用户选择租户（或通过域名/子域名定位租户）
5. 校验 saas_tenant 状态
   - 失败：更新 audit_login_log 的 login_status = 'failure' 和 failure_reason，返回错误
   - 成功：继续下一步
6. 校验 saas_subscription 有效性
   - 失败：更新 audit_login_log 的 login_status = 'failure' 和 failure_reason，返回错误
   - 成功：继续下一步
7. 创建会话：写入 iam_session（生成 token）
8. 更新登录成功信息：
   - 更新 audit_login_log 的 login_status = 'success' 和 session_id
   - 更新 iam_user.last_login_at 和 last_login_ip
9. 返回 token 和用户信息
```

关键要点：
- 审计日志在认证成功后立即写入（步骤2），状态为 'pending'
- 后续任何失败都更新该日志记录为 'failure'
- 只有全流程成功才更新为 'success'
- 确保所有登录尝试（成功或失败）都被记录

字典与数据库约束：
- `audit_login_status` 必须包含 `pending`、`success`、`failure`。
- `audit_login_log.login_status` 默认值必须为 `pending`，禁止默认 `success`。
- 如果登录在账号密码校验阶段失败且无法识别租户，`tenant_id`、`user_id`、`tenant_user_id` 可写 0。

会话失效逻辑：

```text
session_status != active
expires_at < now()
revoked_at is not null
is_del = true
```

#### 跨模块依赖

```text
1. 租户管理：登录时校验租户状态。
5. 订阅管理：登录时校验订阅有效。
6. 用户管理：认证用户账号。
7. 租户用户管理：确认用户租户身份。
17. 登录审计：登录成功/失败必须记录。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                | Method | 说明        | 读写表                                       |
| ---------------------------------- | ------ | --------- | ----------------------------------------- |
| `/api/auth/v1/login`               | `POST` | 用户登录      | 读 `iam_user`，写 `audit_login_log`          |
| `/api/auth/v1/my-tenants`          | `GET`  | 查询可进入租户   | 读 `iam_tenant_user`、`saas_tenant`         |
| `/api/auth/v1/switch-tenant`       | `POST` | 选择租户并创建会话 | 写 `iam_session`                           |
| `/api/auth/v1/current-user`        | `GET`  | 当前用户信息    | 读 `iam_user`、`iam_tenant_user`            |
| `/api/auth/v1/logout`              | `POST` | 退出登录      | 写 `iam_session.session_status/revoked_at` |
| `/api/iam/v1/sessions`             | `GET`  | 会话列表      | 读 `iam_session`                           |
| `/api/iam/v1/sessions/{id}/revoke` | `POST` | 强制下线      | 写 `iam_session`                           |

#### 关键业务校验规则

登录时校验：

```text
iam_user.username 存在
iam_user.status = active
iam_user.is_del = false
密码校验通过
```

切换租户时校验：

```text
iam_tenant_user.tenant_id = 目标租户
iam_tenant_user.user_id = 当前用户
iam_tenant_user.status = active
iam_tenant_user.left_at is null
iam_tenant_user.is_del = false
```

租户有效性：

```text
saas_tenant.status in ('active', 'trial')
saas_tenant.is_del = false
```

订阅有效性：

```text
subscription_status in ('active', 'trial')
start_at <= now()
end_at >= now()
is_del = false
```

会话创建必须保存 token 哈希，不保存明文 token。

退出登录：

```text
session_status = revoked
revoked_at = now()
```

---

### 3. 前端开发规约

#### UI 交互边界控制

登录页必填：

```text
username
password
```

多租户用户登录后必须进入租户选择页。

租户不可用时展示不可进入原因：

```text
租户冻结
租户过期
订阅过期
租户注销
```

会话管理页面展示：

```text
用户
租户
设备类型
登录 IP
会话状态
签发时间
过期时间
撤销时间
操作
```

强制下线必须二次确认。

#### 状态与缓存

Storage / Store 保存：

```text
accessToken
refreshToken
userId
tenantId
tenantUserId
sessionId
expiresAt
```

退出登录必须清理：

```text
token
租户上下文
用户信息
菜单缓存
按钮权限缓存
字典缓存可保留
```

---

## 9. 组织架构管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

组织主数据存储于 `iam_org`。

核心字段：

```text
tenant_id
parent_id
org_code
org_name
org_type
leader_tenant_user_id
path
level
sort_order
status
remarks
```

组织树通过 `parent_id` 形成。

`path` 用于保存组织路径，`level` 用于保存层级。

用户与组织关系存储于 `iam_user_org`。

#### 跨模块依赖

```text
7. 租户用户管理：组织负责人和成员均基于 tenant_user_id。
15. 用户 / 组织 / 岗位授权：组织可作为授权主体 subject_type = org。
16. 数据权限配置：dept、dept_tree 模式依赖组织树。
18. 操作审计：组织变更需要审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                             | Method   | 说明   | 读写表                                |
| ------------------------------- | -------- | ---- | ---------------------------------- |
| `/api/iam/v1/orgs`              | `POST`   | 创建组织 | 写 `iam_org`                        |
| `/api/iam/v1/orgs/tree`         | `GET`    | 组织树  | 读 `iam_org`                        |
| `/api/iam/v1/orgs/{id}`         | `GET`    | 组织详情 | 读 `iam_org`                        |
| `/api/iam/v1/orgs/{id}`         | `PUT`    | 修改组织 | 写 `iam_org`                        |
| `/api/iam/v1/orgs/{id}/enable`  | `POST`   | 启用组织 | 写 `status`                         |
| `/api/iam/v1/orgs/{id}/disable` | `POST`   | 停用组织 | 写 `status`                         |
| `/api/iam/v1/orgs/{id}`         | `DELETE` | 删除组织 | 写 `is_del`                         |
| `/api/iam/v1/orgs/{id}/members` | `GET`    | 组织成员 | 读 `iam_user_org`、`iam_tenant_user` |

#### 关键业务校验规则

同租户组织编码唯一：

```text
数据库约束：uk_iam_org_code(tenant_id, org_code)
```

父级校验：

```text
parent_id = 0 表示根组织。
parent_id != 0 时，父级必须属于同 tenant_id。
```

防循环：

```text
修改 parent_id 时，不允许挂到自己或子孙节点下。
```

负责人校验：

```text
leader_tenant_user_id > 0 时，必须存在于同 tenant_id 的 iam_tenant_user。
```

删除校验：

```sql
SELECT COUNT(1)
FROM iam_org
WHERE tenant_id = :tenantId
  AND parent_id = :orgId
  AND is_del = false;
```

存在子组织时禁止删除。

存在有效成员时禁止删除：

```sql
SELECT COUNT(1)
FROM iam_user_org
WHERE tenant_id = :tenantId
  AND org_id = :orgId
  AND status = 'active'
  AND is_del = false;
```

---

### 3. 前端开发规约

#### UI 交互边界控制

组织管理必须使用树形表格。

展示字段：

```text
组织编码
组织名称
组织类型
负责人
层级
排序
状态
操作
```

创建 / 编辑强校验：

```text
orgCode 必填
orgName 必填
orgType 必填
parentId 必填
sortOrder 整数
```

删除、停用必须二次确认。

#### 状态与缓存

组织树可在当前租户内缓存：

```text
tenantId
orgTree
```

当组织新增、修改、删除后必须刷新组织树缓存。

---

## 10. 岗位管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

岗位主数据存储于 `iam_position`。

核心字段：

```text
tenant_id
position_code
position_name
position_type
sort_order
status
remarks
```

用户与岗位关系存储于 `iam_user_position`。

岗位可作为授权主体：

```text
iam_role_assignment.subject_type = position
iam_role_assignment.subject_id = iam_position.id
```

#### 跨模块依赖

```text
7. 租户用户管理：岗位成员基于 tenant_user_id。
15. 用户 / 组织 / 岗位授权：岗位可被授予角色。
18. 操作审计：岗位新增、修改、删除、成员变更需要审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                  | Method   | 说明   | 读写表                   |
| ------------------------------------ | -------- | ---- | --------------------- |
| `/api/iam/v1/positions`              | `POST`   | 创建岗位 | 写 `iam_position`      |
| `/api/iam/v1/positions`              | `GET`    | 岗位列表 | 读 `iam_position`      |
| `/api/iam/v1/positions/{id}`         | `GET`    | 岗位详情 | 读 `iam_position`      |
| `/api/iam/v1/positions/{id}`         | `PUT`    | 修改岗位 | 写 `iam_position`      |
| `/api/iam/v1/positions/{id}/enable`  | `POST`   | 启用岗位 | 写 `status`            |
| `/api/iam/v1/positions/{id}/disable` | `POST`   | 停用岗位 | 写 `status`            |
| `/api/iam/v1/positions/{id}`         | `DELETE` | 删除岗位 | 写 `is_del`            |
| `/api/iam/v1/positions/{id}/members` | `GET`    | 岗位成员 | 读 `iam_user_position` |

#### 关键业务校验规则

同租户岗位编码唯一：

```text
数据库约束：uk_iam_position_code(tenant_id, position_code)
```

字段校验：

```text
position_code 必填，长度 <= 50
position_name 必填，长度 <= 100
position_type 必填
sort_order 整数
```

删除岗位前校验是否存在有效用户关系：

```sql
SELECT COUNT(1)
FROM iam_user_position
WHERE tenant_id = :tenantId
  AND position_id = :positionId
  AND status = 'active'
  AND is_del = false;
```

存在授权关系时禁止删除：

```sql
SELECT COUNT(1)
FROM iam_role_assignment
WHERE tenant_id = :tenantId
  AND subject_type = 'position'
  AND subject_id = :positionId
  AND is_del = false;
```

---

### 3. 前端开发规约

#### UI 交互边界控制

岗位列表字段：

```text
岗位编码
岗位名称
岗位类型
排序
状态
创建时间
操作
```

停用、删除必须二次确认。

字典：

```text
iam_position_type
common_status
```

#### 状态与缓存

岗位列表可按租户缓存。

用户编辑页需要按需加载岗位选项。

---

# 三、高阶权限与访问控制域

本域包含模块 11-16：

```text
11. 角色管理
12. 角色模板管理
13. 权限资源管理
14. 角色资源授权
15. 用户 / 组织 / 岗位授权
16. 数据权限配置
```

---

## 11. 角色管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

角色主数据存储于 `iam_role`。

核心字段：

```text
tenant_id
role_code
role_name
role_type
sort_order
status
remarks
```

角色本身不直接表达权限，权限通过：

```text
iam_role_resource
iam_role_assignment
iam_data_scope
```

表达。

#### 跨模块依赖

```text
14. 角色资源授权：角色通过 iam_role_resource 拥有资源权限。
15. 用户 / 组织 / 岗位授权：角色通过 iam_role_assignment 分配给主体。
16. 数据权限配置：角色通过 iam_data_scope 绑定数据范围。
19. 权限变更审计：角色权限变更必须审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                              | Method   | 说明   | 读写表          |
| -------------------------------- | -------- | ---- | ------------ |
| `/api/iam/v1/roles`              | `POST`   | 创建角色 | 写 `iam_role` |
| `/api/iam/v1/roles`              | `GET`    | 角色列表 | 读 `iam_role` |
| `/api/iam/v1/roles/{id}`         | `GET`    | 角色详情 | 读 `iam_role` |
| `/api/iam/v1/roles/{id}`         | `PUT`    | 修改角色 | 写 `iam_role` |
| `/api/iam/v1/roles/{id}/enable`  | `POST`   | 启用角色 | 写 `status`   |
| `/api/iam/v1/roles/{id}/disable` | `POST`   | 停用角色 | 写 `status`   |
| `/api/iam/v1/roles/{id}`         | `DELETE` | 删除角色 | 写 `is_del`   |

#### 关键业务校验规则

同租户角色编码唯一：

```text
数据库约束：uk_iam_role_code(tenant_id, role_code)
```

字段校验：

```text
role_code 必填，长度 <= 50
role_name 必填，长度 <= 100
role_type 必填
```

删除角色前校验是否存在授权：

```sql
SELECT COUNT(1)
FROM iam_role_assignment
WHERE tenant_id = :tenantId
  AND role_id = :roleId
  AND is_del = false;
```

校验是否存在资源授权：

```sql
SELECT COUNT(1)
FROM iam_role_resource
WHERE tenant_id = :tenantId
  AND role_id = :roleId
  AND is_del = false;
```

存在引用时不允许删除，需先解除授权。

---

### 3. 前端开发规约

#### UI 交互边界控制

角色列表字段：

```text
角色编码
角色名称
角色类型
状态
排序
创建时间
操作
```

删除、停用必须二次确认。

#### 状态与缓存

当前用户角色集合可由权限初始化接口返回，不由前端直接从角色管理列表推导。

---

## 12. 角色模板管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

角色模板存储于 `iam_role_template`。

核心字段：

```text
template_code
template_name
app_code
template_type
role_config
sort_order
status
remarks
```

`role_config` 为 JSONB，用于保存模板化角色配置。

角色模板不直接授权用户，只用于创建角色时参考或复制配置。

#### 跨模块依赖

```text
11. 角色管理：可基于模板创建 iam_role。
14. 角色资源授权：role_config 可包含资源授权配置。
18. 操作审计：模板新增、修改、删除需要审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                           | Method   | 说明       | 读写表                                     |
| --------------------------------------------- | -------- | -------- | --------------------------------------- |
| `/api/iam/v1/role-templates`                  | `POST`   | 创建模板     | 写 `iam_role_template`                   |
| `/api/iam/v1/role-templates`                  | `GET`    | 模板列表     | 读 `iam_role_template`                   |
| `/api/iam/v1/role-templates/{id}`             | `GET`    | 模板详情     | 读 `iam_role_template`                   |
| `/api/iam/v1/role-templates/{id}`             | `PUT`    | 修改模板     | 写 `iam_role_template`                   |
| `/api/iam/v1/role-templates/{id}`             | `DELETE` | 删除模板     | 写 `is_del`                              |
| `/api/iam/v1/role-templates/{id}/create-role` | `POST`   | 基于模板创建角色 | 读模板，写 `iam_role`，可写 `iam_role_resource` |

#### 关键业务校验规则

`template_code` 唯一：

```text
数据库约束：iam_role_template_template_code_key
```

`role_config` 必须是合法 JSON 对象。

基于模板创建角色时：

```text
1. 校验目标 tenant_id 有效。
2. 校验 role_code 在目标租户内唯一。
3. 校验模板 status = active。
4. 如果 role_config 包含资源 ID，必须校验资源在目标租户或平台级有效。
```

---

### 3. 前端开发规约

#### UI 交互边界控制

模板列表字段：

```text
模板编码
模板名称
应用编码
模板类型
状态
排序
操作
```

`role_config` 可用 JSON 编辑器或表单化配置，第一阶段建议只读展示 JSON。

#### 状态与缓存

角色模板可缓存，用于创建角色时快速选择。

---

## 13. 权限资源管理

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

权限资源存储于 `iam_resource`。

核心字段：

```text
tenant_id
app_id
parent_id
resource_code
resource_name
resource_type
route_path
component
permission_code
icon
http_method
api_path
is_visible
sort_order
status
remarks
```

资源类型可表达：

```text
应用
模块
目录
菜单
页面
按钮
API
报表
导入
导出
打印
```

树形结构由 `parent_id` 表达。

API 类型资源使用：

```text
http_method
api_path
```

前端菜单资源使用：

```text
route_path
component
icon
is_visible
```

#### 跨模块依赖

```text
2. 应用管理：资源可通过 app_id 归属应用。
14. 角色资源授权：角色通过 iam_role_resource 获得资源。
19. 权限变更审计：资源变更影响权限边界。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                  | Method   | 说明   | 读写表              |
| ------------------------------------ | -------- | ---- | ---------------- |
| `/api/iam/v1/resources`              | `POST`   | 创建资源 | 写 `iam_resource` |
| `/api/iam/v1/resources/tree`         | `GET`    | 资源树  | 读 `iam_resource` |
| `/api/iam/v1/resources/{id}`         | `GET`    | 资源详情 | 读 `iam_resource` |
| `/api/iam/v1/resources/{id}`         | `PUT`    | 修改资源 | 写 `iam_resource` |
| `/api/iam/v1/resources/{id}/enable`  | `POST`   | 启用资源 | 写 `status`       |
| `/api/iam/v1/resources/{id}/disable` | `POST`   | 停用资源 | 写 `status`       |
| `/api/iam/v1/resources/{id}`         | `DELETE` | 删除资源 | 写 `is_del`       |

#### 关键业务校验规则

同租户资源编码唯一：

```text
数据库约束：uk_iam_resource_code(tenant_id, resource_code)
```

父级校验：

```text
parent_id = 0 表示根资源。
parent_id != 0 时，父资源必须存在且 tenant_id 相同或为平台级约定资源。
```

API 类型校验：

```text
resource_type = api 时，http_method 和 api_path 必填。
```

菜单 / 页面类型校验：

```text
resource_type in ('menu', 'page') 时，route_path 必填。
```

删除前校验是否存在子资源：

```sql
SELECT COUNT(1)
FROM iam_resource
WHERE tenant_id = :tenantId
  AND parent_id = :resourceId
  AND is_del = false;
```

被角色引用时禁止删除：

```sql
SELECT COUNT(1)
FROM iam_role_resource
WHERE tenant_id = :tenantId
  AND resource_id = :resourceId
  AND is_del = false;
```

---

### 3. 前端开发规约

#### UI 交互边界控制

资源管理必须使用树形表格。

字段：

```text
资源编码
资源名称
资源类型
权限标识
路由
组件
HTTP 方法
API 路径
是否可见
排序
状态
操作
```

API 类型资源表单必须显示：

```text
httpMethod
apiPath
```

菜单类型资源表单必须显示：

```text
routePath
component
icon
isVisible
```

#### 状态与缓存

登录后后端返回的菜单树应缓存：

```text
menuTree
permissionCodes
buttonCodes
apiPermissionCodes
```

资源管理变更后，应提示重新登录或刷新权限上下文。

---

## 14. 角色资源授权

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

角色资源授权存储于 `iam_role_resource`。

核心字段：

```text
tenant_id
role_id
resource_id
actions
effect
status
remarks
```

`actions` 为 JSONB 数组，例如：

```json
["view", "create", "update", "delete", "export"]
```

角色最终可访问资源由以下链路计算：

```text
iam_role_assignment
 -> iam_role
 -> iam_role_resource
 -> iam_resource
```

#### 跨模块依赖

```text
11. 角色管理：role_id 必须有效。
13. 权限资源管理：resource_id 必须有效。
15. 用户 / 组织 / 岗位授权：只有分配给主体的角色才生效。
19. 权限变更审计：授权变更必须审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                                 | Method   | 说明       | 读写表                                  |
| --------------------------------------------------- | -------- | -------- | ------------------------------------ |
| `/api/iam/v1/roles/{roleId}/resources`              | `GET`    | 查询角色资源   | 读 `iam_role_resource`、`iam_resource` |
| `/api/iam/v1/roles/{roleId}/resources`              | `PUT`    | 保存角色资源授权 | 写 `iam_role_resource`                |
| `/api/iam/v1/roles/{roleId}/resource-tree`          | `GET`    | 角色资源树回显  | 读资源树和授权关系                            |
| `/api/iam/v1/roles/{roleId}/resources/{resourceId}` | `DELETE` | 移除单个资源授权 | 写 `is_del`                           |

#### 关键业务校验规则

角色有效：

```sql
SELECT COUNT(1)
FROM iam_role
WHERE tenant_id = :tenantId
  AND id = :roleId
  AND status = 'active'
  AND is_del = false;
```

资源有效：

```sql
SELECT COUNT(1)
FROM iam_resource
WHERE tenant_id = :tenantId
  AND id = :resourceId
  AND status = 'active'
  AND is_del = false;
```

同角色同资源唯一：

```text
数据库约束：uk_iam_role_resource(tenant_id, role_id, resource_id)
```

`actions` 必须是 JSON 数组，且元素只能来自权限动作字典。

保存授权时必须做差异更新：

```text
1. 查询当前角色已有资源授权。
2. 与请求资源集合比对。
3. 新增缺失授权。
4. 更新 actions、effect、status。
5. 移除请求中不存在的旧授权。
6. 写入 audit_permission_change_log。
```

---

### 3. 前端开发规约

#### UI 交互边界控制

角色资源授权页面必须使用资源树。

每个资源节点展示：

```text
资源名称
资源类型
权限标识
操作动作复选框
```

保存必须二次确认：

```text
修改角色资源权限会影响所有拥有该角色的用户、组织和岗位。
```

#### 状态与缓存

权限变更后，当前登录用户如果受影响，应刷新：

```text
menuTree
permissionCodes
buttonCodes
```

---

## 15. 用户 / 组织 / 岗位授权

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

授权关系存储于 `iam_role_assignment`。

核心字段：

```text
tenant_id
role_id
subject_type
subject_id
effective_start
effective_end
status
remarks
```

支持主体：

```text
subject_type = user
subject_type = org
subject_type = position
```

最终用户角色计算规则：

```text
1. 直接用户授权：
   subject_type = user
   subject_id = iam_tenant_user.id

2. 组织授权：
   用户通过 iam_user_org.org_id 匹配 subject_id

3. 岗位授权：
   用户通过 iam_user_position.position_id 匹配 subject_id
```

#### 跨模块依赖

```text
7. 租户用户管理：用户授权主体依赖 iam_tenant_user。
9. 组织架构管理：组织授权主体依赖 iam_org。
10. 岗位管理：岗位授权主体依赖 iam_position。
11. 角色管理：授权目标为 iam_role。
14. 角色资源授权：角色被分配后资源权限才对主体生效。
19. 权限变更审计：授权变更必须审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                 | Method   | 说明         | 读写表                     |
| ----------------------------------- | -------- | ---------- | ----------------------- |
| `/api/iam/v1/role-assignments`      | `POST`   | 新增授权       | 写 `iam_role_assignment` |
| `/api/iam/v1/role-assignments`      | `GET`    | 查询授权       | 读 `iam_role_assignment` |
| `/api/iam/v1/role-assignments/{id}` | `PUT`    | 修改授权有效期/状态 | 写 `iam_role_assignment` |
| `/api/iam/v1/role-assignments/{id}` | `DELETE` | 取消授权       | 写 `is_del`              |
| `/api/iam/v1/current-user/roles`    | `GET`    | 当前用户最终角色   | 联查授权、组织、岗位              |

#### 关键业务校验规则

角色有效：

```sql
SELECT COUNT(1)
FROM iam_role
WHERE tenant_id = :tenantId
  AND id = :roleId
  AND status = 'active'
  AND is_del = false;
```

主体校验：

```text
subject_type = user 时，subject_id 必须存在于 iam_tenant_user.id。
subject_type = org 时，subject_id 必须存在于 iam_org.id。
subject_type = position 时，subject_id 必须存在于 iam_position.id。
```

有效期校验：

```text
effective_start 必填
effective_end 非空时必须大于 effective_start
```

有效授权判断：

```text
status = active
effective_start <= now()
(effective_end is null OR effective_end >= now())
is_del = false
```

同主体同角色授权时间重叠校验：

```sql
-- 允许同主体同角色存在多条授权记录，但时间范围不得重叠
SELECT COUNT(1)
FROM iam_role_assignment
WHERE tenant_id = :tenantId
  AND role_id = :roleId
  AND subject_type = :subjectType
  AND subject_id = :subjectId
  AND status = 'active'
  AND is_del = false
  AND id <> :currentId
  AND (
    -- 检查时间是否重叠
    (effective_start <= :newEnd AND (effective_end IS NULL OR effective_end >= :newStart))
  );
```

授权延期场景：
- 如需延长授权有效期，直接更新现有记录的 `effective_end` 字段
- 如需提前结束授权，更新 `effective_end` 为指定日期，或将 `status` 改为 `inactive`
- 如需在授权到期后重新授权，可创建新记录（时间不重叠）

---

### 3. 前端开发规约

#### UI 交互边界控制

授权页面支持三种维度：

```text
用户授权
组织授权
岗位授权
```

授权表单必填：

```text
roleId
subjectType
subjectId
effectiveStart
```

取消授权、批量授权必须二次确认。

#### 状态与缓存

当前用户权限上下文需缓存：

```text
roleIds
permissionCodes
menuTree
buttonCodes
```

授权变更后需刷新权限上下文。

---

## 16. 数据权限配置

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

数据权限规则存储于 `iam_data_scope`。

数据权限明细存储于 `iam_data_scope_item`。

核心字段：

```text
iam_data_scope:
tenant_id
role_id
app_id
resource_type
scope_mode
field_name
include_children
status

iam_data_scope_item:
tenant_id
data_scope_id
resource_type
resource_id
resource_code
resource_name
status
```

数据权限绑定在角色上，不直接绑定用户。

数据权限计算链路：

```text
用户 -> iam_role_assignment -> iam_role -> iam_data_scope -> iam_data_scope_item
```

`scope_mode` 决定规则类型：

```text
all：全部数据
dept_tree：当前用户所属组织及其子孙组织的数据
dept：当前用户所属组织的数据（不含子组织）
self：仅当前用户创建的数据
custom：自定义资源范围，读取 iam_data_scope_item
```

**数据权限类型边界：**

数据权限分为两类，禁止混用。

A. 组织归属型数据权限：

当 `scope_mode = 'dept'` 或 `scope_mode = 'dept_tree'` 时，仅适用于业务表中保存组织归属的字段。

```text
允许使用的 field_name 示例：
created_org_id
owner_org_id
dept_id
operation_org_id
```

计算规则：
1. 查询当前用户在 `iam_user_org` 中的所有关联组织（status = 'active' 且 is_del = false）。
2. 取所有关联组织的并集作为用户部门范围。
3. 如果 `scope_mode = 'dept_tree'` 且 `include_children = true`，则根据 `iam_org.path` 递归包含所有子孙组织。
4. 最终生成过滤条件：`WHERE {field_name} IN (org_id_list)`。

B. 业务资源型数据权限：

当数据权限字段为业务资源字段时，必须使用 `scope_mode = 'custom'`，并通过 `iam_data_scope_item` 保存资源明细。

```text
业务资源字段示例：
yard_id
warehouse_id
fleet_id
line_id
customer_id
owner_id
```

业务资源型过滤条件：

```sql
WHERE {field_name} IN (:resourceIdsFromDataScopeItem)
```

禁止规则：

```text
禁止将 scope_mode = 'dept' / 'dept_tree' 与 yard_id、warehouse_id、fleet_id、customer_id、owner_id 等业务资源字段直接组合。
例如：yard_id IN (org_id_list) 是错误逻辑。
```

#### 跨模块依赖

```text
11. 角色管理：数据权限归属于角色。
15. 用户 / 组织 / 岗位授权：用户通过角色获得数据权限。
9. 组织架构管理：dept、dept_tree 依赖组织关系。
18. 操作审计：数据权限修改需要审计。
19. 权限变更审计：数据权限变更必须记录。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                    | Method   | 说明          | 读写表                                      |
| -------------------------------------- | -------- | ----------- | ---------------------------------------- |
| `/api/iam/v1/data-scopes`              | `POST`   | 创建数据权限      | 写 `iam_data_scope`                       |
| `/api/iam/v1/data-scopes`              | `GET`    | 查询数据权限      | 读 `iam_data_scope`                       |
| `/api/iam/v1/data-scopes/{id}`         | `GET`    | 数据权限详情      | 读 `iam_data_scope`、`iam_data_scope_item` |
| `/api/iam/v1/data-scopes/{id}`         | `PUT`    | 修改数据权限      | 写规则和明细                                   |
| `/api/iam/v1/data-scopes/{id}`         | `DELETE` | 删除数据权限      | 写 `is_del`                               |
| `/api/iam/v1/current-user/data-scopes` | `GET`    | 当前用户数据权限上下文 | 联查角色和数据权限                                |

#### 关键业务校验规则

角色有效：

```sql
SELECT COUNT(1)
FROM iam_role
WHERE tenant_id = :tenantId
  AND id = :roleId
  AND status = 'active'
  AND is_del = false;
```

`scope_mode = custom` 时，必须至少存在一条有效 `iam_data_scope_item`。

`scope_mode != custom` 时，不要求明细项。

`field_name` 必须非空，用于 ORM 或查询层拼接过滤条件。

组织归属型字段示例：

```text
created_org_id
owner_org_id
dept_id
operation_org_id
```

业务资源型字段示例：

```text
yard_id
warehouse_id
fleet_id
line_id
customer_id
owner_id
```

校验规则：
- `scope_mode in ('dept', 'dept_tree')` 时，`field_name` 必须是组织归属型字段。
- `scope_mode = 'custom'` 时，`field_name` 可以是业务资源型字段，并且必须配置 `iam_data_scope_item`。

`resource_type` 与 `iam_data_scope_item.resource_type` 必须一致。

更新数据权限时必须执行整体替换或差异更新，并写入 `audit_permission_change_log`。

---

### 3. 前端开发规约

#### UI 交互边界控制

数据权限配置页面字段：

```text
角色
应用
资源类型
范围模式
字段名
是否包含下级
资源明细
状态
```

当选择 `scope_mode = custom` 时，必须展示资源选择器，并写入 `iam_data_scope_item`。

当选择 `scope_mode = dept` 或 `scope_mode = dept_tree` 时：

```text
1. 只能选择组织归属型 field_name。
2. 隐藏业务资源选择器。
3. dept_tree 可配置 include_children。
```

当选择 `scope_mode = all` 或 `scope_mode = self` 时隐藏资源明细。

保存必须二次确认：

```text
修改数据权限会影响该角色下所有用户的数据可见范围。
```

#### 状态与缓存

当前用户数据权限上下文可缓存：

```text
roleId
appId
resourceType
scopeMode
fieldName
resourceIds
includeChildren
```

角色、组织、岗位、数据权限变更后必须刷新。

---

# 四、安全与审计域

本域包含模块 17-20：

```text
17. 登录审计
18. 操作审计
19. 权限变更审计
20. 数据导出审计
```

---

## 17. 登录审计

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

登录审计存储于 `audit_login_log`。

核心字段：

```text
tenant_id
user_id
tenant_user_id
username
login_type
login_status
login_ip
user_agent
device_type
failure_reason
login_at
logout_at
session_id
remarks
```

登录审计必须覆盖 `pending`、`success`、`failure` 三种状态。

退出登录时可更新对应记录的 `logout_at`。

#### 跨模块依赖

```text
6. 用户管理：记录 user_id、username。
7. 租户用户管理：记录 tenant_user_id。
8. 登录与会话管理：记录 session_id。
1. 租户管理：记录 tenant_id。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                             | Method | 说明     | 读写表                 |
| ------------------------------- | ------ | ------ | ------------------- |
| `/api/audit/v1/login-logs`      | `GET`  | 登录日志查询 | 读 `audit_login_log` |
| `/api/audit/v1/login-logs/{id}` | `GET`  | 登录日志详情 | 读 `audit_login_log` |

写入由登录接口内部完成，不单独提供手工新增 API。

#### 关键业务校验规则

查询必须按租户隔离：

```sql
tenant_id = :currentTenantId
AND is_del = false
```

平台管理员查询可按 tenant_id 过滤。

登录待完成时：

```text
login_status = pending
session_id = 0
failure_reason = 空字符串
```

登录失败时：

```text
user_id 可为 0
tenant_user_id 可为 0
failure_reason 必须写入
login_status = failure
```

登录成功时：

```text
login_status = success
session_id 必须写入
```

---

### 3. 前端开发规约

#### UI 交互边界控制

列表字段：

```text
租户
用户
账号
登录类型
登录状态
IP
设备类型
登录时间
退出时间
失败原因
```

失败原因字段可折叠展示。

不提供新增、编辑、删除按钮。

#### 状态与缓存

审计日志不进入全局 Store，仅列表查询缓存。

---

## 18. 操作审计

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

操作审计存储于 `audit_operation_log`。

核心字段：

```text
tenant_id
user_id
tenant_user_id
app_code
module_code
operation_type
operation_name
resource_type
resource_id
request_method
request_path
request_param
response_status
success
error_message
operation_ip
user_agent
operation_at
duration_ms
remarks
```

业务新增、修改、删除、启停、导出、审批等操作必须写入。

#### 跨模块依赖

所有 1-16 模块均依赖操作审计。

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                 | Method | 说明     | 读写表                     |
| ----------------------------------- | ------ | ------ | ----------------------- |
| `/api/audit/v1/operation-logs`      | `GET`  | 操作日志查询 | 读 `audit_operation_log` |
| `/api/audit/v1/operation-logs/{id}` | `GET`  | 操作日志详情 | 读 `audit_operation_log` |

写入由业务接口、拦截器或切面完成。

#### 关键业务校验规则

必须记录的操作：

```text
租户创建、修改、冻结、解冻、注销、删除
应用创建、修改、启停、删除
功能创建、修改、启停、删除
套餐创建、修改、功能配置、启停、删除
订阅创建、续费、变更、冻结、取消、删除
用户创建、修改、禁用、锁定、重置密码、删除
组织、岗位、角色、资源、授权、数据权限变更
```

`request_param` 必须脱敏后写入，至少不得保存明文密码。

租户级操作必须写 `tenant_id`。

平台级操作可写 `tenant_id = 0`。

---

### 3. 前端开发规约

#### UI 交互边界控制

列表字段：

```text
租户
用户
应用
模块
操作类型
操作名称
资源类型
资源 ID
请求方式
请求路径
是否成功
状态码
操作 IP
耗时
操作时间
```

详情页展示：

```text
request_param
error_message
user_agent
remarks
```

不提供编辑和删除。

#### 状态与缓存

不放入全局 Store。

---

## 19. 权限变更审计

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

权限变更审计存储于 `audit_permission_change_log`。

核心字段：

```text
tenant_id
operator_user_id
target_type
target_id
change_type
before_data
after_data
change_reason
operation_ip
operation_at
remarks
```

用于记录权限边界变化，包括：

```text
角色资源授权变化
角色分配变化
API 资源权限变化
数据权限变化
套餐功能变化
订阅套餐变化
租户状态变化
```

#### 跨模块依赖

```text
4. 套餐管理
5. 订阅管理
11. 角色管理
12. 角色模板管理
13. 权限资源管理
14. 角色资源授权
15. 用户 / 组织 / 岗位授权
16. 数据权限配置
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                         | Method | 说明       | 读写表                             |
| ------------------------------------------- | ------ | -------- | ------------------------------- |
| `/api/audit/v1/permission-change-logs`      | `GET`  | 权限变更日志查询 | 读 `audit_permission_change_log` |
| `/api/audit/v1/permission-change-logs/{id}` | `GET`  | 权限变更详情   | 读 `audit_permission_change_log` |

写入由权限变更类业务接口完成。

#### 关键业务校验规则

以下操作必须写入：

```text
套餐功能配置变化
订阅套餐变化
角色资源授权变化
角色授权主体变化
资源 API 资源权限变化
数据权限配置变化
租户冻结、解冻、注销
```

写入规范：

```text
before_data：变更前 JSON
after_data：变更后 JSON
target_type：role/resource/data_scope/subscription/tenant/plan 等
target_id：被变更对象 ID
change_type：create/update/delete/grant/revoke/enable/disable
```

`before_data` 与 `after_data` 必须包含足以回溯变更的核心字段。

---

### 3. 前端开发规约

#### UI 交互边界控制

列表字段：

```text
租户
操作人
变更对象类型
变更对象 ID
变更类型
变更原因
操作 IP
操作时间
```

详情页展示 JSON 差异：

```text
before_data
after_data
```

不提供新增、编辑、删除。

#### 状态与缓存

不放入全局 Store。

权限变更完成后，前端应刷新权限上下文。

---

## 20. 数据导出审计

### 1. 核心业务与数据流转逻辑

#### 业务生命周期

数据导出审计存储于 `audit_data_export_log`。

核心字段：

```text
tenant_id
user_id
tenant_user_id
app_code
export_type
export_name
resource_type
export_scope
file_name
file_url
row_count
export_status
failure_reason
request_param
exported_at
remarks
```

所有导出动作必须写入该表。

导出成功：

```text
export_status = success
file_name 非空
row_count >= 0
```

导出失败：

```text
export_status = failure
failure_reason 必填
```

#### 跨模块依赖

```text
6. 用户管理：记录 user_id。
7. 租户用户管理：记录 tenant_user_id。
13. 权限资源管理：导出功能应作为资源权限控制。
14. 角色资源授权：用户必须拥有 export 动作或导出资源权限。
18. 操作审计：导出也可同时写操作审计。
```

---

### 2. 后端开发规约

#### 核心 API 定义

| API                                   | Method | 说明     | 读写表                       |
| ------------------------------------- | ------ | ------ | ------------------------- |
| `/api/audit/v1/data-export-logs`      | `GET`  | 导出日志查询 | 读 `audit_data_export_log` |
| `/api/audit/v1/data-export-logs/{id}` | `GET`  | 导出日志详情 | 读 `audit_data_export_log` |

写入由各模块导出接口完成，不提供手工新增。

#### 关键业务校验规则

导出前必须校验：

```text
1. 当前用户已登录。
2. tenant_id 有效。
3. 用户拥有对应导出权限。
4. 数据查询必须应用 tenant_id 隔离。
5. 如配置数据权限，必须应用 iam_data_scope。
```

写入字段要求：

```text
export_type 必填
export_name 必填
resource_type 必填
request_param 必须脱敏
row_count 必须 >= 0
```

导出失败也必须写日志。

---

### 3. 前端开发规约

#### UI 交互边界控制

导出日志列表字段：

```text
租户
用户
应用
导出类型
导出名称
资源类型
导出范围
文件名
导出行数
导出状态
导出时间
失败原因
```

导出按钮必须使用权限控制：

```text
permission_code 包含 export 或资源 actions 包含 export
```

导出操作需二次确认，尤其是客户、订单、库存、运输数据导出。

#### 状态与缓存

导出日志不进入全局 Store。

导出任务完成后可刷新导出日志列表。

---

# 五、全局联查与权限计算规则

## 5.1 当前租户可访问应用计算

```sql
SELECT DISTINCT a.*
FROM saas_subscription s
JOIN saas_plan p ON s.plan_id = p.id
JOIN saas_plan_feature pf ON p.id = pf.plan_id
JOIN saas_feature f ON pf.feature_id = f.id
JOIN saas_app a ON f.app_id = a.id
WHERE s.tenant_id = :tenantId
  AND s.subscription_status IN ('active', 'trial')
  AND s.start_at <= now()
  AND s.end_at >= now()
  AND s.is_del = false
  AND p.status = 'active'
  AND p.is_del = false
  AND pf.status = 'active'
  AND pf.grant_type = 'included'
  AND pf.is_del = false
  AND f.status = 'active'
  AND f.is_visible = true
  AND f.is_del = false
  AND a.status = 'active'
  AND a.is_del = false
ORDER BY a.sort_order ASC;
```

---

## 5.2 当前租户可访问功能计算

当前租户可访问功能必须支持 `saas_plan_feature.feature_id` 绑定 `feature` 或 `module` 两种情况。

当绑定 `feature` 时，直接授权该功能点。

当绑定 `module` 时，必须递归展开其所有子孙功能点，并仅返回：

```text
feature_type = 'feature'
status = 'active'
is_visible = true
is_del = false
```

推荐 SQL：

```sql
WITH active_subscriptions AS (
    SELECT DISTINCT s.plan_id
    FROM saas_subscription s
    JOIN saas_plan p ON s.plan_id = p.id
    WHERE s.tenant_id = :tenantId
      AND s.subscription_status IN ('active', 'trial')
      AND s.start_at <= now()
      AND s.end_at >= now()
      AND s.is_del = false
      AND p.status = 'active'
      AND p.is_del = false
),
granted_roots AS (
    SELECT DISTINCT f.*
    FROM saas_plan_feature pf
    JOIN active_subscriptions s ON pf.plan_id = s.plan_id
    JOIN saas_feature f ON pf.feature_id = f.id
    JOIN saas_app a ON f.app_id = a.id
    WHERE pf.status = 'active'
      AND pf.grant_type = 'included'
      AND pf.is_del = false
      AND f.status = 'active'
      AND f.is_del = false
      AND a.status = 'active'
      AND a.is_del = false
),
feature_tree AS (
    SELECT *
    FROM granted_roots

    UNION ALL

    SELECT child.*
    FROM saas_feature child
    JOIN feature_tree parent ON child.parent_id = parent.id
    WHERE parent.feature_type = 'module'
      AND child.status = 'active'
      AND child.is_del = false
)
SELECT DISTINCT f.*
FROM feature_tree f
JOIN saas_app a ON f.app_id = a.id
WHERE f.feature_type = 'feature'
  AND f.is_visible = true
  AND f.status = 'active'
  AND f.is_del = false
  AND a.status = 'active'
  AND a.is_del = false
ORDER BY f.sort_order ASC;
```

商业边界：

```text
1. module 绑定会动态包含该模块下 active + visible 的功能点。
2. 新增增值功能时，不得直接默认启用进入既有套餐边界。
3. 新增高价值功能应先创建为 inactive 或 invisible，经套餐确认后再启用。
4. 如果套餐需要强边界控制，应使用 feature 级精确绑定。
```

---

## 5.3 当前用户最终角色计算

当前用户角色来源三类：

```text
1. 用户直接授权
2. 用户所属组织授权
3. 用户所属岗位授权
```

用户直接授权：

```sql
SELECT role_id
FROM iam_role_assignment
WHERE tenant_id = :tenantId
  AND subject_type = 'user'
  AND subject_id = :tenantUserId
  AND status = 'active'
  AND effective_start <= now()
  AND (effective_end IS NULL OR effective_end >= now())
  AND is_del = false;
```

组织授权：

```sql
SELECT ra.role_id
FROM iam_user_org uo
JOIN iam_role_assignment ra
  ON ra.subject_type = 'org'
 AND ra.subject_id = uo.org_id
WHERE uo.tenant_id = :tenantId
  AND uo.tenant_user_id = :tenantUserId
  AND uo.status = 'active'
  AND uo.is_del = false
  AND ra.status = 'active'
  AND ra.effective_start <= now()
  AND (ra.effective_end IS NULL OR ra.effective_end >= now())
  AND ra.is_del = false;
```

岗位授权：

```sql
SELECT ra.role_id
FROM iam_user_position up
JOIN iam_role_assignment ra
  ON ra.subject_type = 'position'
 AND ra.subject_id = up.position_id
WHERE up.tenant_id = :tenantId
  AND up.tenant_user_id = :tenantUserId
  AND up.status = 'active'
  AND up.is_del = false
  AND ra.status = 'active'
  AND ra.effective_start <= now()
  AND (ra.effective_end IS NULL OR ra.effective_end >= now())
  AND ra.is_del = false;
```

---

## 5.4 当前用户权限资源计算

```sql
SELECT DISTINCT r.*
FROM iam_role_resource rr
JOIN iam_resource r ON rr.resource_id = r.id
WHERE rr.tenant_id = :tenantId
  AND rr.role_id IN (:roleIds)
  AND rr.status = 'active'
  AND rr.effect = 'allow'
  AND rr.is_del = false
  AND r.status = 'active'
  AND r.is_del = false
ORDER BY r.sort_order ASC;
```

---

## 5.5 当前用户数据权限计算

```sql
SELECT ds.*
FROM iam_data_scope ds
WHERE ds.tenant_id = :tenantId
  AND ds.role_id IN (:roleIds)
  AND ds.status = 'active'
  AND ds.is_del = false;
```

当 `scope_mode = custom` 时：

```sql
SELECT dsi.*
FROM iam_data_scope_item dsi
WHERE dsi.tenant_id = :tenantId
  AND dsi.data_scope_id = :dataScopeId
  AND dsi.status = 'active'
  AND dsi.is_del = false;
```

---

# 六、前端全局 Store 最小字段

## 6.1 Auth Store

```text
accessToken
refreshToken
sessionId
userId
username
realName
avatarUrl
tenantId
tenantUserId
tenantCode
tenantName
tenantStatus
subscriptions
nearestSubscriptionEndAt
planSummary
```

## 6.2 Permission Store

```text
enabledAppCodes
enabledFeatureCodes
permissionCodes
buttonCodes
menuTree
apiPermissions
```

## 6.3 Data Scope Store

```text
roleIds
dataScopes
resourceType
scopeMode
fieldName
resourceIds
includeChildren
```

---

# 七、交付边界

研发团队按本文档实现时，必须确保：

```text
1. 所有接口按 is_del = false 过滤。
2. 所有租户级接口按 tenant_id 过滤。
3. 所有状态流转必须校验 status。
4. 所有权限变化必须写 audit_permission_change_log。
5. 所有关键业务操作必须写 audit_operation_log。
6. 登录成功和失败必须写 audit_login_log。
7. 所有导出必须写 audit_data_export_log。
8. 前端按钮、菜单、路由必须由后端权限结果驱动。
9. 数据权限必须基于 iam_data_scope 和 iam_data_scope_item，不允许写死用户角色。
10. 不得实现当前表结构无法支撑的配额、账单、支付、MFA、外部身份源、字段级动态权限。
```
