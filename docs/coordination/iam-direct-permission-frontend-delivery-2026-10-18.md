# IAM 角色直接 Permission 授权前端交付

日期：2026-10-18。正式工程：`D:/project/SS.Express.Web`。

## 当前实现

- 授权关系：当前 Tenant 成员 → Role → Permission → PermissionRef → Resource。SA 同样按明确授权判权，不通过父链、结构菜单或角色类型推断权限。
- 角色授权仍为 `/iam/roles/authorization`，用户有效权限仍为 `/iam/members/effective-permissions`；唯一正式目录为 `src/features/iam/permission-governance/pages/`。角色分配不变。
- 两个权限包入口、五个专用生产/视图/组合模块及对应规格、Approval、基线移入 `archive/iam-permission-packages/2026-10-18/`。不再生产注册、Preview 装载或扫描；共享树改为 `components/PermissionTree.vue`。不操作数据库，不删除已有资源、Permission 或角色关系。
- 角色页使用 Query、QueryEligiblePermissions 和分页 PermissionScheme/Query（include_details）加载候选与资源详情，避免逐 Permission 请求 Get。完整候选、角色/快照版本必须一致；缺失已授权对象或其 App 时禁止覆盖保存。
- App 为分组；目录中已知的 Module/页面归属为只读分组，Permission 按显式 parent_permission_id 展示。资源与 Function 只读。结构父链不是实际授权。
- 复选框只控制当前 Permission。主动勾选才沿连续开启默认联动且有效、可授予的子项传播；下级允许取消。取消上级不撤销下级。初始化、刷新、搜索、目录变化不重新联动。
- 全选/清空当前 App 是独立草稿操作，显示实际变更数，保存前显示新增/移除名称。搜索不改变授权；API Path 支持大小写不敏感子串查询。点击名称只查看详情，箭头控制展开；勾选保留折叠与滚动位置。
- 键盘 Space/Enter 只操作聚焦的 Permission；分组/资源不代为勾选后代，左右箭头只展开/收起当前分支。
- Save 提交明确 permission_ids（允许显式空数组）、role_version、snapshot_version、request_id。ID/版本无损保留字符串；租户、路由和异步响应隔离，失败保留草稿，不伪造成功。
- 用户有效权限由 QueryUserPermissions 的原子快照展示 Permission/Resource 及来源角色，彻底移除包层；缺失未授权父 Permission 不会隐藏已有子权限，整页只读。
- 权限新建/编辑/复制支持展示父项及默认联动；根提交 null，不是 0。候选限定当前 Tenant/App，排除本人及后代；含写 Function 的权限不能开启默认联动。新建先 inactive，再完成已有资源组合/激活流程。

## 资源维护与通信审查

- 完整产物 `artifacts/iam-maintenance.frontend.json` 为 Schema 3.0，移除 package_templates；95 个 Permission 模板携带 parent_permission_key/default_selected_with_parent。父模板来自正式资源归属，默认联动全部 false；维护端解析 ID，不据此自动授权。
- 六个保留 IAM 基础页、培训与各正式入口仍扫描；不是只扫描本次五页。
- 退役 Package 请求链、旧页面候选与请求包装已移除；新增候选、明细、父权限下拉框、直接授权保存及用户来源链逐项对应准确 Function。普通查询/刷新/分页仍使用页面 Permission，不凭标题猜 API。
- 其他 Feature 的注册表只调整模板层级元数据；共享 HTTP、认证、上传与业务调用未改。其未变化的调用分类复用既有证据，依赖闭包因注册表变化重新绑定并记录本次审查；不以重算哈希替代新增调用分析。
- 后端离线 Function 目录现为 179 项。导入不证明当前服务已重启或真实用户授权已验收。
- 离线 complete/ready_for_sync 与实际 runtime_activation_ready 分开报告；不自动激活现存 22 个 Legacy 元数据入口，不执行资源同步、Adopt、角色赋权或密钥配置。

## 后端配合项与上线边界

