# 课程详情视频播放：前后端协同分析

日期：2026-10-22  
页面：`/iam/training/courses` → 课程详情抽屉  
状态：本文保留源码分析与协同建议；前端已按用户后续授权实现，交付及权限配置见 [前端交接](training-course-video-preview-delivery-2026-10-22.md)。后端配合、实际存储与在线授权仍待联合验收，本会话未执行资源入库或部署。

## 一、结论

现有接口已经具备取得课程视频临时访问地址的基础能力，**不需要为了首期 MP4 播放再新增一套播放接口**：

1. `POST /iam-admin/TrainingCourse/Detail` 返回 `video_file_id`、视频时长等课程信息。
2. `POST /dms/File/GetAccessUrl` 接收该 `file_id`，以 `purpose=preview` 返回临时 URL、到期时间、原始文件名、MIME 和文件大小。
3. 前端在课程详情中使用播放器加载临时 URL；后台 Token 只用于取链请求，不发送到对象存储。

当前不能播放的直接原因是前端详情没有播放器、没有接入取链调用。旧 PRD 和 Page Contract 曾明确把管理端在线视频预览排除在本组 P0 之外，本次属于补齐新需求。

另发现一个后端兼容缺口：**视频上传/绑定校验支持 MP4、MOV、AVI，但直接预览白名单只支持 MP4；现有探测主要检查容器和时长，不能保证浏览器能解码。**因此不能承诺所有当前可上传的视频都可直接播放。

## 二、已有能力与边界

| 项目         | 当前源码情况                                                                                   | 本次处理建议                                                |
| ------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 课程视频引用 | Detail 返回单个 `video_file_id`，并非多附件列表                                                | 保持单视频模型，不另建附件管理                              |
| 临时访问接口 | GetAccessUrl 已返回 `url`、`expires_at`、`original_name`、`content_type`、`file_size_bytes` 等 | 直接复用，无需在课程表保存播放 URL                          |
| 鉴权         | DMS 控制器声明业务 Function `DMS.FILE.GET_ACCESS_URL`，不是 SA 专用接口                        | 用业务 Permission 授权，不改成匿名或仅登录可访问            |
| 文件范围     | 服务层校验当前 Tenant、可用状态、删除和过期状态；不要求调用者是上传者                          | 可支持同租户其他课程管理员预览；跨租户继续拒绝              |
| 媒体有效期   | 配置默认 3600 秒，响应按实际签名返回到期时间                                                   | 前端依响应续签，不硬编码时长；部署配置仍需确认              |
| 读取方式     | OSS V4 GET 签名；预览请求设置 inline，不需要额外签名请求头                                     | 使用原始签名 URL，不能拼接或删除参数；GET 签名不拿来做 HEAD |
| 前端公共能力 | 已有 DMS API、文件传输 Gateway、临时 URL Composable                                            | 复用并按视频场景扩展，避免到期换源后丢失播放位置            |

### 文件授权粒度说明

现有 GetAccessUrl 在通过 Function 鉴权后，允许取得**当前租户内其他成员上传的可用文件**的链接；它并不进一步判断该文件是否绑定到某门课程。把该 Function 组合进课程查看 Permission，不会自动把服务端文件范围收窄为“只能看当前课程视频”。

首期建议沿用现有文件访问政策，不擅自改变权限模型。若需要“只能访问有权查看课程所绑定的视频”，再由后端提供按 `course_id` 校验课程及文件绑定的业务取链接口；这属于单独的安全范围调整，不是现有接口缺失，也不是本次默认新增项。

## 三、后端需要配合的事项

### 1. 明确可播放格式，处理现有 MOV/AVI 兼容缺口

负责人：DMS 后端、培训后端；格式覆盖范围由产品确认。

