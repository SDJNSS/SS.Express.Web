# 课程视频：自动加载、缩略图及有声无画面协同

日期：2026-10-22。前端仅修改 `D:/project/SS.Express.Web`；本会话不修改后端、不上传真实文件、不写资源或授权数据库。

## 一、用户本轮要求与前端处理

1. 打开课程详情后自动申请已有 GetAccessUrl 并预加载视频；不等于自动播放，播放仍由用户明确触发，不在课程列表批量取链。
2. 以浏览器解码的视频首帧作为暂停预览。收到 metadata 不立即宣称成功，继续等待 loadeddata；此时必须有非零 videoWidth/videoHeight。
3. 媒体仅能解析声音、无法显示视频时停止媒体并提示“未检测到可显示的视频画面”，不继续把它展示成正常的视频播放。
4. 增加 Element Plus 风格的中央“播放视频”按钮，沿用 ElButton、Loading、既有 Token、原生媒体进度/音量/全屏与现有续签管理；不引入另一套 UI 库或臆造 ElVideo 组件。

**首帧预览不等于后端已生成缩略图。** 当前 DMS Upload/GetAccessUrl DTO 没有缩略图字段，前端不拼接 OSS 截帧参数、不把临时签名地址持久保存，也不在未经确认时假定新响应字段已经存在。

## 二、“有声音、无画面”的排查边界

- 首次仅有用户截图时，无法认定具体视频编码，也不能排除无视频轨道、解码不支持、原片全黑或文件损坏；随后用户提供原文件，实测结果见第八节。
- 当前上传/校验主要识别容器、视频轨道存在性和时长，尚不能保证浏览器兼容；`.mp4` 和 `video/mp4` 也不是视频轨道一定可正常解码的证据。
- 本轮前端补充的是首帧就绪检查及错误反馈，不把警告提示冒充原始视频已经修复。原文件现已核验：HEVC 视频在本机 Edge/测试 Chromium 不能解码，Chrome 可以，见第八节；前端没有转码。
- 后端应检查问题文件的 video/audio codec、profile、pixel format、width/height、时长和实际视频帧；与目标 Windows Chrome/Edge 实测对照。
- 建议浏览器播放输出规格为 MP4 + H.264（8-bit、常规 yuv420p）+ AAC；无音轨视频可以接受。对不兼容来源生成播放派生文件，或明确返回不可播放原因，不仅修改扩展名/MIME。
- 保留原文件与课程 `video_file_id`，不要在未经审批时替换、删除原始数据或批量改写既有课程。

## 三、建议后端配合：上传后生成持久缩略图

建议由 DMS 在视频处理阶段提取一张有代表性的早期视频帧（首个可解码帧或约 1 秒，短视频取有效范围内帧），保存为私有 JPEG/WebP。优先复用现有文件存储、租户归属及访问签名能力，不要求前端另传一张截图，也不依赖前端跨域 Canvas 截图。

这**不要求 Upload 同步等待截图或转码**。上传仍可先返回稳定 file_id，媒体处理异步完成，再由 GetAccessUrl 返回缩略图状态和临时地址；Upload 响应的缩略图字段是可选增量，不是前端播放的必要入参。也可以评估对象存储按需截帧，但其签名、权限、处理费用与重复计算成本须单独确认，前端不能直接给已有签名 URL 追加截帧参数。

这不是简单修改前端播放器即可完成的能力。需要后端生成媒体元数据/缩略图、保存源视频与派生图片关联，并约定失败及处理中的状态；耗时转码可异步，不伪造已完成。

当前首帧降级需要浏览器实际读取视频，不能节省视频读取流量。持久缩略图就绪后，再根据正式契约评估预加载策略；大文件的首屏时延、处理队列和存储/转码成本应由后端评估，不假定上传瞬间必然完成。

### 建议响应增量（待后端确认，不是当前既有字段）

