# 字典管理前端交付与联调边界

> 历史Preview交付记录。用户现已批准正式开发；当前正式路由、代码和资源入口以`iam-dictionary-production-delivery-2026-10-29.md`为准。旧`dictionary-resource.plan.ts`已移除，正式扫描使用`src/features/iam/dictionaries/iam-resource.registry.ts`，不要按本文历史阶段继续寻找候选计划。

> 后续决策：不采用is_sa方案。正式页按页面及按钮资源判权，写按钮仅分配给SA；本记录中前端独立SA拦截的历史描述已失效。

## 当前阶段

最新后端契约第20节已记录12个端点实现和部署，包含四个独立启停接口。资源入库、角色授权与前端真实联调仍独立；本次继续修改隔离Preview，不以Mock代替线上验收或自动转正。

页面目录：`src/features/iam/dictionaries/`；唯一 canonical view 为 `components/DictionaryManagementPageView.vue`。预览 `?preview=iam-dictionary-management`，状态 reviewing。未增加生产路由，未修改既有业务、数据库、资源或角色授权，未更新 Approval/视觉基线。

## 已实现

- 字典列表按完整编码精确查询、名称等关键词模糊查询；名称和编码均打开右侧值抽屉。两层各自分页、查询、重置、刷新，操作列紧凑。
- 字典和值均为新建/编辑/启用/停用，无删除入口；可选原子创建初始值最多200。保留状态/排序/描述/颜色与JSON完整编辑。
- SA 管理界限和逐操作能力检查；不引入全局 SA 绕过鉴权，不把业务只读接口改为 SA 限制。
- 创建后编码只读，不显示可编辑 ID；原始字符串版本、`"0"` 版本、独立字典/值版本，JSON 标量与 UTF-8 大小校验。
- 启停影响确认、独立版本/权限，默认保留停用记录便于管理；区分值自身status与is_available，父字典停用不改子值状态，启用值不启用父字典。失败保留输入，结果未知禁止重放，创建按编码核实，异步读取防旧结果覆盖；父字典已删除时关闭值维护入口并可返回刷新。

## 资源维护方：暂存计划，勿执行同步

计划定义在 `dictionary-resource.plan.ts`，刻意不是活动 `iam-resource.registry.ts`。页面已带 SDK `resource_element`、稳定前端码和“用途/场景”简述，但它们只属于候选页面。不得从计划中的字符串制造权威后端 Function，或将 Preview 纳入生产资源维护。

| 计划前端资源                  | 用途                                  | 对应后端接口                           |
| ----------------------------- | ------------------------------------- | -------------------------------------- |
| IAM.DICTIONARIES              | SA 管理入口，查询、刷新、翻页、读取值 | Dictionary/Query、QueryItems           |
| IAM.DICTIONARIES.CREATE       | 原子创建字典及可选初始值              | Create；成功后 Query                   |
| IAM.DICTIONARIES.UPDATE       | 修改名称及描述                        | Update；成功后 Query                   |
| IAM.DICTIONARIES.ENABLE       | 启用字典，保留单独停用的子值          | Enable；成功后Query，必要时QueryItems  |
| IAM.DICTIONARIES.DISABLE      | 停用字典，不改变子值自身状态和版本    | Disable；成功后Query，必要时QueryItems |
| IAM.DICTIONARIES.CREATE_ITEM  | 在当前字典新增值                      | CreateItem；成功后 QueryItems          |
| IAM.DICTIONARIES.UPDATE_ITEM  | 修改指定值属性                        | UpdateItem；成功后 QueryItems          |
| IAM.DICTIONARIES.ENABLE_ITEM  | 启用值，不启用父字典                  | EnableItem；成功后QueryItems           |
| IAM.DICTIONARIES.DISABLE_ITEM | 停用单个值，保留数据和历史引用        | DisableItem；成功后QueryItems          |

普通查询/刷新/翻页、编码/名称详情入口共用页面资源；初始值的增加编辑移除仅修改本地草稿，不另造独立业务 Button。SDK 注释和属性是发现证据，不是授权结果。

## 后续就绪条件

1. 后端已报告部署12个端点；资源维护者另行读取实际Manifest核对Function，完成相应资源、Permission组合及授权，再做前端真实HTTP联调。新增的四个Function为IAM.DICTIONARY.ENABLE、DISABLE、ENABLE_ITEM、DISABLE_ITEM。原计划前端DELETE、DELETE_ITEM从未登记为正式资源，本次从计划移除，不授权删除数据库旧资源。
2. 人工审阅 Preview、Page Contract，正式建立三视口 Approval/基线。本次不自行批准。
3. 前端增加真实 HTTP 适配及生产 binding/route；调用经过统一 HTTP/登录失效处理，按 reason_code 分类。接入真实 SA 身份与资源权限，恢复 URL 中已提交筛选/分页状态。无请求加 Tenant、无生产 Mock 回退。
4. 资源维护者从正式页面和真实通信链复核，将计划升级为活动 registry，再登记前端资源与直接 Permission 模板。Function 以运行清单为准，不授予不存在的权限，不执行资源维护自动化写字典数据。
5. 对真实后端执行普通用户拒绝写、SA缺Function拒绝、版本冲突、原子初始值、父子状态独立、默认管理查询、active可用性过滤、重复启停版本校验与未知结果验收。本页不调用Delete/DeleteItem。

