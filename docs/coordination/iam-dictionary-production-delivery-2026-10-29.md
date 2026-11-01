# 字典管理正式页交付

## 入口与批准

用户明确批准：“审核通过，可以进行正式页面开发。”已把本次字典页面单独登记为approved，并固化page-content三视口基线；没有更新其他页面的Approval或基线。

- 正式路由：`/iam/dictionaries`，路由文件`src/features/iam/routes.ts`。
- 正式binding：`src/features/iam/dictionaries/pages/DictionaryManagementPage.vue`。
- 唯一canonical：`components/DictionaryManagementPageView.vue`；Preview仍经`public.preview.ts`使用隔离Fixture，不反向导入正式API。
- 正式静态注册表：`src/features/iam/dictionaries/iam-resource.registry.ts`。旧`dictionary-resource.plan.ts`已移除，不再作为扫描入口。
- Page Contract revision 4按用户后续决定改为页面与按钮资源判权，取消前端SA身份前置检查；布局和八个写资源码保持原方案，Approval只覆盖本次字典页面。

## 正式运行行为

真实客户端使用统一requestApi与`/api/iam-admin/Dictionary/*`，不加tenant_id/tenant_ids。页面仅依据当前页与按钮资源判权，不读取或推断SA身份、不依赖is_sa、不额外调用CurrentProfile。有页面查询资源即可只读，八个写按钮按资源码分别显示并仅分配给SA。后端写接口继续强制SA及精确Function校验；原SA字段补充建议已撤回，后端无需为此页面补充字段。

字典及值支持查询、新建、编辑、独立启停，没有Delete/DeleteItem入口或请求。IDs使用int32；version严格接收/回传原始字符串，包括`"0"`，数字版本响应直接拒绝。请求统一检查成功/错误envelope与reason_code，401走通用失效，冲突保留输入，未知写入不自动重试或刷新令牌后重放。

URL保存`dictTypeCode`、`keyword`、`status`、`pageIndex`、`pageSize`。已提交条件去首尾空白；同条件URL更新不再次发起Query，浏览器返回/前进恢复条件并查询。权限刷新不销毁同页草稿，未就绪显示加载状态，不能短暂冒充无权限。

## 系统资源维护交接

正式扫描目录即上述Feature，唯一活动registry提供Menu、八个Button、resource_element、用途/场景说明及通信事件。角色直接关联Permission，不使用权限包。模板展示父级为`iam.dictionary.view`，默认联动均false，不自动授予子权限。

| 前端资源码                    | Permission模板key           | 业务Function                            |
| ----------------------------- | --------------------------- | --------------------------------------- |
| IAM.DICTIONARIES              | iam.dictionary.view         | QUERY、QUERY_ITEMS                      |
| IAM.DICTIONARIES.CREATE       | iam.dictionary.create       | CREATE、QUERY                           |
| IAM.DICTIONARIES.UPDATE       | iam.dictionary.update       | UPDATE、QUERY                           |
| IAM.DICTIONARIES.ENABLE       | iam.dictionary.enable       | ENABLE、QUERY，已有值面板时QUERY_ITEMS  |
| IAM.DICTIONARIES.DISABLE      | iam.dictionary.disable      | DISABLE、QUERY，已有值面板时QUERY_ITEMS |
| IAM.DICTIONARIES.CREATE_ITEM  | iam.dictionary.create-item  | CREATE_ITEM、QUERY_ITEMS                |
| IAM.DICTIONARIES.UPDATE_ITEM  | iam.dictionary.update-item  | UPDATE_ITEM、QUERY_ITEMS                |
| IAM.DICTIONARIES.ENABLE_ITEM  | iam.dictionary.enable-item  | ENABLE_ITEM、QUERY_ITEMS                |
| IAM.DICTIONARIES.DISABLE_ITEM | iam.dictionary.disable-item | DISABLE_ITEM、QUERY_ITEMS               |

Function前缀均为`IAM.DICTIONARY.`。本页已移除身份核验元素和Auth/CurrentProfile调用链；框架原有CurrentProfile自服务请求保持原状，不属于本页Permission模板。权限码兼容字段仅供V3目录导出；正式运行只使用大写资源码及CurrentPageResources，不读取或合并旧权限字符串。

已从后端完整Schema 3.0离线目录导入12个真实字典Function，旧180个Function定义逐项保持不变；快照共192项。全宿主目录包含Delete/DeleteItem是后端事实，但本页九个Permission模板不包含这两项。来源导入不代表当前部署已验收，更不代表已经入库或授权。

