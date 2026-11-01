# DMS 文件接入

## 权威输入

- 用户提供的 `dms-api-documentation.md`（2026-09-16）。
- 最新同步视频增量：`D:/project/SS.Express.Platform/Doc/Engineering/dms-synchronous-video-upload.md`（2026-10-23），并核对 RPC Contracts 的 FileUploadResponse/FileAccessResponse；本章节增量取代旧缩略图建议，不执行附件中的构建或部署命令。
- 文档未导出 Upload 入参，已核对后端 `Src/DMS/SS.EXP.DMS.API/Models/FileUploadRequest.cs`。
- 用户确认 IAM 将增加 `logo_file_id`、`avatar_file_id`；集团、Tenant、用户信息接口直接返回可展示的 `logo_url`、`avatar_url`，这些图片不再调用 DMS `GetAccessUrl`。

## 接口与封装

| 接口                         | 请求                                                                                                                | 用途                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| POST /dms/File/Upload        | multipart：file、source_app_id、source_app_code；可选 file_category、idempotency_key、expected_md5、expected_sha256 | 上传；只保存返回的 file_id              |
| POST /dms/File/GetAccessUrl  | file_id、purpose（preview/download）                                                                                | 临时预览或下载链接；expires_at 为有效期 |
| POST /dms/File/ValidateVideo | file_id                                                                                                             | 校验可用视频，返回服务端时长            |

API 位于 `src/features/dms/files/api`，公开入口为 `public.ts`。上传继续使用统一 HTTP 客户端、Bearer Token、错误处理、X-Request-ID；FormData 的 Content-Type/boundary 由浏览器生成。

`AppLayout` 根据授权的当前 App 提供上传来源 ID/code，不硬编码 IAM ID，也不额外请求 CurrentApps。Tenant 来自服务端登录上下文，前端不在上传请求中指定 Tenant。

来源 `source_app_id` 按 Int64 十进制字符串无损校验并写入 multipart，兼容旧接口的安全整数；不能用 `Number.isSafeInteger` 直接判断字符串，也不能转为 Number。零、负数、非法格式、超出 Int64 及已失真的不安全数值仍在请求前拒绝。该规则统一覆盖集团/Tenant Logo、管理员/用户头像及其他共用上传入口；上传或校验未成功仍保留提交保护。

`DEV_DMS_FILE_API_TARGET` 配置独立 DMS 开发 Host（后端 launchSettings 当前 HTTPS 7225），`/api/dms` 比通用 `/api` 代理优先。生产统一网关需转发 `/dms`。`VITE_API_UPLOAD_TIMEOUT_MS` 默认 600000；普通接口仍为 15000。

## 页面绑定

| 场景                      | 保存位置                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 集团编辑 Logo             | Group/Update.logo_file_id                                                                                                  |
| Tenant 新建/编辑 Logo     | Tenant/Create、Tenant/Update.logo_file_id                                                                                  |
| Tenant 新建首名管理员头像 | initial_admin.new_user.avatar_file_id                                                                                      |
| 用户编辑头像              | Membership/UpdateUser.avatar_file_id                                                                                       |
| 成员创建时新用户头像      | new_user.avatar_file_id                                                                                                    |
| 课程视频                  | 课程生产页已对接 VIDEO 上传/ValidateVideo；创建编辑保存 video_file_id，详情预览按需 GetAccessUrl；Candidate 不连接真实服务 |

上传完成后清空对应旧 URL，并使用本地选中文件预览；保存仍提交文件 ID，不提交图片展示链接。有文件 ID 的记录再次保存时也不回写展示 URL。清除图片提交空 file_id/URL，未替换且无文件 ID 的历史 URL 保持兼容。

集团、Tenant、用户的查询/更新响应负责返回图片 URL；详情、编辑回显及框架头像直接使用这些 URL，不调用 `GetAccessUrl`，也不依据文件 ID 自动取链或续签。URL 为空时使用原有占位；重新查询业务信息时同步替换 URL。DMS 的通用取链 API 仍保留供其他文件预览/下载场景使用。

## 边界与联调

- DMS 当前上传归属来自当前 Tenant。集团品牌、全局用户头像和跨 Tenant 管理场景的引用校验与图片 URL 可见性由 IAM 后端负责，前端不扩大权限或伪造 Tenant。
- 新建 Tenant 时文件是在当前登录 Tenant 上传的。后端保存引用时需明确其归属/后续读取规则，否则切换到新 Tenant 后无法读取 Logo。
- 网络不确定结果人工重试复用幂等键；服务端明确同键任务失败时，移除后重新选择文件生成新任务。没有删除文件接口，移除只是放弃业务引用，不声称删除 OSS 文件。
- 初次文件接入未包含课程 CRUD；现已由培训正式 Binding 接入，详见 training-content-exam-api.md。不能把原型模拟保存当作真实课程保存。
- 验证使用模拟 API，不上传用户文件到真实 OSS；真实证书、服务可达性、IAM 新字段及跨 Tenant 引用需与后端联调。

## 测试

`tests/visual/dms-file-upload.spec.ts` 覆盖 multipart/Token/幂等重试、视频校验、IAM 文件 ID 保存、失败阻断、IAM 图片 URL 直接展示且不调用 GetAccessUrl、Preview 隔离。运行 `pnpm quality`；不重录现有审批基线。

### 来源 App ID 兼容性（2026-10-21）

已复核 `fileApi.ts` 的改动仅为本地来源 App ID 校验与无损 multipart 编码，`fileTransferGateway.ts` 仅扩大静态 ID 类型以承接正式字符串响应；三个 DMS Endpoint、Method、幂等键、重试、Token、scope 与 AVAILABLE/视频校验均不变。全部通信候选的身份、表达式及分类未变，Permission 模板不变。注入依赖的证据据此重新绑定，不代表数据库维护或新增授权。