- 建议首期稳定播放规格为 MP4，视频 H.264、音频 AAC（无音轨视频允许）；以目标桌面浏览器实测为准。
- 上传成功、容器扩展名为 MP4、能够解析时长，均不等于保证网页播放成功。后端应补充媒体编码探测，或明确当前只能在播放时判断兼容性，不能返回未经验证的“保证可播放”。
- 对已有 MOV、AVI 或不兼容编码视频，必须明确策略：
  - 首期不转码：允许保留现有课程及文件，详情明确显示“当前格式不支持网页播放”，不能静默标成课程或文件无效、不能要求删除历史数据。
  - 要求这些视频也能在线播放：后端需提供兼容的播放派生文件/转码能力及其处理状态，再签发播放地址；不能仅把 MOV/AVI 加入白名单或修改 MIME 来冒充兼容。
- 若提供可播放标记、不可播放原因、编码或转码状态，需同步正式 DTO、文档和错误契约。这些是待定义的新增字段，不是当前已存在字段。
- 不在本次前端工作中擅自限制所有 DMS 业务的上传格式，也不自动触发批量转码。

### 2. 验证真实存储的播放与拖动能力

负责人：DMS 后端、存储/部署负责人。

- 使用真实课程视频验证合法签名 GET 可加载、可拖动到未缓冲位置，Range 请求按实际范围返回正确的 `206`、`Content-Range` 和长度信息；不能每次拖动都重新下载整个视频。
- 确保 Object 的 `Content-Type` 正确，播放地址未被网关或 OSS 强制转为下载。当前签名代码已设置 inline，但源码明确注明它不能保证绕过 OSS 默认域名的强制下载策略。
- 当前配置校验只允许标准 OSS 公网 Endpoint。如果实测需要自定义域名或另一种播放访问方式，需要后端同时改造配置校验与签名实现；不是前端替换域名即可解决。
- 按实际前端来源和媒体读取方式检查 OSS CORS、访问策略及前端 CSP `media-src`；如需跨域读取响应头，补齐相应暴露头。后台 API 的 CORS 不会自动应用到 OSS。
- 核实签名有效期、长时间停留后的重新取链，以及文件删除/跨 Tenant 后拒绝重新取链。已签发 URL 在到期前并非即时可撤销，不能承诺切换租户后云端立即失效。

这些是联调验收项，不应仅凭离线签名测试就判定已完成。当前没有使用真实视频或存储凭据进行在线验收。

### 3. 维持并说明错误契约

负责人：DMS 后端。

- 保持现有请求、成功包装及 `expires_at` 语义，不把临时 URL 变成永久业务字段。
- 明确无 Function 权限、文件不存在/不可访问、格式不支持、存储配置异常的业务 code/message，便于前端分别展示。
- 如新增转码能力，明确处理中、失败、可重试的状态；不把它们都包装成“网络错误”。
- 对无权限、跨租户等拒绝，不通过错误详情泄露其他租户文件信息。
- 原始文件名、MIME、大小已经能从 GetAccessUrl 返回，**不必为显示这些字段强制修改 TrainingCourse/Detail**。

## 四、前端改造范围

负责人：前端。

1. 在原课程详情抽屉的视频资源区域增加播放器，支持播放/暂停、进度拖动、音量、全屏；默认不自动播放，不增加独立业务页面。
2. 在打开详情后按需取链或由明确的播放操作取链；不在课程列表中批量申请 URL、不预下载全部视频。
3. 展示加载、无视频、取链失败、无权限、格式/解码不支持和重试状态。用真实文件名、大小替代目前的文件 ID 摘要和“接口未提供”。
4. 视频链接只保存在当前预览状态；接近到期时按需续签，换源保留播放位置和原先暂停/播放意图。失败重试必须有上限，禁止对所有 403 无限刷新。
5. 关闭抽屉停止播放并释放资源；切换课程、租户、账号或卸载后，取消请求和续签，拒绝旧响应覆盖新上下文。
6. 管理员预览**不调用员工学习开始、心跳、完成等接口，不产生学习时长、完成率或考试记录**。
7. 同步 PRD、Page Contract、Canonical View/Preview、接口类型及交互测试。Preview 使用受控离线媒体，不访问真实业务或存储。

现有 `useFileAccessUrl` 到期刷新会先清空地址，不能未经适配就把它直接套到视频上，否则会造成播放中断或进度重置。优先复用公共取链 Gateway，再补足媒体状态管理。