| 接口                             | 建议字段                                                                                              | 用途                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| File/Upload、ValidateVideo       | `thumbnail_file_id`、`thumbnail_status`                                                               | 可选缩略图文件引用及 pending/ready/failed/unsupported 状态；原有 file_id 保留         |
| File/GetAccessUrl                | `thumbnail_url`、`thumbnail_expires_at`                                                               | 已授权视频对应的临时图片地址及到期时间，用于播放器 poster；不新增任意 Bucket/路径输入 |
| ValidateVideo 或受控媒体信息响应 | `video_codec`、`audio_codec`、`video_width`、`video_height`、`is_browser_playable`、`playback_status` | 服务端探测或转码的权威结果；未知不能默认当作已兼容                                    |

字段名、状态取值、同步/异步返回方式由后端确认后纳入正式接口文档，再接入前端类型与 poster。也可以采用后端已有等价字段，但必须提供明确契约。

- 如果 url 指向已转码的播放派生文件，必须说明该语义；`content_type`、大小和到期时间应与实际签发内容一致，响应 file_id 仍与请求稳定引用相匹配。
- 缩略图和播放地址均按当前 Tenant、视频访问资格及文件状态签发，不公开 Bucket，不为了预览放宽为匿名读取，不要求客户端提交 Tenant。
- 读取课程视频的现有 Permission 应能读取其缩略图；若确实新增独立 Function，提供权威编码和 Method/Path，交由 KimiCode/系统资源会话处理。首选在现有 GetAccessUrl 一次返回，避免为 poster 增加无必要的业务按钮及额外查询。
- 缩略图失败或旧文件尚未生成时，返回明确的空值/状态；可播放的视频继续由首帧降级，不让缩略图故障阻断整个课程详情。
- 旧视频补缩略图或转码属于后端维护任务，应单独确认范围后执行；本次前端工作不触发历史数据迁移。

## 四、现有前端接口与权限不变

- 接口仍为 `POST /dms/File/GetAccessUrl`，请求 `{file_id, purpose:'preview'}`。
- 资源 `IAM.TRAINING.COURSES`，Permission 模板 `training-course-management.view`，Function `DMS.FILE.GET_ACCESS_URL` 不变。
- `iam.training.courses.videoPreview` 增加 mount/context-change 的自动取链事件；`iam.training.courses.videoPlayback` 是复用页面资源的纯本地播放元素，不是新增业务 Button。
- 播放不发送员工学习开始、心跳或完成写请求。关闭详情停止播放、取消未完成请求和续签；链接仅保存在当前预览内存状态。
- 前端不会在后端尚未实现时伪造 thumbnail_url，不以截图已出现首帧声称上传接口已保存缩略图。

### 本次通信证据增量

- 只修改 CourseVideoPreview、useCourseVideoPreview 及所属 registry 三个运行时来源；静态依赖图不增加新边，DMS Gateway、API、共享 HTTP 与后端 Function 权威快照不变。
- 原 file/scope watch 只做清理，本次改为 immediate watch：清理后，仅有生产 Gateway 和有效 file_id 时委托既有 requestLease/GetAccessUrl。因此该候选从 local 改为 business，不能沿用旧“无请求”分类。
- 新 loadeddata 回调只检查真实视频尺寸、恢复媒体状态和调用浏览器 play；中央播放 Button 也只调用浏览器 play，均为 local。原 timeout 仍只显示失败和停止媒体，不产生重试请求。
- 其余取链、定时续签、错误条件恢复、scope 比较和关闭取消逻辑未换接口或扩大授权。候选由 1,637 增至 1,639（新增两个本地 UI 回调，替换一个 watch）；离线审查按该增量重新绑定，不把指纹更新当作资源入库。

## 五、组件与浏览器依据

