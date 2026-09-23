# DMS 文件接入

## 权威输入

- 用户提供的 `dms-api-documentation.md`（2026-09-16）。
- 文档未导出 Upload 入参，已核对后端 `Src/DMS/SS.EXP.DMS.API/Models/FileUploadRequest.cs`。
- 用户确认 IAM 将增加 `logo_file_id`、`avatar_file_id`；集团、Tenant、用户信息接口直接返回可展示的 `logo_url`、`avatar_url`，这些图片不再调用 DMS `GetAccessUrl`。

## 接口与封装

| 接口 | 请求 | 用途 |
| --- | --- | --- |
| POST /dms/File/Upload | multipart：file、source_app_id、source_app_code；可选 file_category、idempotency_key、expected_md5、expected_sha256 | 上传；只保存返回的 file_id |
| POST /dms/File/GetAccessUrl | file_id、purpose（preview/download） | 临时预览或下载链接；expires_at 为有效期 |
| POST /dms/File/ValidateVideo | file_id | 校验可用视频，返回服务端时长 |

API 位于 `src/features/dms/files/api`，公开入口为 `public.ts`。上传继续使用统一 HTTP 客户端、Bearer Token、错误处理、X-Request-ID；FormData 的 Content-Type/boundary 由浏览器生成。

`AppLayout` 根据授权的当前 App 提供上传来源 ID/code，不硬编码 IAM ID，也不额外请求 CurrentApps。Tenant 来自服务端登录上下文，前端不在上传请求中指定 Tenant。

`DEV_DMS_FILE_API_TARGET` 配置独立 DMS 开发 Host（后端 launchSettings 当前 HTTPS 7225），`/api/dms` 比通用 `/api` 代理优先。生产统一网关需转发 `/dms`。`VITE_API_UPLOAD_TIMEOUT_MS` 默认 600000；普通接口仍为 15000。

## 页面绑定

| 场景 | 保存位置 |
| --- | --- |
| 集团编辑 Logo | Group/Update.logo_file_id |
| Tenant 新建/编辑 Logo | Tenant/Create、Tenant/Update.logo_file_id |
| Tenant 新建首名管理员头像 | initial_admin.new_user.avatar_file_id |
| 用户编辑头像 | Membership/UpdateUser.avatar_file_id |
| 成员创建时新用户头像 | new_user.avatar_file_id |
| 课程视频 | 公共上传链路支持 VIDEO 与 ValidateVideo；课程仍无 Production Binding，Candidate 不连接真实服务 |

上传完成后清空对应旧 URL，并使用本地选中文件预览；保存仍提交文件 ID，不提交图片展示链接。有文件 ID 的记录再次保存时也不回写展示 URL。清除图片提交空 file_id/URL，未替换且无文件 ID 的历史 URL 保持兼容。

集团、Tenant、用户的查询/更新响应负责返回图片 URL；详情、编辑回显及框架头像直接使用这些 URL，不调用 `GetAccessUrl`，也不依据文件 ID 自动取链或续签。URL 为空时使用原有占位；重新查询业务信息时同步替换 URL。DMS 的通用取链 API 仍保留供其他文件预览/下载场景使用。

## 边界与联调

- DMS 当前上传归属来自当前 Tenant。集团品牌、全局用户头像和跨 Tenant 管理场景的引用校验与图片 URL 可见性由 IAM 后端负责，前端不扩大权限或伪造 Tenant。
- 新建 Tenant 时文件是在当前登录 Tenant 上传的。后端保存引用时需明确其归属/后续读取规则，否则切换到新 Tenant 后无法读取 Logo。
- 网络不确定结果人工重试复用幂等键；服务端明确同键任务失败时，移除后重新选择文件生成新任务。没有删除文件接口，移除只是放弃业务引用，不声称删除 OSS 文件。
- 课程真实 CRUD、生产路由、权限编码不属于本次文件服务接入；不能把原型模拟保存当作真实课程保存。
- 验证使用模拟 API，不上传用户文件到真实 OSS；真实证书、服务可达性、IAM 新字段及跨 Tenant 引用需与后端联调。

## 测试

`tests/visual/dms-upload.spec.ts` 覆盖 multipart/Token/幂等重试、视频校验、IAM 文件 ID 保存、失败阻断、IAM 图片 URL 直接展示且不调用 GetAccessUrl、Preview 隔离。运行 `pnpm quality`；不重录现有审批基线。
