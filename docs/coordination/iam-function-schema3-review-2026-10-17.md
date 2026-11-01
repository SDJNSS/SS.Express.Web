# Function Schema 3.0 导入与通信证据复核

用户批准修复正式导入/校验链，并维护系统资源目录新增、编辑 Permission 及现有页面包。本次不修改页面 UI、运行时守卫、业务调用、候选分类或角色绑定。

## 权威来源与差异

- 后端目录：`D:/project/SS.Express.Platform/Src/IAM/Admin.Api/iam-function-resource-catalog.json`，Schema 3.0，全宿主离线程序集导出，共 6 个 Host、188 个 Function。来源 SHA-256：`6a2a964483f7b8ef0c86d48c4c1a4ea35b372332e0c3fbdb9f9c5695158c08fb`。
- 旧导入来源 SHA-256：`8f751ca398729c1e6cd010de6b7bdb026aebb8714bee906e2180a2fcfb294002`，182 项。
- 已审核的 458 条通信链、733 条请求引用 127 个不同 Function。逐项比较资源码、名称、提供 App、service、Method/Path、读写、鉴权类别、可组合性与 lifecycle，全部不变；源码依赖、候选集合、请求映射及原分类复验不变。
- 已引用项的完整定义差异仅为删除 `allowed_consumer_app_codes`、增加显式 boolean `high_risk_permission_operation`。新规则允许 business + composable=true 跨 App 复用，提供方资源归属不变；高危标记不代表普通用户获权即能操作，服务端 SA/显式 API-Key 二次闸门仍适用。
- 目录中未被本次通信链引用的旧端点移除、新文档端点、平台品牌端点及 App 维护分类变化只随权威快照保留；不新增前端映射、不据此删数据库或扩大 Permission。

## 审核与门禁

导入器严格验证 Schema、全宿主 scope/export_mode、Host 唯一性/complete/数量/服务归属以及 Function 必填高危标记。显式绝对路由可以不在约定前缀下（例如司机端 /WeatherForecast），不据此重写路径。通信指纹覆盖高危字段；回归测试验证改动高危声明后旧证据失效，不删除哈希校验。只在逐项差异和原源码证据校验通过后刷新现有链的 Function 指纹并引用本文件，不将 pending 自动升级为 reviewed。

新增与编辑资源 Function 的高危属性已对照当前 `PermissionResourceController` 的 `[HighRiskPermissionOperation]`。其它权限维护高危标记继续受服务端声明与二次闸门保护，本次不修改后端鉴权。

维护模板仍由原注册表表达：新增包含 App Query、Resource Query/Create；编辑包含 App Query、Resource Query/Get/Update。不因在同页而互相授予另一项写 Function。

该复核是离线源码/目录证据；没有宿主独立 Manifest Key，不声称已核验部署清单或普通用户最终授权。实时数据库、API 能力、版本和包成员由维护任务单独回读核对。
