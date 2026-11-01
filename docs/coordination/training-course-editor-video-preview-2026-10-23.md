# 课程新建编辑：上传后预览与上传限制

日期：2026-10-23。仅前端及离线声明，不写数据库、不修改后端、不自行批准或重录视觉基线。

## 本轮约定与实现

- 用户补充后统一采用上传后预览，不做原片本地播放器或新的手动上传步骤。编辑已有课程时可播放现有附件；新上传/替换视频在 Upload + ValidateVideo 成功后自动加载标准化视频和封面，点击播放，核对后保存课程。
- 复用 CourseVideoPreview/useCourseVideoPreview：同一 GetAccessUrl、租约续签、错误恢复和关闭清理；新增编辑/创建元素绑定到各自已有业务 Button，不另建页面或独立预览 Button 资源。原详情的查看资源保持原归属。
- 预览失败不清除合格的文件引用，可单独重试；不自动重传、不写员工学习/考试记录。URL 不写课程字段或持久存储。
- 课程上传限制200MB（209715200字节）、600秒，等于边界允许。大小在选择时拦截；原片metadata时长预检超时上限10秒，可取消，完成释放本地blob。若能读取且超限则不上传；若浏览器不支持，保留明确提示继续走后端转码，不伪装预检通过。最终服务端时长超过600000ms则保持上传错误/表单阻断，不发出uploaded事件。
- 限制仅适用于新选择文件，不追溯修改历史课程。图片上传和其他FileUploader消费者不启用视频时长策略。

## 需要后端配合（现有接口，无须新增接口）

前端不能对客户端被绕过、原片不支持或存储副作用做权威保证：

1. 请在课程视频上传场景的 Upload 服务端策略中执行200MB文件限制；如现有接口用于其他大文件，需明确按场景区分，不能擅自把全部DMS上传上限改为200MB。
2. 以权威探测/标准化结果判断视频时长不超过600秒，超过时返回明确业务错误。若要求超长文件完全不进入持久存储，应在保存前完成判断并清理本次临时产物；前端无法可靠预读所有MOV/AVI/编码。
3. ValidateVideo、课程Create/Update仍需校验最终文件时长和当前租户/引用有效性，防止绕过UI、直接引用超限旧文件。若允许历史课程保留超限视频，请明确“保留旧引用”与“新绑定/替换”的兼容策略，不擅自让历史编辑失效。
4. 保持现有幂等/终态失败契约及600000ms上传超时，不依赖前端提示代替服务端限制。本次未猜测或发送尚未定义的场景参数。

## 资源维护方配合

- 不增加Function或独立业务Button资源。已有“新建课程”“编辑课程”Permission需额外组合 `POST /dms/File/GetAccessUrl`（现有 `DMS.FILE.GET_ACCESS_URL`，read）用于编辑打开、上传后预览、重试/续签；不要因此加入学习写接口或其他DMS写能力。
- 新增元素createVideoPreview/createVideoPlayback、editVideoPreview/editVideoPlayback，分别归属已有create/edit资源。详情仍用videoPreview/videoPlayback并归属查看课程。
- 原Upload/ValidateVideo组合保持；真实资源同步/授权由专门维护会话负责，本轮只更新代码注册表和离线产物。

## 通信增量逐项复核

- 运行时仅修改CourseManagementPageView、CourseVideoPreview、content-exam资源注册表、FileUploader并新增probeVideoDuration。新增静态依赖仅FileUploader到工具；本地10秒timer只结束metadata读取，成功/错误/Abort均清理timer、事件和blob，无远程请求。
- FileUploader仅在maxDurationSeconds>0且VIDEO时预检；未知时长仍经原Upload/ValidateVideo，最终超限不发出uploaded。其他消费者默认0，图片路径、幂等、鉴权、scope及重试不变。
- 播放器只增加editorMode的detail/create/edit静态元素归属，12个既有UI候选只改变marker，事件/表达式/Hook不变。PageView在formVisible、有fileId、未被uploadBlocked时复用播放器；上传中及关闭卸载旧媒体。GetAccessUrl明确加入新建/编辑模板，不借用查看资源，不写学习数据。
- Function快照、API候选、Method/Path/Function指纹均不变。证据只在上述五个已审源码及一个新工具依赖范围内绑定，不把Hash刷新当作全项目或在线授权通过。

## 验证边界

按项目三桌面视口验证新建/编辑、上传等待、替换、播放、拒绝后的重试、关闭释放及大小/时长边界。上传及API为本地受控响应，不向真实DMS/OSS写入。浏览器时长边界注入只证明策略，不能冒充实际编解码；播放器使用真实短视频验证。

### 最终命令结果

- `pnpm quality` 完整执行：Lint、113项治理测试、生产/UIDesign/测试类型检查、生产与UIDesign构建、5项生产路由测试通过。
- 全量浏览器843项：738通过、81失败、24跳过。与上轮完整日志逐项对照，81个失败身份完全一致，新增0、移除0（75个旧approved-preview、3个登录视觉、3个Dashboard视觉）；证据quality.log、quality-comparison.json，未关闭规则或重录基线，不宣称全绿。
- 新增编辑器6场景×3视口=18项通过；原详情视频42项、同步上传阶段3项同样通过。共享图片上传等回归没有新增失败。真实标准视频的三浏览器编辑器复验另计3项，不冒充真实后端服务或OSS验收。
- 最终定向补充检查页面URL/标题、无框架错误覆盖层、窗口高度降到600时计划时长输入不被固定脚部遮挡；运行时源码未改动，随后编辑器专项18项全部通过，测试Lint和测试类型检查也通过，结果见final-editor.log。

- Browser plugin不可用，ego-browser CLI未安装，沿用项目Playwright与隔离端口4373/4374/4375；实际标准视频复验使用4353。没有接管用户4173、用户浏览器Profile或真实业务账号。
- 已使用后端只读产物 `D:/project/SS.Express.Platform/artifacts/dms-sync-video-evidence/playback.mp4` 在Edge、Chrome、Chromium跑通编辑器原附件播放、替换后播放、暂停、保存稳定引用及关闭释放，各1项通过。API仍为受控样例，原片选择是测试输入，没有向真实Upload写文件，不冒充部署联验。
- 该MP4 SHA-256为 `74662eba4160547b25d07ba67a28a40c82e59a8282e5e72114ac68486bda6620`，没有修改原片或标准化产物。常规CI自生成短WebM，边界测试的metadata注入只限策略检查，不伪造播放器视频画面。
- 另外以正式probeVideoDuration在三个浏览器读取上述MP4及用户提供的HEVC原片，本机6次真实metadata读取均成功（标准视频约2.333008秒、原片约2.333333秒），每次本地blob释放1次；未播放或上传原片。这只证明两份样本能预读时长，不泛化为所有MOV/AVI/编码都可读取，也不以能读时长代替能解码画面。证据probe-native.json。
- 严格Premium静态审计0发现；设计一致性复核：既有Token/密度、FormDrawer滚动与脚部、单一上传Owner、既有播放器均MATCH，无新Token或独立播放器，无自批或更新基线。三视口逐项检查，不以构建代替浏览器。

本轮日志、截图、审查脚本位于 `C:/Users/75946/AppData/Local/Temp/course-editor-preview-20261023/`。维护候选1640（新增1个本地timer，12个原UI候选仅marker身份替换）；离线仍27/41路由、67业务Button、94模板、0未解释项。24个既有来源及92条链仅绑定本轮五个已审源码/一个新工具边的依赖差异；ready_for_sync=true不等于DB同步，runtime_activation_ready=false未改变。