1. **业务 RequestStatus 尚缺**：后端文档要求结果未知先查状态，但当前 `/MaintenanceContext/RequestStatus` 仅供维护凭证使用。浏览器不接入 API Key，不调用受限维护接口。角色 Save 结果未知时前端停止重提，保留草稿，仅经确认后回读核对。若需完整恢复协议，后端应提供普通 JWT 可用、当前 Tenant/目标角色/原 request_id 严格绑定且不泄露他人请求的查询端点、DTO 与权威 Function 声明。
2. 候选接口当前只返回摘要，前端使用现有分页 Query(include_details) 批量补齐。未来可支持候选批量明细，但不是本轮上线的阻断项，也不要求新增统计接口。
3. 后端已清理旧包关联、直接授权初始为 0 是后端交付事实；前端不自动补授 SA。由资源维护会话按批准范围重新读环境/版本，显式维护 Permission 与角色绑定，再做真实用户导航、页面、Function、缓存失效验收。
4. 前端与后端契约须一起部署。后端已移除包表和端点，单独回滚旧前端不是有效回退；需要回退时由后端按其备份/回执制定兼容部署方案，禁止前端重放旧包 ID 或清理命令。

## 验证

- 生产/Preview 构建、Lint、生产/Preview/测试类型检查、109 项治理测试、5 项生产路由检查均通过；其中包含 9 项直接授权纯规则测试。此前 132 项三视口定向检查通过。
- 最终直接授权浏览器检查为 **27/27 通过**（9 个场景 × 3 个视口），覆盖明确集合保存、字符串 Int64/双版本、默认联动、无继承、只读边界、候选不完整受控拒绝、模糊 API Path 搜索、未知结果禁止重提、键盘与折叠/滚动保持。
- `pnpm quality` 已完整执行，结果 **613 通过、83 失败、24 跳过**，没有宣称全绿。其中 78 项为截图基线差异（75 项 Preview、3 项登录生产页），3 项为 Dashboard 旧 `今日运输单` 文案断言不再符合当前页，另 2 项为新滚动测试在折叠动画结束前记录滚动位置的时序问题。最后两项已改为等待分支真正隐藏，原滚动断言未放宽，随后上述 27 项全部重跑通过；未再次全跑整条 quality，也未修改其余 81 项或已有跳过策略。
- 角色页当前截图已人工查看，操作栏、明确勾选与完整名称展示正常。未安装可用浏览器插件/Ego CLI，本轮采用工程 Playwright；没有用基线更新命令掩盖差异。
- 资源目录、资源元素、退役审查及维护产物检查通过：27/41 个注册入口、95 个 Permission 模板、0 unresolved，`complete=true`、`ready_for_sync=true`，但 `runtime_activation_ready=false`（22 个既有 Legacy 元数据入口未擅自激活）。维护 Skill 离线编译为 279 个资源、95 个 Permission、0 问题，`database_verified=false`、`runtime_verified=false`。
- 模拟接口浏览器验证不等于在线联调；本轮未使用真实身份写角色授权或访问数据库。
- Contract 已更新，Approval 和五个活动页面的批准基线未自动更新；需按正式设计流程复审本次变化。

## 尚未完成的验收与责任

- **前后端业务联调**：由部署/维护方确认新版本运行，按已批准范围明确初始化直接 Permission 及角色绑定；再核验 SA、普通管理员和无权用户。前端本轮未取得新的在线赋权授权，不代为重新初始化或补权。
- **保存未知结果恢复协议**：后端补充上文普通 JWT 的 RequestStatus 契约后，前端再接入。本轮安全降级是阻止盲重提并人工确认回读，不等同完整状态查询协议。
- **视觉发布门禁**：UIDesign 审核人复审变化后的页面/Contract，再按正式流程更新 Approval 与三视口基线。当前生产门禁对角色授权页仍正确阻断旧 Approval 复用。
- **全量回归剩余项**：前端在视觉结论确认后逐项处理基线差异，另核对 Dashboard 当前规格与旧文案断言。其后重跑完整 quality；不得把本轮直接授权定向测试通过写成项目全量质量通过。
