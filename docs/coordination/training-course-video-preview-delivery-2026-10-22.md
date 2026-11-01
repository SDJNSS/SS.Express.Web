# 课程详情视频预览：前端交付与权限配置交接

日期：2026-10-22。前端正式目录：`D:/project/SS.Express.Web`。

> 后续调整：用户已要求打开详情后自动加载和首帧预览，不再需要首次点击加载。当前 Page Contract revision 5；新增 `videoPlayback` 纯本地元素，Function/Permission 集合不变。持久缩略图及真实问题文件的编码协同见 [后续文档](training-video-thumbnail-and-codec-backend-2026-10-22.md)。下方验证数字保留前一阶段历史，不代表本次问题文件已修复。

## 实现范围

- 正式入口仍为 `/iam/training/courses`，点击课程名称打开原详情抽屉后自动加载视频和首帧，不自动播放；不在列表批量取链。
- 原生视频控件支持播放、暂停、进度拖动、音量及全屏。取链元数据显示真实文件名与大小，不把文件 ID 当作名称。
- 根据 `expires_at` 提前续签，保留进度、音量、倍速及播放/暂停意图；取链失败停播并等待人工重试，格式/解码错误明确提示。
- 关闭抽屉或生产上下文重建后停止媒体、移除 URL、取消请求及定时器，旧响应不再生效；Preview 无真实传输。
- 不增加路由、独立业务 Button 或员工学习写请求，不更改课程 CRUD、上传、视频绑定校验和数据库授权。

## 交给 KimiCode 的权限配置

| 项目                   | 稳定身份 / 精确接口                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------ |
| 页面资源               | `IAM.TRAINING.COURSES`                                                               |
| 所属 Permission 模板   | `training-course-management.view`（查看课程管理）                                    |
| 新增元素上下文         | `iam.training.courses.videoPreview`，引用页面资源，不新建 Button                     |
| 新增只读 Function 组合 | `DMS.FILE.GET_ACCESS_URL`                                                            |
| 接口                   | `POST /dms/File/GetAccessUrl`                                                        |
| body                   | `{ "file_id": "课程 Detail 返回的 video_file_id", "purpose": "preview" }`            |
| 使用时机               | 详情打开、文件或上下文变化自动加载；人工重新加载；租约续签；到期网络错误至多恢复一次 |

保留查看模板原有的课程 Query/Detail Function，并增加上述取链 Function；不能把上传、课程创建、编辑或员工学习接口一并授给只读用户。角色按当前 Tenant 直接关联 Permission，不恢复旧权限包。

前端注册表：`src/features/training/content-exam/iam-resource.registry.ts`。交接以最新生成的 `artifacts/iam-maintenance.frontend.json` 为准，不按旧截图、旧模型或 Preview 目录初始化资源。

现有 DMS GetAccessUrl 在 Function 鉴权通过后按当前 Tenant 和文件状态签发，不要求上传者相同，也不进一步验证课程绑定。后端若改变此访问范围或接口形状，须提供正式契约后再适配；前端不凭资源父子关系推断授权。

## 通信证据增量审核

- `CourseVideoPreview.vue`：重新加载按钮及媒体错误回调可条件委托取链；loading 绑定、metadata 恢复、loadeddata 画面检查、timeupdate/play/pause/ended/volumechange/ratechange 仅操作浏览器媒体或本地状态。中央 Element Plus 播放按钮同样是 local。
- `useCourseVideoPreview.ts`：唯一业务委托是 `transport.access(id, signal)`，对应 GetAccessUrl；immediate scope/file watch 清理后自动委托取链，租约 timer 委托同一函数。`transport.scope()` 只是比较会话快照；媒体加载超时 timer 只停播并显示错误。
- 生产调用链：课程页已有 fileTransferKey injection → AppLayout provider → DMS Gateway.access → dmsFileApi.getAccessUrl → 统一 HTTP。Preview 传入 undefined Gateway，不发真实请求。
- 公共 FileTransferGateway 仅增量透传已存在响应中的文件元数据，Endpoint、Method、Token、scope/ensureScope、上传、校验、幂等行为不变；FileTransfer 类型无运行时请求。
- 原课程列表、创建编辑、复制、启停候选集合和回调不变；只增加详情内媒体组件及读取事件。未更改任何后端 Function 定义，不重新导入或猜测编码。
- 增量证据绑定新源码和依赖闭包；不能把文件哈希更新当作数据库已授权、后端已部署或真实 OSS 已验收。

## 验证方式与剩余边界

浏览器测试复用正式 Binding，取链接口受控模拟；短 WebM 由 Chromium 在测试中本地生成，用真实 HTMLVideoElement 解码、播放和拖动，不覆盖或伪造播放器 API。它证明前端生命周期，不证明真实课程 MP4、MOV/AVI 转码、OSS Range/域名策略或当前账号授权。

三个桌面视口、缩短至 480px 高度、只读身份、续签、失败重试、无视频、编码错误、关闭中的晚响应已完成本轮定向验收；旧 Approval 和视觉基线不自动更新。

后端协同及部署检查见 `training-course-video-preview-alignment-2026-10-22.md`。本会话不写数据库、不分配角色权限、不部署后端。

### 前一阶段定向验证结果（历史记录）

- 使用项目 Playwright，隔离服务 `http://127.0.0.1:4373/iam/training/courses`，未停止或接管用户的 4173 服务。Browser 插件不可用，本机未发现 ego-browser CLI；未安装额外浏览器依赖。
- `pnpm exec playwright test tests/visual/training-content-production.spec.ts tests/visual/training-content-exam-previews.spec.ts tests/visual/dms-file-upload.spec.ts`：107 通过、16 跳过、0 失败。新增 7 个视频场景覆盖三个桌面视口，共 21 项；跳过项是旧有非 1440 视口的重复 CRUD 交互。
- 实际 Chromium 解码播放、暂停、拖动、换源恢复、定时续签、拒绝停播、关闭清理及晚响应隔离通过；模拟格式错误、无附件均有明确状态。正常流程没有框架异常；三个视口截图已人工目视检查，缩短高度后仍可到达审计信息。
- Frontend Design Premium 严格静态审计：0 发现；离线维护声明：0 未解释候选。`ready_for_sync=true` 只是离线声明状态，`runtime_activation_ready=false` 不变。
- Page Contract revision 为 4；未自动更新任何人工 Approval 或三视口批准基线。

临时日志与截图目录：`C:/Users/75946/AppData/Local/Temp/course-video-aeac76cc84be466f9108ef080cc0f732/`。`target-all/` 为定向浏览器证据，`premium-audit.json` 为静态审计，`quality.log` 为全量门禁日志。

### 前一阶段全量门禁结果（历史记录）

`pnpm quality` 已执行完毕：Lint、113 项治理测试、生产/UIDesign/测试类型检查、生产与 UIDesign 构建、5 项生产路由检查全部通过。

全量浏览器套件共 798 项：**693 通过、81 失败、24 跳过**。81 个失败与改造前季度任务阶段的 quality.log 逐项比较，新增失败为 0、移除失败为 0：75 个旧 approved-preview、3 个旧登录视觉用例、3 个旧 Dashboard 用例。本轮新增 21 个视频测试全部通过，未通过改基线、改 Approval 或关闭检查来消除旧失败；因此不能宣称项目全量质量门禁已全绿。

后续联合验收仍由后端/部署负责人确认真实视频格式、OSS Range/域名与错误契约，并由 KimiCode 完成数据库权限配置后，用真实只读账号检查同租户非上传者播放和越租户拒绝。这些不由受控模拟测试替代。