- [Element Plus 官方组件总览](https://element-plus.org/zh-CN/component/overview)：当前没有官方 VideoPlayer/ElVideo。
- [vue-element-plus-admin VideoPlayer](https://element-plus-admin-doc.cn/components/video-player)：另一个项目的组件，不等同于 Element Plus 官方组件；可以借鉴封面及播放入口，但换 UI 不能保证浏览器解码任意视频。
- [MDN loadeddata](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/loadeddata_event)：当前播放帧的数据就绪事件。
- [MDN videoWidth](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/videoWidth)：视频固有尺寸是检查画面可用性的基础信息，不以 duration>0 替代视频画面校验。

## 六、验收要点

1. 打开单门课程详情自动取链一次，显示实际可解码首帧，不自动出声或播放；刷新/重试才再次显式取链，续签按现有租约。
2. 正常视频可播放、暂停、拖动、全屏；错误/无视频/格式不兼容/只解析声音均有准确状态，不无限重试。
3. 后端提供缩略图后，正常展示 poster；链接过期按契约更新，缩略图缺失降级，不能把图片加载失败误判为视频无法播放。
4. 用用户提供的真实问题文件验证修复前后，而不仅用可播放的测试视频证明所有媒体已兼容。
5. 只读普通账号能读同租户授权视频及缩略图；跨租户拒绝。真实 OSS Range/签名、浏览器兼容和派生文件处理分别留验收证据。

## 七、本轮前端验证与尚未完成项

- `pnpm quality`：Lint、113 项治理测试、生产/UIDesign/测试类型检查、生产与 UIDesign 构建、5 项生产路由检查通过。全量浏览器 801 项：696 通过、81 失败、24 跳过；与前一阶段 81 个失败逐项对照，新增为 0、移除为 0。失败仍为 75 个旧 approved-preview、3 个旧登录视觉用例及 3 个旧 Dashboard 用例，未改批准基线或关闭检查。
- 视频专项 8 场景 × 3 桌面视口，共 24 项通过。覆盖自动取链、真实首帧及非自动播放、键盘播放、暂停/拖动、换源和续签恢复、失败不循环、关闭取消/晚响应、无附件、损坏媒体、真实纯音频文件。播放时不残留加载占位或撑高视频容器；高度缩短至 480px 后下方内容仍可滚动到达。
- 相关定向套件前一轮 110 通过、16 跳过、0 失败；最终全量回归包含这些场景。测试媒体由浏览器生成短 WebM，纯音频为真实 WAV；未伪造 HTMLVideoElement 的媒体 API。
- 最终将中央播放元素的事件收窄为实际的本地 click 后，重新通过完整 Lint、生产/UIDesign 构建，并再次独立执行视频专项：24 通过、0 失败（`video-delivery.log`）。该登记校准不增加 Function 或业务 Button。
- 使用项目 Playwright 隔离服务，不接管用户的 4173。当前可用浏览器面板没有已登录的用户页，本机未发现 ego-browser CLI，故采用仓库测试工具；受控接口返回不能代替真实账号、OSS 和问题原文件联调。
- Frontend Design Premium 严格静态审计 0 发现；三个桌面尺寸截图已目视检查。Page Contract revision 5，旧 Approval 与三视口批准基线不自动更新。
- 离线维护声明 1,639 候选、0 未解释项，Function/Permission 集合不变；生成产物不是数据库写入或线上授权验收，`runtime_activation_ready=false` 不变。

**仍待完成**：后端确认并实现持久缩略图/媒体兼容性契约；后端正式字段就绪后再接入 poster，并在真实服务及授权身份下联调。原文件已确认存在浏览器解码兼容性差异（第八节），但尚未与 DMS 线上对象做哈希对照。本轮首帧检查不是视频转码，不声称该 HEVC 文件在不支持它的浏览器中已能显示画面。

本轮证据目录：`C:/Users/75946/AppData/Local/Temp/course-video-followup-64604dea28034f54a14c35bd5c6035a4/`；全量日志 `quality-final.log`，历史失败对照工具 `compare-quality.mjs`，三视口定向截图位于 `target-all/`。

## 八、真实问题文件核验（用户补充原文件后）

日期：2026-10-22。只读检查用户提供的本机文件；没有修改、转码或上传该文件，没有读取现有浏览器账号或配置。

### 已核实的文件事实

- 文件：`C:/Users/75946/Pictures/856c2bd2d944d099b6acd37d3343d273.mp4`，254,572 bytes。
- SHA-256：`5f5ca58ddf1cdf49c1a232ef50c0e73720b011a93db437e71be65d376681e93b`，检查前后相同。
- MP4 内确有视频轨道：sample entry 为 `hvc1`（H.265/HEVC），720 × 1280，70 个视频采样，视频时长约 2.333 秒；不是 H.264。
- 音轨为 `mp4a`/AAC，48 kHz。`moov` 位于 `mdat` 之前；不能把此次现象归为“文件只含声音”或单纯扩展名不对。

### 相同文件、相同原生 video、不同浏览器的对照

使用工程已安装的 Playwright，启动隔离临时会话，以只绑定 `127.0.0.1`、支持 Range 的临时 HTTP 服务读取同一份原始字节。没有接入 IAM/DMS；测试结束已关闭服务及测试浏览器。测试静音，通过媒体轨道、播放时间、实际解码帧数判断，未把“play Promise 成功”当成画面正常的证据。

| 本机浏览器（headless 隔离会话）   | HEVC decodingInfo.supported | 播放约 0.5 秒后的画面尺寸 | 已解码视频帧 | 实际结果                                             |
| --------------------------------- | --------------------------- | ------------------------- | ------------ | ---------------------------------------------------- |
| Google Chrome 155.0.8059.80       | true                        | 720 × 1280                | 20           | 有正常画面，截图为键盘/电脑场景，不是全黑原片        |
| Microsoft Edge 151.0.4129.101     | false                       | 0 × 0                     | 0            | 音轨可解码、时间推进，但没有画面，复现用户描述的症状 |
| Playwright Chromium 151.0.7922.34 | false                       | 0 × 0                     | 0            | 同样只解析可用音轨，video.error 仍为空               |

结论：**该文件存在明确的 HEVC 浏览器解码兼容性差异**。在不支持的环境中，loadedmetadata、loadeddata、canplay、playing 均可发生，但视频尺寸/帧数仍为零，因此原先仅以媒体事件成功判定“可播放”不足。现有首帧检查能够识别这一类情况；它不能补上浏览器缺少的解码器。

此对照证明问题可以脱离页面 CSS、IAM 权限和远程签名访问独立复现，并排除“本机这份原片没有画面”的判断；不代表已核验用户当前已登录浏览器的设置、GPU 加速状态，或远端 DMS 对象必定与本机文件字节相同。不能由此宣称所有 Edge 都不支持 HEVC，或所有 Chrome 都一定支持。Chromium 官方也说明 HEVC 支持存在浏览器发行版及硬件条件，见 [官方音视频说明](https://www.chromium.org/audio-video/)。

### 后端处置建议及边界

1. 保留原文件和课程稳定 `video_file_id`，为 HEVC 等非统一兼容输入生成 H.264/AAC MP4 播放派生文件；现有预览取链接口应明确签发可播放派生文件，未就绪/失败需有正式状态和原因。
2. 在同一媒体处理流程提取并保存缩略图；缩略图与播放副本各自有生命周期，生成封面不能代替视频转码。
3. 用这一份源文件验收：转码后在 Chrome/Edge 中均有非零画面尺寸及持续解码帧、可播放/拖动，并保留同租户鉴权、签名和 Range 检查。
4. 本次只追加核验事实和协同需求，不安装系统解码器、不修改浏览器 GPU/安全设置、不覆盖原片或写数据库，也不擅自加入前端软件解码库。

源文件核验脚本、真实浏览器指标和截图位于 `C:/Users/75946/AppData/Local/Temp/course-video-source-20261022/`：`inspect.mjs`、`browser.mjs`、`results.json`、`chrome.png`、`msedge.png`、`chromium.png`。