## 五、系统资源会话需要配合的事项

负责人：系统资源维护会话；本会话只维护前端声明，不写数据库。

- 保留页面资源 `IAM.TRAINING.COURSES` 和既有详情入口，不为了普通播放、暂停、拖动创建一组独立 Button 权限。
- 前端在真实触发取链、续签、手动重试的控件/区域增加准确的 `resource_element` 事件及用途说明，登记 `POST /dms/File/GetAccessUrl` 通信。
- 在相应课程查看 Permission 模板中组合 `DMS.FILE.GET_ACCESS_URL`；精确资源关联和角色的直接 Permission 授权由资源会话核验。
- 只读课程预览不应因此获得 `DMS.FILE.UPLOAD`、不必要的视频绑定校验或课程编辑权限。上传、绑定校验继续留在课程创建/编辑通信链。
- 资源维护需核验 IAM 消费 DMS Function 的跨 App 规则及当前 Tenant 下的授权；不要求用户先拥有整个 DMS 菜单，也不以 SA 身份绕过授权。
- 如果之后另行决定独立控制“预览视频”权限或采用课程专用取链接口，再同步新增 Button/Function；不提前猜编码或入库。

## 六、联合验收清单

- 只有课程查看和文件预览权限、没有上传/编辑权限的普通管理员，可以播放同租户其他成员上传的课程视频。
- 草稿、启用、停用、锁定课程的管理端详情遵循原课程查看规则；锁定不等于禁止只读预览。
- 同 Tenant 有效视频成功；跨 Tenant、删除/过期文件、无 Function 权限均拒绝新取链且界面有提示。
- 实际 MP4 能播放、拖动、暂停、全屏；明确 MOV/AVI 和不兼容编码的处理结果。
- 临时链接到期或错误可恢复，续签不从头播放、不无限重试。
- 切换课程/租户及关闭详情后不继续播放、不残留定时请求；不把签名 URL 写入课程或持久存储。
- 浏览器高度变化和三个桌面视口下，播放器及详情可完整访问，无竞争滚动或遮挡。
- 播放全过程没有员工学习记录的写请求。

## 七、关键源码依据

前端根目录：`D:/project/SS.Express.Web`

- `src/features/training/content-exam/components/CourseManagementPageView.vue`：当前详情仅展示摘要。
- `src/features/training/content-exam/adapters/trainingContentAdapter.ts`：当前以文件 ID 代替文件名，大小为“接口未提供”。
- `src/features/dms/files/api/fileApi.ts`：现有 GetAccessUrl DTO 与取链封装。
- `src/features/dms/files/api/fileTransferGateway.ts`、`src/shared/composables/useFileAccessUrl.ts`：公共取链及续签能力。
- `src/features/training/content-exam/iam-resource.registry.ts`：课程详情尚未登记 GetAccessUrl 通信。
- `docs/prd/training/training-resources-exam-rules.md`、`docs/page-specs/training-course-management.yaml`：原范围明确排除在线视频预览。

后端根目录：`D:/project/SS.Express.Platform`，本次仅读取：

- `Src/IAM/Admin.Api/Controllers/TrainingCourseController.cs`、`Src/RPC/Contracts/IAM/TrainingManagementContracts.cs`。
- `Src/DMS/SS.EXP.DMS.API/Controllers/FileController.cs`、`Src/DMS/SS.EXP.DMS.Service/ServiceImpl/FileServiceImpl.Access.cs`。
- `Src/RPC/Contracts/DMS/FileAccessContracts.cs`。
- `Src/Infra/Infrastructure/File/FilePreviewPolicy.cs`、`AliyunOssAccessUrlProvider.cs`、`AliyunOssOptions.cs`。
- `Src/DMS/SS.EXP.DMS.Service/ServiceImpl/VideoMetadataProbe.cs`。

历史 `Doc/Engineering/file-access-api.md` 仍写有旧 `/dms-file` 前缀及“不检查 Function”的旧说明；当前控制器及 Function 目录已是 `/dms`、业务 Function 鉴权，不能按旧说明放宽权限。
