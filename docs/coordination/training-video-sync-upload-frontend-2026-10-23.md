# 同步视频标准化：前端接入与验收边界

日期：2026-10-23。前端工程 `D:/project/SS.Express.Web`。权威输入为后端 `D:/project/SS.Express.Platform/Doc/Engineering/dms-synchronous-video-upload.md`；已核对 FileUploadResponse、FileAccessResponse。本文取代 2026-10-22 文档中的“待确认缩略图字段”和异步方案建议，不代表后端已经重启或真实 OSS 已验收。

## 当前实现

- 沿用三个 API 和原 Function：Upload、ValidateVideo、GetAccessUrl。不增加资源、Permission、轮询、前端转码库或数据库写操作。
- Upload 读取可空的 playback_status/profile、thumbnail_status、视频尺寸/编码和 audio_codec。新视频 ready 才显示已转换；历史空字段保持兼容，不冒充转换成功。明确非 ready 的成功响应拒绝保存，不轮询。
- FileUploader 仍是唯一上传状态 Owner，图片/普通文件复用原路径。字节百分比向下取整；100% 后转为不确定进度并显示“视频转换及保存中”。Upload 最终成功后显示“正在校验视频”；ValidateVideo 成功才产生 uploaded 事件并解除业务保存阻断。没有提前完成、伪造服务端转换百分比或拉长全部 API 超时。
- 缩略图 failed 只显示说明，合格视频仍能使用。无音轨 audio_codec=null 合法。课程只提交稳定 video_file_id，时长按最终 media_duration_ms 向上取整；不提交转换参数、原片 URL、播放 URL 或缩略图 URL。
- 课程上传选择范围与后端一致为 MP4/MOV/AVI。详情自动申请 preview 地址，使用播放文件响应元数据；浏览器不自动播放。ready 且有效、未过期的 HTTP(S) 缩略图地址设置为原生 video.poster；缺失、非法、过期或图片加载失败仍允许视频首帧及播放。
- 封面与视频使用同一取链接口，在较早有效租约到期前续签，保留进度、音量、速度和播放/暂停意图。封面异常不触发视频签名重试循环；关闭或失去有效上下文清理 src、poster、未完成请求和 timer。
- 历史 unprocessed 视频明确显示尚未标准化，沿用真实视频尺寸/解码检查；本次不改写历史文件。网络结果不明人工重试仍复用原键；服务端明确终态失败后移除重选生成新任务，不根据自由文本自动换键或自动重传。
- 不修改人工 Approval、批准截图基线或全局视觉 Token。课程 Page Contract revision 6；复用 Element Plus、原生媒体控件、既有 FormDrawer 和上传 Owner，行为增量已同步 UX-CONTRACT。

## 通信增量审查

仅七个运行时来源变化：DMS fileApi/Gateway、共享 fileTransfer 类型/FileUploader、课程 PageView/VideoPreview/useCourseVideoPreview。静态依赖图没有新边。

1. fileApi 的 Upload request 候选身份变化只来自 byte progress 的 Math.round → Math.floor；Method、Path、FormData、600000ms 专用默认超时、Token、retryAuth=false、信号均不变。新增状态校验为本地条件，onStage 只调用注入的本地显示回调；ValidateVideo 请求本身不变。
2. Gateway 只透传已正式定义的可空元数据；scope/ensureScope、上传来源及三个请求链不变。共享类型没有运行时请求。
3. FileUploader 的 onProgress/onStage 只更新真实阶段显示；等待同一 task.run，成功才解除阻断。图片及普通文件没有新增取链或轮询。
4. 课程 PageView 只调整输入类型约束及说明；uploaded 仍从最终校验时长生成课程秒数，提交模型不变。
5. 视频 Hook 的 renewal timer 仍委托同一 requestLease(true)，仅把 delay 改为视频/有效缩略图较早租约的 90%。URL/到期校验、poster 赋值、历史提示及释放均是本地行为；没有新 timer、API 或运行时授权关系。
6. VideoPreview 只增加浏览器 poster 资源绑定及状态说明。媒体/缩略图字节通过浏览器读取已签发 URL，不携带后台 Authorization，不把读媒体误登记为新的业务 Function。

通信候选仍为 1,639，两项身份替换已逐项审核，其他候选集合/表达式不变。维护产物只在本地生成；离线 ready 不表示线上授权或播放已验收。

## 验证方式与剩余范围

- 工程 Playwright 使用隔离端口，不接管用户的 4173；Browser plugin 不可用、本机没有 ego-browser CLI。没有读取用户浏览器 Profile 或业务账号。
- 长上传阶段测试使用只绑定 127.0.0.1 的临时内存 HTTP 服务，真实接收 XHR multipart 请求体并推迟最终响应，验证字节发送完的等待阶段；不是用假进度冒充已发送。业务接口为受控响应，不写 IAM/DMS/OSS。
- 覆盖签名封面、后端封面 failed、图片 404、失效/非法封面、独立封面提前到期续签、历史视频、原有画面检查及关闭清理；使用真实浏览器 video，常规自动测试媒体为本地生成 WebM，不冒充它已经证明 H.264 标准化。
- 真实 DMS 进程版本、FFmpeg 部署、网关超时、OSS 签名/Range、标准化文件与缩略图访问、跨租户拒绝以及旧数据处置仍须真实环境联合验收。本会话不重启后端、不上传用户原视频、不执行历史迁移或资源入库。