前端离线资源产物及目录已更新；没有调用维护API、写数据库、设置SA权限或重启后端。维护方需按批准范围登记Menu/八个Button/对应Permission，并显式给适用SA角色授权。服务端菜单应返回该Menu，前端不硬编码复制菜单或排序。

## 通信复核边界

候选阶段local/mock已升级为十条字典业务链；本次仅退役字典专用的SA身份自服务链。API端口委托与唯一requestApi分开说明，不把委托误算成第二次HTTP；初始值仅操作草稿的分支仍无HTTP。所有模型输入/弹窗开关逐项归local。

旧路由表只新增本正式入口，旧Guard及实际请求不变。因路由import闭包变化，重新绑定app/router、main等受影响源码，以及shared-http-transport、shell.error-navigation两条旧链的依赖指纹；旧链请求声明和180个原有Function均原样保留。没有全仓自动认可未知调用。

## 验证及尚待配合

### 当前修复：接口状态大小写

用户实际QueryItems响应中，考试题型字典（id=35）status为active，三个字典值status为ACTIVE，触发了前端只认小写的校验。已在唯一字典API适配层统一已知状态的大小写，覆盖列表、值、父字典、新建初始值及所有写接口响应，保证抽屉、编辑选择和启停按钮使用同一内部状态。

只接受大小写无关的active/disabled；历史值null保留未设置，未知、空或缺失状态继续拒绝。ID、原始version、资源/字典编码、ext_data和is_available保持原样，不猜测可用性，不修改数据库。API路径、请求DTO、鉴权与资源声明不变，通信清单仅复核本Feature API源码及其依赖指纹，所有请求声明和分类原样保留。

27项正式HTTP装配浏览器测试在三个标准桌面视口通过，包含用户报告的三种考试题型、大写读写响应、启停后状态与原始版本、非法状态拒绝和历史null；采用受控响应，不写真实数据库。Lint、正式类型检查、测试类型检查和生产构建通过；全量quality继续执行并单独记录。

另复用正式bundle和用户报告的响应形态，在1366×768、1440×900、1920×1080实际打开考试题型抽屉，3项复现检查通过并人工核对截图：三条题型均正常展示为启用/可用，编辑表单保持启用状态，无该校验报错和页面横向溢出。截图位于`C:/Users/75946/AppData/Local/Temp/iam-dictionary-status-case-20261029/exam-types-*`，不更新任何批准或基线。Browser插件及ego工具不可用，沿用项目Playwright工作流。

本次完整`pnpm quality`执行结束：Lint、118项治理测试、全部类型检查、生产及UIDesign构建、5项生产路由检查通过。969项浏览器测试中864通过、24跳过、81失败；字典相关60项（27项正式装配、30项Preview交互、3项批准基线）全部通过。与修复前963项（858通过、24跳过、81失败）逐项比较，81项失败清单完全一致，无新增失败；未改写基线掩盖原有视觉差异，全量命令仍非零退出。

日志：`C:/Users/75946/AppData/Local/Temp/iam-dictionary-status-case-quality-20261029.log`；对照：`C:/Users/75946/AppData/Local/Temp/iam-dictionary-status-case-20261029/quality-comparison.json`。原有失败清单摘要仍为`670ba2a52a42d6a1a9c953daacf8eb73e6e1c120fceea3322dd8a8cfcef83801`。

### 当前：修订4采用页面与按钮资源授权

用户明确取消is_sa方案，前端已移除该字段依赖、字典页身份请求及专用身份元素，原后端字段补充建议已撤回。页面及八个写资源码保持稳定，资源维护方只需按原码登记并仅向SA分配写按钮Permission；不会自动修改数据库或角色授权。框架原有CurrentProfile资料请求保持原样。

本次54项字典浏览器检查通过：21项正式接口装配、30项Preview交互与恢复、3项批准基线。正式测试的CurrentProfile响应不含is_sa，并验证只有框架的一次资料请求；有查询资源即可查看列表和值，无写资源不显示写按钮。另验证按钮误授时后端AUTH_SA_REQUIRED拒绝正确展示，不能冒充成功。以上采用受控HTTP响应，不声称已完成真实数据库授权验收。

