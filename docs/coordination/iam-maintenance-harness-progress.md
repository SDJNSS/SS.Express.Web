# IAM 自动维护收尾：Harness 执行记录

日期：2026-09-27。用户已授权本次采用前端、后端、系统资源三方协同。

> 最新状态（22:13 清理后复验）：用户已手动清除旧模型资源。四 App 仍在，但当前与含软删除资源均为 **0**，四个默认 Module ID 均为 `0`，重复只读查询结果一致。本文下方的 205/210 条快照和保 ID 迁移分类仅为清理前历史，已不能据其执行。没有因用户清理而自动取得初始化或授权写入许可。

## 清理后的下一步

- [清理后只读证据](C:/Users/75946/Documents/ChatGPT/物流平台项目/artifacts/iam-maintenance-post-cleanup-2026-09-27-2212/read-summary.json)：仅四 App resource Profile；未发 Impact、scheme/role 或任何写入请求。
- 冻结的 99 条前端、175 条四 App 后端定义需重新形成初始化计划，不再采用此前的旧资源身份迁移候选；默认 Module 也需纳入恢复计划，不能重复创建仍存在的 App。
- 用户随后明确确认 Permission、Package 及角色授权关联数据也已清理，后续采用全新初始化，不再执行旧资源迁移。这是用户提供的环境状态，尚未通过 scheme/role Profile 独立回读；实际写入前仍须核验目标租户范围与空库状态。
- 前端仍有旧版 `meta.permission` / `v-permission`，仅 V2 标记路由使用 `CurrentPageResources`。已登记资源不代表运行时判权已切换；重新建档后仍需核验这些保留页面，不能直接承诺授权恢复。依据：`src/app/router/index.ts`、`src/app/providers/permission.ts`、`src/app/store/session.ts`。
- 当前维护配置的写入仍关闭。全局资源沿用 DMS/IAM/TMS/VMS 四 App；具体初始化哪些 Tenant 的 Permission/Package，以及是否给这些 Tenant 的 SA 分配全部业务包，尚待用户确认。跨 App 消费者处理及当前运行时判权兼容性仍需纳入执行前核对。

## 范围与边界

- 任务依据：[未完成项原因与责任分工](iam-maintenance-open-items-and-owners.md)，处理 U1～U7。
- 前端事实源：`D:/project/SS.Express.Web`；后端：`D:/project/SS.Express.Platform`。不扫描文档工作区的旧前端副本。
- 不重写业务，不为静态 Overview 补造统计接口，不把未接入的培训交互声明为已上线功能。
- 不自动批准视觉差异，不批量更新截图基线；不因工具检查通过就声称线上授权生效。
- 当前系统资源任务为只读环境审计。实际写入须先给出目标、计划与影响范围，不删除旧资源、不收养人工资源、不盲目全量授权。

## 任务分工

| 执行方 | 负责内容 | 交付记录 |
| --- | --- | --- |
| 主 Agent | 通信链审查、跨方契约核对、集成、最终验收 | 本文及通信 inventory |
| 前端迁移 Agent | 16 个正式入口登记、resource_element、真实操作与模板对应 | `iam-maintenance-harness-migration.md` |
| 前端治理 Agent | 候选级证据、注入依赖失效、占位入口证据、生成器与测试 | 治理检查及测试记录 |
| 前端质量 Agent | 测试服务隔离、溢出修复、视觉差异分类、全量质量复跑 | `iam-maintenance-harness-quality.md` |
| 后端兵马使 | Function/Manifest/维护契约、自服务接口及后端验证 | `D:/project/SS.Express.Platform/Doc/Engineering/iam-maintenance-harness-backend-readiness.md` |
| 系统资源经略使 | Capabilities/Targets、运行清单、数据库与授权只读审计 | `C:/Users/75946/Documents/ChatGPT/物流平台项目/docs/iam-maintenance-harness-resource-readiness.md` |

浏览器测试同一时间只由质量 Agent 执行。原始结果已另存，避免新一轮覆盖既有证据。

## 已确认的新问题与进展

1. 培训概览横向溢出来自页面提示条 `width: 100%` 与左右外边距叠加。已做局部修正，三视口容器检查及写入恢复专项共 6 项通过；最终质量结果及历史债务见下文。
2. 登录后的框架用户信息曾读取 `Membership/QueryUsers`，会把用户管理业务查询变成所有登录者的隐含依赖。后端已提供 `Auth/CurrentProfile`（会话自服务、不可组合），前端已接入并丢弃旧会话慢响应；没有放宽 QueryUsers 或给普通用户增加用户管理权限。
3. 培训生产绑定与 Preview 存在部分行为差距。迁移仅登记实际回调链；未实现行为单独列明，不能靠注册表声称已经接入。
4. 通信 inventory 已升级到 v2 候选分类和调用链证据：请求精确匹配并锁定后端 Function 定义，注入 provider、源码依赖或 Function 的消费者/读写分类改变都会使审查失效。生成器不得把 pending 自动改为 reviewed。

## 当前收尾结果

### 离线维护声明