本轮日志/截图及本地审查材料目录：`C:/Users/75946/AppData/Local/Temp/video-sync-frontend-20261023-a073/`。完整结果见下文；不以编译或文档中的后端回归记录替代本轮前端实测。

## 已完成的验证

- `pnpm quality` 最终运行完成：Lint、113 项治理测试、生产/UIDesign/测试类型检查、生产/UIDesign 构建和 5 项生产路由测试通过。全量浏览器共 825 项：720 通过、81 失败、24 跳过。
- 与上阶段完整日志逐项对照，81 个失败身份完全一致，新增 0、移除 0；仍是 75 个旧 approved-preview、3 个旧登录视觉用例及 3 个旧 Dashboard 用例。证据为 quality-final.log、quality-comparison.json；未重录批准基线、改 Approval 或关闭规则，不能宣称全量门禁全绿。
- 视频及封面 14 场景 × 3 桌面视口，共 42 项通过；同步上传等待/验证/保存 3 项通过。后者用真实 XHR 发送请求体，确认转换及验证期间不可提交、不显示或向读屏工具报告“100% 已完成”；最终媒体字段只提交文件 ID 和向上取整的计划时长，不提交 URL 或媒体元数据。最终补充播放器交互及截图就绪等待后再次专项回归，45 项全部通过（final-videos.log）。
- 共享图片上传、幂等重试、取消/晚响应、当前租户切换、来源 App ID、Preview 隔离等既有回归没有新增失败。API 非 ready 视频响应在本地拒绝，不启动 ValidateVideo 或轮询。
- Frontend Design Premium strict 审计 0 发现；未修改 Token 或布局 Owner。三视口证据检查了原生封面显示、长字段、抽屉内滚动和上传等待状态；Page Contract revision 6，人工批准及原有长期基线未更新。
- 离线声明仍为 27/41 路由、67 业务 Button、94 Permission 模板、1,639 候选及 0 未解释项。本轮只有两个候选身份替换；73 个依赖来源、321 条链在七个已审源码差异范围内重新绑定。ready_for_sync=true 不表示数据库/授权已同步，runtime_activation_ready=false 保持不变。

### 实际标准化文件 + 正式播放器（三个浏览器）

只读使用后端已有产物 `D:/project/SS.Express.Platform/artifacts/dms-sync-video-evidence/playback.mp4`（413,877 bytes）及 `poster.jpg`（43,481 bytes）。未调用真实 Upload、未重新转换原片。

- MP4 SHA-256：`74662eba4160547b25d07ba67a28a40c82e59a8282e5e72114ac68486bda6620`。
- JPEG SHA-256：`c14c98e8f13437ae3745d6cc0bae1f71d84e453b1b9da071756ef4717949103f`。
- 检查前后哈希一致。文件规格由后端的真实探测记录确认，本轮另用真实浏览器解码验证，不以扩展名或模拟 HTMLVideoElement 属性代替。

| 浏览器       | 实际视频尺寸 | 实际视频帧 | 课程播放器交互                                                                  |
| ------------ | ------------ | ---------- | ------------------------------------------------------------------------------- |
| Chromium 151 | 608 × 1080   | 大于 0     | 自动取链、真实 JPEG poster、非自动播放、播放/暂停、跳转、继续播放、关闭释放通过 |
| Chrome 155   | 608 × 1080   | 大于 0     | 同上，通过                                                                      |
| Edge 151     | 608 × 1080   | 大于 0     | 同上，通过，不再复现旧 HEVC 的零视频帧                                          |

这些验证复用正式页面、Gateway 和播放器，API/业务 DTO 仍为受控样例，只把媒体替换为本机真实 MP4/JPEG；不是当前账号、数据库、DMS 部署或真实 OSS 的验收。视频/封面在浏览器本地路由内返回，专用预览端口 4353，不接管 4173；跨域媒体请求没有后台 Authorization，签名地址未持久化。

测试可显式使用 DMS_VIDEO_TEST_FILE、DMS_POSTER_TEST_FILE 输入本机产物，正常 CI 未设置时仍自行生成独立测试媒体；临时配置/命令、real-chromium/chrome/msedge.log、对应 JSON 指标及截图均在上述 Temp 目录中。关闭测试会话后没有保留浏览器或服务；未使用用户 Profile。

### 设计一致性复核

| 契约                                     | 复核  | 处理                                                        |
| ---------------------------------------- | ----- | ----------------------------------------------------------- |
| 既有 Token、Element Plus、单一上传 Owner | MATCH | 只扩展 FileUploader 阶段，不创建新上传器或第二套播放器      |
| 不伪造完成、不丢失失败上下文             | MATCH | 字节与服务端处理分阶段；等待最终成功及验证，失败可重试/移除 |
| Preview 无真实通信、人工批准独立         | MATCH | 没有为 Preview 注入 Gateway，没有自批或更新基线             |

剩余联合验收：确认 DMS 运行进程已更新、FFmpeg 可用、网关超时覆盖完整处理预算；在真实账号下重新上传样本，检查实际播放和封面地址及当前租户权限。旧 HEVC 文件不会因前端更新自动转换，需通过明确的重新上传/绑定流程处理，不执行未授权历史回填。
