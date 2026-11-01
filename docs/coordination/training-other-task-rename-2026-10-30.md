# 培训任务“其他任务”命名同步

用户要求将新建培训任务类型中的“临时任务”改为“其他任务”，前端相关代码命名同步调整。

- 新建任务、任务列表/详情、档案及统计筛选统一展示“其他任务”或“其他”。
- 前端统一使用`TRAINING_TASK_TYPES.OTHER`；定义位于`src/features/training/operations-archive/constants/trainingTaskTypes.ts`，业务分支不再散落`TEMPORARY`字面量。预览Fixture和现有回归用例同步命名。
- 后端当前明确仅接受`MONTHLY/QUARTERLY/TEMPORARY`，因此`OTHER`常量的协议值仍为`TEMPORARY`；创建、修改、筛选与既有`TEMP-`周期记录继续兼容，不将未经支持的`OTHER`字符串直接提交接口。
- 月度/季度周期、其他任务手填名称时间、长期任务、权限、幂等及重试行为保持原样；不修改后端、数据库、已有任务名称或授权数据。不新增资源码，原创建任务资源的用途说明同步改为“其他”。

27项任务创建与季度规则浏览器测试在三个标准桌面视口通过，覆盖下拉新名称、表单重置、协议值、权限拦截及失败重试。已核对创建抽屉截图。Lint、正式/测试类型检查和生产构建通过，严格静态审计0错误0警告；全量`pnpm quality`结果随后记录。

完整`pnpm quality`已执行结束：Lint、118项治理测试、全部类型检查、生产及UIDesign构建和5项生产路由检查通过。969项浏览器测试中864通过、24跳过、81失败；与改动前逐项对照，失败清单完全一致，无新增失败。全量仍因既有视觉差异非零退出，没有更新基线来消除差异。

日志：`C:/Users/75946/AppData/Local/Temp/training-other-task-quality-20261030.log`；对照报告：证据目录中的`quality-comparison.json`。原有失败清单摘要仍为`670ba2a52a42d6a1a9c953daacf8eb73e6e1c120fceea3322dd8a8cfcef83801`。

源码变更及新常量模块已逐项复核通信证据，两个候选只替换了等价的常量表达式，所有接口、请求字段和协议值保持不变；未以重新绑定依赖指纹替代未知调用审查。没有更新任何批准记录或视觉基线。

本机证据目录：`C:/Users/75946/AppData/Local/Temp/training-other-task-20261030/`，包含`review.json`和三个视口的`create-*`截图。浏览器插件及ego CLI不可用，沿用工程Playwright流程。