Lint、正式端/UIDesign/测试类型检查、两端构建、118项治理测试及本页production profile均通过；Premium严格静态审计为0错误、0警告。浏览器工具不可用，按项目既有Playwright验证三个标准桌面视口。全量质量回归另行记录结果，不据专项通过宣称全绿。

修订4全量`pnpm quality`已执行结束：963项浏览器用例中858通过、24跳过、81失败；前序所有门禁及5项生产路由检查通过。与修订3的960项（855通过、24跳过、81失败）逐项对照，失败清单完全一致，无新增失败；全量仍因既有81项视觉差异非零退出。对照摘要SHA-256仍为`670ba2a52a42d6a1a9c953daacf8eb73e6e1c120fceea3322dd8a8cfcef83801`，未更新其他页面基线来绕过差异。

本次日志：`C:/Users/75946/AppData/Local/Temp/iam-dictionary-resource-authorization-quality-20261029.log`；对照报告：`C:/Users/75946/AppData/Local/Temp/iam-dictionary-resource-authorization-20261029/quality-comparison.json`。正式字典仅保留10条业务调用链、9个Permission模板，身份链已退役，其他调用链请求声明及192个权威Function定义保持不变。

受控HTTP浏览器测试覆盖URL初始条件、一次查询、回退恢复、所有新建编辑DTO、四个启停版本体、无is_sa字段时正常查询、只读无写按钮、拒绝路由、后端SA拒绝、响应数字版本拒绝和未知写入不重试。Preview继续独立验证原子初始值、JSON、冲突、父子状态和草稿恢复。

真实用户环境验收仍需资源维护方完成入库授权，写按钮仅分配给SA，再由实际已授权账号执行只读及经批准的写操作；无需等待后端身份字段。不得将浏览器HTTP拦截测试宣称为真实数据库联调，也不把离线ready_for_sync视为已授权。

### 历史：修订3正式化初验

- `pnpm lint`通过，包含资源描述、页面标记、目录、归档、精确资源码与通信证据校验。
- 资源治理测试118项通过；明确登记新增正式入口后更新数量断言，没有关闭旧入口归档或权限边界检查。
- 正式端、UIDesign及测试代码类型检查通过；正式端和UIDesign构建通过，生产路由隔离检查5项通过。
- 字典真实HTTP装配测试18项通过；Preview交互、启停、恢复测试30项通过；本页已批准的三视口基线3项通过。以上使用受控响应，不写入真实数据库。
- 另以正式bundle在1366×768、1440×900、1920×1080检查AppShell内列表和字典值抽屉，3项通过，并人工核对截图。测试资料补齐CurrentProfile完整字段，避免将不完整Fixture产生的框架资料警告误判为产品缺陷。
- 离线产物：28/42个正式入口有完整资源声明、75个Button、103个Permission模板、192个权威Function，未决通信候选为0；`runtime_activation_ready=false`，不宣称已全量启用授权。

全量质量命令的浏览器回归结果单独记录，不能用上述局部通过代替全量通过。已有其他页面基线差异不在本次批准范围内，不自动改写其Approval或截图。

### 历史：修订3全量回归结论

`pnpm quality`已完整执行到浏览器回归结束，前序Lint、118项治理测试、全部类型检查、两端构建和5项生产路由检查均通过。浏览器960项中855通过、24跳过、81失败，因此全量命令仍为非零退出，不能宣称全绿。

与本次正式化之前的记录（939项：834通过、24跳过、81失败）逐项比较，81项失败的项目、文件及用例名称完全一致，本次新增失败为0、修复旧失败为0。新增18项正式装配测试及3项本页批准基线全部通过；连同原30项字典Preview交互测试，本页共51项通过。

既有失败分布：其他已批准canonical Preview基线75项、登录生产视觉3项、物流总览视觉3项。归一化失败清单的SHA-256为`670ba2a52a42d6a1a9c953daacf8eb73e6e1c120fceea3322dd8a8cfcef83801`；对比忽略用例源码行号，不忽略用例名称或窗口尺寸。没有通过重置旧截图来消除这些差异。

本机原始记录：`C:/Users/75946/AppData/Local/Temp/iam-dictionary-production-quality-20261029.log`；对照报告：`C:/Users/75946/AppData/Local/Temp/iam-dictionary-production-20261029/quality-comparison.json`。正式框架六张人工核对截图位于同一临时目录的`formal-shell-*`、`formal-values-*`，不作为其他页面的新基线。
