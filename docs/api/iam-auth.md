# IAM 认证接口契约

## 地址分层

后端地址按三层管理，业务页面不得拼接或硬编码完整 URL：

| 层级             | 当前值                               | 归属                                                                       |
| ---------------- | ------------------------------------ | -------------------------------------------------------------------------- |
| 后端 Host        | `https://localhost:7112`（本地开发） | `.env.development.local` 的 `DEV_API_TARGET`；部署环境由环境变量或网关配置 |
| IAM 服务基础路径 | `/iam-admin`                         | `src/shared/api/backendServices.ts`                                        |
| 登录操作路径     | `/Auth/Login`                        | `src/features/iam/login/api/loginApi.ts`                                   |

浏览器开发环境统一请求 `/api`，Vite 将 `/api` 去除后代理到本地后端 Host。因此登录请求实际转发为 `https://localhost:7112/iam-admin/Auth/Login`。未来接入 TMS 时，只在服务基础路径登记表中增加经后端确认的 TMS 前缀，具体操作路径仍归对应 Feature。

## Login

- 方法：`POST`
- 完整后端路径：`/iam-admin/Auth/Login`
- 认证：匿名（后端 Action 标记 `AllowAnonymous`）
- `Accept`：`text/plain`
- `Content-Type`：`application/json-patch+json`

请求：

```json
{
  "user_name": "string",
  "password": "string",
  "device_id": "string",
  "device_type": "web",
  "request_id": "string"
}
```

成功响应使用平台统一响应包装，成功码为 `1`：

```json
{
  "status": "success",
  "code": 1,
  "message": "",
  "data": {
    "token": "string",
    "login_state": "AUTHENTICATED",
    "session_id": 1,
    "session_version": "63924670932147368",
    "expires_at": "2026-09-04T10:00:00Z",
    "user_version": "63924670932147368",
    "current_tenant": null,
    "available_tenants": []
  }
}
```

`current_tenant` 与 `available_tenants` 中的租户字段为：`tenant_id`、`tenant_user_id`、`tenant_code`、`tenant_name`、`tenant_type`、`logo_url`、`timezone`、`is_default`。

`session_version` 与 `user_version` 是后端返回的并发版本令牌，前端统一按不透明字符串保存和原样提交，禁止转换为 JavaScript `number`。

## 登录状态

| `login_state`                      | 登录页处理                                                    |
| ---------------------------------- | ------------------------------------------------------------- |
| `AUTHENTICATED`                    | 保存 Token 和基础会话信息，进入安全的站内回跳地址或平台工作台 |
| `TENANT_SELECTION_REQUIRED`        | 保存受限会话，提示进入租户选择；租户选择页面与接口单独接入    |
| `INITIAL_PASSWORD_CHANGE_REQUIRED` | 保存受限欢迎会话并进入平台欢迎页；改密页面与接口暂不开发      |
| 未识别状态                         | 不进入登录后页面，提示联系管理员                              |

## 权限与安全边界

- 登录接口允许匿名访问；其他业务接口仍由后端 JWT 与接口权限校验负责最终授权。
- 初始密码受限欢迎会话仅允许访问 `/platform/dashboard` 的本地欢迎内容；前端不调用模块、菜单、用户资料及 Dashboard 接口，其他登录后业务路由统一回到欢迎页。
- 除登录等显式声明 `authMode: 'none'` 的匿名接口外，统一 HTTP Client 默认要求 Token，并自动写入 `Authorization: Bearer <token>`；缺少 Token 时直接阻止请求。
- 登录失败始终展示通用文案，不区分账号不存在、停用或密码错误。
- 密码不会写入 URL、日志或持久存储；失败后保留账号并清空密码。
- “记住我”关闭时 Token 存入 `sessionStorage`，开启时存入 `localStorage`。后续若后端改为 HttpOnly Cookie，应由统一会话层替换，Feature 调用方式不变。
- Login 响应不包含前端权限清单；权限目录加载属于后续 IAM 会话上下文接口，不在本接口中推断。

## 权威来源

- 用户提供的 Login curl（当前会话）。
- 后端 DTO：`SS.Express.Platform/Src/RPC/Contracts/IAM/LoginResponse.cs`。
- 后端 Action：`SS.Express.Platform/Src/IAM/Admin.Api/Controllers/AuthController.cs`。
- 后端 JSON 序列化：Snake Case Lower；成功响应统一包装 `status/code/message/data`。