回归包含集团/Tenant/用户原图的连续删除替换、上传中禁用与完成后恢复保存、正确新文件 ID 提交，以及 Tenant 创建 Logo、首名管理员头像、新建成员头像；来源覆盖字符串 ID、安全整数及 Int64 最大值，不合法值不发送请求。使用本地模拟接口，不向真实 DMS/OSS 上传或修改集团、Tenant、用户记录。

## 课程详情视频预览（2026-10-22）

- 正式详情打开后自动调用 GetAccessUrl，body 为 `{file_id, purpose:'preview'}`；不传 Tenant、Bucket、TTL，不在列表批量签发。失败可点击“重新加载视频”。
- 使用现有响应的 url/expires_at/original_name/file_size_bytes/content_type，Gateway 增量透传可选元数据，不改变上传、签名、scope 或其他消费者契约。
- 视频采用原生 controls、preload=auto、非自动播放；等待 loadeddata 的真实首帧及视频尺寸，不以 metadata 或音频可播放冒充画面正常。中央播放入口使用 Element Plus，按租约续签并保留进度/音量/速度及暂停状态；关闭取消传输与续签、移除媒体源。
- 取链失败不自动重试，过期引发的媒体网络错误至多自动恢复一次；解码/格式错误给出提示，不假装转码成功。
- Function 为现有 `DMS.FILE.GET_ACCESS_URL`（business、read、composable），详情组合到课程查看声明；2026-10-23编辑器预览增量另组合到已有新建/编辑声明，不据此为只读查看者授予上传写权限。数据库权限由独立维护方调整。
- 后端格式兼容、真实 OSS Range/签名访问及最终错误契约仍须联调，见协调文档。浏览器测试使用本地生成的短 WebM 与模拟取链接口，不代表生产 MP4/OSS 已验收。
- 该阶段首帧原为降级预览；2026-10-23 已按后端正式增量接入下述缩略图字段。

## 同步视频标准化（2026-10-23）

- 三个既有接口、鉴权、当前租户、来源 App 和 multipart 字段不变，不新增 Function、任务查询或轮询。上传专用超时沿用 600000ms，普通接口仍为 15000ms；网关/部署超时由后端部署方验收。
- 新视频在 Upload 请求内转换为 browser-mp4-v1 的 H.264 MP4 播放文件，保存原片并生成封面。客户端不提交编码参数、不在浏览器转码，也不把源文件名改为播放文件名后保存。
- Upload 新增可空 playback_status、playback_profile、thumbnail_status、video_width、video_height、video_codec、audio_codec。文件名/大小/哈希继续描述原片；media_duration_ms 为最终媒体时长。新视频 ready 才表示转换完成；历史幂等回读和旧部署空字段兼容，但不显示已转换。
- 上传进度按真实字节向下取整，不能在 99.x% 提前进入“已发送”。达到 100% 后显示“视频转换及保存中”及不确定进度；Upload 成功再显示“正在校验视频”。两阶段都保持表单阻断和可取消，不自动重传、不卡在假 100% 完成状态。
- AVAILABLE 仍为基本成功条件；如果响应明确给出非 ready 的视频处理状态则拒绝，不把 processing 当成功并开始轮询。成功后继续调用未改结构的 ValidateVideo，校验文件身份、状态、分类和时长，再发出 uploaded 事件并恢复保存。无音轨 audio_codec=null 合法；thumbnail_status=failed 仅提示，不阻断。
- GetAccessUrl 的 preview URL 和文件元数据现在描述播放副本，稳定 file_id 不变；download 仍指原片。新增 playback_status=ready|unprocessed、playback_profile、thumbnail_status=ready|failed、thumbnail_url、thumbnail_expires_at。
- Gateway 透传临时封面字段。仅 ready、有效 HTTP(S) URL 且到期时间在未来时设置原生 video.poster；缺失、非法、已过期时回退首帧。图片 404/加载失败由原生媒体回退，不能走视频签名重试循环或阻止播放。
- 正常续签复用 GetAccessUrl，按播放/封面较早有效到期时间安排，保留视频进度和播放意图；没有新增独立缩略图查询或轮询。后端取链的缩略图签名失败不影响视频。关闭、切换上下文和续签拒绝时移除 src/poster 并取消请求与定时器；不把任一签名地址提交课程或持久保存。
- 历史未处理视频显示明确提示，继续沿用实际画面检查；此次改造不补转码旧文件。网络结果不明先按旧键重试；终态失败则移除并重新选择获得新键，不按自由文本猜测状态并自动换键。
- 本地受控测试不等于服务已重启或真实 OSS 已联调；真实播放地址、Range、浏览器解码、缩略图及旧数据由部署方联合验收。

## 课程编辑器预览与大小/时长策略（2026-10-23）

- 详情播放器复用到新建/编辑抽屉：已有附件或新上传校验成功的file_id通过同一GetAccessUrl预览，不播放未转码原片。新建/编辑元素归属各自已有Button，Function组合增加既有GetAccessUrl，不新增API或独立Button资源。
- 新选择的课程视频限制为200MB（209715200字节）及600秒。共享上传器以可选maxDurationSeconds先进行有界、可取消的原片metadata检查，能读且超限则不上传；不能读取时显示说明并继续服务端转码，最终服务端时长超限则不发出uploaded、不保存课程。其他消费者默认不启用时长策略。
- 前端预检不是权威存储闸门；后端应明确按课程场景执行大小、时长、引用有效性及历史兼容校验，不把全部DMS文件场景一律限为200MB。配合说明见docs/coordination/training-course-editor-video-preview-2026-10-23.md。