## 通信审查说明

新 Feature 的 canonical 文件目前仅由 `public.preview.ts` 的隔离 Fixture 消费，无任何生产路由依赖。候选 UI 的本地输入/开关归为 local；触发端口的方法在当前唯一 Mock 绑定中归为 mock。不存在已验收的真实 Dictionary 请求链；生产接入会改变依赖/调用候选并重新触发审查门禁。

浏览器验证使用项目 Playwright：本机没有 ego-browser CLI，且当前未提供 Browser 插件；不安装额外浏览器或占用用户 4173 服务。候选截图在 `UIDesign/candidates/iam-dictionary-management/`，不是已批准基线。

## 首版验证记录（2026-10-29，启停替换前）

- Page Contract：base、字典页面 preview profile 通过。production profile 按预期被后端未实现、缺少人工 Approval、未配置生产 binding/route 阻断；不进入正式发布。
- 最终源码 Lint、前端/UIDesign/测试 TypeCheck 通过；生产构建、UIDesign 构建及5项生产路由测试通过。治理测试118项全通过（含新增2项稳定编码/JSON校验）。最后补充的父删除恢复逻辑已用新 UIDesign 构建单独复测。
- 字典专项：两个浏览器测试文件、三个桌面视口，共21项全部通过，覆盖CRUD、筛选分页、初始值原子提交与重复编码保留、JSON false/0、SA/Function限制、未保存取消、冲突、未知结果和父字典删除恢复。已查看候选列表及值抽屉截图；未生成批准基线。
- 全量 `pnpm quality` 未全绿：此次927项浏览器检查中822通过、24跳过、81失败。失败项目与此前 `iam-app-handoff-quality-20261029.log` 的81项逐项相同，新增失败0项：75项既有 Canonical Preview 视觉差异、3项登录生产视觉差异、3项物流总览视觉差异。未自动批准或更新任何旧基线。
- 通信审查仅增加本 Feature 六个源码的 local/mock 证据；原真实请求链和权威 Function 不变。活动资源范围仍为27个登记页面，字典候选尚不属于正式资源清单；旧范围 `ready_for_sync` 不能当作字典上线或数据库维护许可。

日志：`C:/Users/75946/AppData/Local/Temp/iam-dictionary-quality-20261029.log`（全量）、`iam-dictionary-final-static-20261029.log`（最终静态检查）、`iam-dictionary-browser-final-20261029.log`（最新构建专项21项）。预览服务保持在 `http://127.0.0.1:4174/?preview=iam-dictionary-management`，使用隔离内存数据。

## 启停替换验证（当前 revision 2）

- 字典/字典值的删除按钮、删除端口和DELETE/DELETE_ITEM资源计划均移除。新增四个独立启停按钮标记和接口意图，保留编辑功能；不会发出Delete或DeleteItem请求。后端删除API仍存在，本次不删除任何数据库记录或已有IAM资源。
- Query新增字典状态筛选，管理默认全部。字典和值显示status，值另显示后端is_available；停用父字典不会伪造子值状态，启用值不会启用父字典。三个视口的默认及停用候选截图均位于`UIDesign/candidates/iam-dictionary-management/`。
- 三个字典浏览器测试文件、三视口共30项全部通过，含启停往返、父子状态独立、权限独立、保留停用记录、active过滤、取消确认、字符串版本/冲突及未知结果禁止重放。新增启停资源标记已验证；仍为隔离Preview，没有真实业务API写入。
- `pnpm quality`实际执行：Lint、118项治理测试、全部TypeCheck、生产及UIDesign构建、5项生产路由测试通过。939项浏览器测试中834通过、24跳过、81失败；逐项对比首版完整日志，81项失败清单完全相同，新增失败0项，均为既有视觉基线差异。未更新Approval或旧基线。
- Page Contract base/preview通过；production仍因缺少人工批准、生产binding及真实授权联调而阻断。后端当前已报告实现部署，不能继续以“后端尚未实现”描述当前阻断。
- 本轮复核仅覆盖字典六个源码的local/mock证据，449条既有真实通信链保持不变，不导入后端Function或写资源数据库。活动正式资源范围保持27页；未来转正时另行维护。

本轮日志：`C:/Users/75946/AppData/Local/Temp/iam-dictionary-status-quality-20261029.log`、`iam-dictionary-status-browser-verified-20261029.log`。失败清单比较结果：`iam-dictionary-status-20261029/failure-comparison.json`。Preview地址不变：`http://127.0.0.1:4174/?preview=iam-dictionary-management`。
