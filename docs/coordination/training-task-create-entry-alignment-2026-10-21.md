# 培训计划新建任务入口：前端修复与协同核对

日期：2026-10-21。前端工程：`D:/project/SS.Express.Web`。

## 结论与前端改动

原设计为：**发布计划不自动创建任务**；在计划详情内手动创建月度、季度或临时任务。后台定时作业推进已有任务，不负责按月/季度生成新任务。本次不改变该设计，也不推进尚待独立批准的常设计划生产改造。

前端已发现额外限制：拥有“新建培训任务”权限后，还要求拥有课程管理、考试管理两个页面权限，才显示入口。现改为只检查该按钮自身的精确资源授权；提交入口也保留同一权限检查。仍保留“计划已发布、年度计划至少一名当前员工”的可用性校验，不自动给 SA 或其他角色补权。

正式实现：

- `src/features/training/operations-archive/pages/TrainingPlanDetailPage.vue`：真实接口与授权装配。
- `src/features/training/operations-archive/components/TrainingPlanDetailPageView.vue`：唯一页面结构、创建抽屉。
- `src/features/training/operations-archive/iam-resource.registry.ts`：已有资源、元素、通信关系及 Permission 模板。

## 系统资源维护会话核对项

复用现有身份，不新建重复资源，不重新初始化或清空授权数据：

| 项目              | 稳定身份                                      |
| ----------------- | --------------------------------------------- |
| 隐藏计划详情页    | `IAM.TRAINING.PLANS.DETAIL`                   |
| 正式路由          | `/iam/training/plans/:planId`                 |
| 新建任务 Button   | `IAM.TRAINING.PLANS.DETAIL.BUTTON.CREATETASK` |
| 元素              | `iam.training.planDetail.createTask`          |
| Permission 模板键 | `training-plan-detail.createTask`             |

此 Permission 的真实调用涉及以下已有接口，均为 POST：

- 打开/远程候选：`/iam-admin/TrainingCourse/Query`、`/iam-admin/TrainingExam/Query`。
- 已用周期查询及成功刷新：`/iam-admin/TrainingTask/Query`。
- 创建：`/iam-admin/TrainingTask/Create`。
- 成功回读：`/iam-admin/TrainingPlan/Detail`。

请按注册表和后端权威 Function 清单核对组合、有效性与所属关系。只有经批准的当前 Tenant 角色才直接分配对应 Permission；父级展示关系不构成授权继承。拥有此能力不应附赠课程/考试管理 Menu 或其管理动作。

运行时应核对 `CurrentPermissionResource/CurrentPageResources` 对该详情页返回 `can_access=true`，并在确实拥有创建权限时将上述 Button 放入 `button_resource_codes`。若未返回，前端隐藏入口是预期行为，应检查有效角色授权，不做前端兜底放行。

## 后端配合核对项

本次入口修复使用现有接口，**不需要新增 API，也不要求发布时自动生成任务**。请核对：

1. 候选查询依据组合 Permission 中实际拥有的 Function 放行，不额外强制拥有课程/考试管理页面或 SA 身份；若已如此，无需改动。
2. 创建及候选范围仍限定当前 Tenant；计划状态、员工范围、课程/考试有效性、周期、幂等和审计等服务端校验保持不变。
3. 若 Button 可见但候选查询返回 403，核查 Function 组合和后端鉴权，不通过授予无关页面权限掩盖缺失。

## 验收与执行边界

- 只授予计划查看与新建任务能力、不给课程/考试管理 Menu，也能打开抽屉、加载候选并创建。
- 没有创建 Button 时不显示入口、不加载创建候选；草稿或无员工的年度计划仍禁用。
- 候选 Function 缺权时正常报错，不绕过后端；创建失败保留输入和同一 `request_id`，成功回读计划和任务。

本次会话只修改前端代码、离线声明及回归用例，不修改后端、数据库、角色授权或部署。三视口使用隔离测试环境和模拟 API 验证；真实环境的目录/授权回读及联调由相应维护会话执行。未更新人工 Approval 或截图基线，既有常设计划复审阻断保留。

## 本次前端验证记录

- 新增 5 个场景 × 3 个标准桌面视口，共 15 项回归全部通过：精确 Button 授权、无权隐藏、草稿禁用、无员工年度计划禁用、候选 Function 403。创建流程同时覆盖键盘打开、失败保留输入、幂等重试、重复提交防护与成功回读。
- 使用工程 Playwright 在隔离端口 `4373/4374/4375` 验证生产构建与页面身份、非空、无框架错误覆盖层、正常成功流程无运行异常及抽屉视觉；模拟 API 不代表已验证本机真实角色授权。当前无 Browser 插件且无可用 ego-browser CLI，未安装额外依赖。
- Lint、113 项治理测试、生产/Preview/测试类型检查、两个构建、5 项生产路由测试及 Premium 严格静态审查通过。
- `pnpm quality` 最终为 660 通过、81 失败、24 跳过；81 个失败与修改前逐项一致（75 个 Preview 基线、3 个登录基线、3 个旧 Dashboard 断言），没有新增失败，不能宣称全量质量门禁已通过。
- 1,619 个通信候选的身份及去行号内容与修改前相同；只在复核两个文件的权限判断及新增静态导入后重绑受影响离线依赖证据，没有新增资源、Permission 或 Function，也没有改变模板组合。