- 43 个生产组件入口：29 已登记、8 占位已验证、6 认证/辅助；原 16 个待迁移入口已经登记，保留原运行时判权。
- 99 个前端资源、220 个元素、65 个业务 Button、94 个 Permission 模板、29 个 Package 模板。
- 216 个源码、1,662 个候选、459 条通信链；0 pending，`iam:maintenance:ready` 实际通过。
- 后端权威快照 177 个 Function。IAM 本机运行清单 167 个，与对应静态定义逐字段一致；其他服务的静态来源不能冒充完整部署证明。
- 最终源内容 hash：`5094d4c748d4c607f764746fad84fb2d53f60a193bc294b8441596a512fcbc51`。
- 最终清单内容 hash：`9fb0429e8b2a909335255edf73bd69a5d99b694bed182779273c7b29414bbba1`。

这些 `complete/ready_for_sync` 标志只表示离线声明就绪，不是线上写入授权。

### 验证与不扩展事项

- 完整 Lint 通过；80 个治理测试通过；生产/Preview/测试 TypeCheck 通过，生产与 Preview 构建通过。
- 生产路由 3/3；模块请求专项 21/21；最新全量浏览器为 **500 通过 / 82 失败 / 24 跳过**，无服务中断、无 flaky。82 项由 69 项历史截图差异与 13 项测试契约不匹配组成；后者修复后的专项为 **19 通过 / 8 原有跳过 / 0 失败**，覆盖这 13 项及内容容器检查。没有再跑第二次全量，不能写成全量 quality 全绿。详见质量报告。
- CurrentProfile 成功、失败降级、旧会话慢响应丢弃三场景在三视口均通过。Premium strict 静态审计 0 findings；DESIGN.md 保留既有 4.30:1 对比度警告，本轮不改主题。
- 用户指出系统资源任务不应混入视觉审批后，已撤回基线审批请求。**不改 Preview、不改批准记录、不更新视觉基线**；历史截图差异单列，不将其当成资源数据库缺陷。
- 独立抽查补齐了共享 `pg.tree.retry` 经角色/用户宿主触发的 QueryRoles / QueryUsers 条件读取。具体宿主模板原本已声明，不合并成全局无条件授权。
- 独立抽查还发现三个权限编辑页的“原请求标识重试”无前端 in-flight 锁；服务端幂等不等于阻止重复 HTTP 提交。这是既有交互风险，本轮未扩展业务重写，不能声称已经修复。

### 本机只读核验

- 用户批准仅 DMS/IAM/TMS/VMS 四 App 只读。后端于 21:55:54 +08:00 配置生效，IAM `http://localhost:5180`，PID 27528；DMS `http://localhost:5222`，PID 12976。
- resource Profile 允许上述四 App，`AllowedManagedKeyPrefixes` 保持空，写入继续关闭；不启用 YMS、scheme/role，不同步、Adopt、Delete 或给 SA 分包。
- 维护方已完成 205 条当前资源、210 条含软删除资源的全分页及稳定性核验，快照版本一致；未返回批准范围外的 App。
- 冻结前端 99 条定义：27 条同码迁移候选、72 条未匹配。批准四 App 的后端 175 条定义：1 条同码、94 条唯一同接口异码、18 条同接口多对象、62 条未匹配。各数按期望定义计数，不能直接当作创建/删除数量。
- 当前 205 条均为未受管的旧模型资源；不是 205 条坏数据。31 条现存记录未被期望身份映射覆盖，其中 4 条有明确前端退役声明，但仍未授权删除。
- [四 App 最终只读差异与精确 ID/编码索引](C:/Users/75946/Documents/ChatGPT/物流平台项目/docs/iam-maintenance-four-app-readonly-diff-2026-09-27.md)已交付。所有计划项均不可执行；本轮未写入或更改既有授权。

### 后续边界与责任

1. **系统资源维护方**：获批后，先用 `PermissionResource/Impact` 对明确迁移/冲突/退役候选读取引用影响。它可能返回关联 Tenant、Permission、Package、Role 元数据，超出本轮仅四 App 目录读取的范围，须单独批准；暂不启用 scheme/role。
2. **后端方**：确认 Impact 是否覆盖仍在使用的 Legacy 授权存储；现有 Update/Adopt 不解决 source、类型、资源码迁移，需要在影响明确后制定保 ID、保授权的受控迁移方案。不能由前端或维护方绕过接口写 SQL。
3. **部署方**：其他服务完整运行清单仍需补证；IAM 完整运行清单、DMS 公开文档一致性不能替代所有服务的部署验证。
4. **前端方**：U1～U3 声明与证据整改完成，U5 溢出修复完成，U6 测试服务及契约问题已处理；U4 历史视觉差异独立保留，不影响本轮资源差异定因，也不能声称全量质量全绿。

下一步仅建议批准只读引用影响分析。资源迁移、接管、新建、退役、Permission/Package 同步和 SA 授权均仍未获准，不能据离线 ready 自动执行。

## 验收口径

分别报告：前端声明完整性、工程质量、运行清单/数据库验证。任何一层未通过，都明确保留未完成状态；不以单一总数掩盖未验收项。

本轮前端整改及获批四 App 资源只读比对已交付。U7 的引用影响、数据库迁移与有效授权验收尚未完成，本文不是全量同步或线上授权生效证明。
