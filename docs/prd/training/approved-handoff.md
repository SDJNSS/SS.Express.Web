# 培训资源与考试规则：审核通过交付记录

## 审核结果

2026-09-15，用户明确确认：“所有页面review通过，请将他们‘转正’”。

下列四个页面统一登记为 `approved`。批准范围为现有页面内容、视觉与交互，生产实现复用对应 Canonical Page View。

| 页面 | Page ID | 唯一实现 |
| --- | --- | --- |
| 课程管理 | training-course-management | src/features/training/content-exam/components/CourseManagementPageView.vue |
| 题库管理 | training-question-bank | src/features/training/content-exam/components/QuestionBankPageView.vue |
| 试卷管理 | training-paper-management | src/features/training/content-exam/components/PaperManagementPageView.vue |
| 考试配置管理 | training-exam-configuration | src/features/training/content-exam/components/ExamConfigurationPageView.vue |

## 查找与继续开发

- 审批记录：`UIDesign/approvals/<Page ID>.json`。
- 唯一规格：`docs/page-specs/<Page ID>.yaml`。
- 固化基线：`UIDesign/baselines/<Page ID>/desktop-1366.png`、`desktop-1440.png`、`desktop-1920.png`。
- 启动：在项目根目录执行 `pnpm ui:dev`。
- 预览：`http://127.0.0.1:4174/?preview=<Page ID>`。

## 生产接入状态

当前为“设计已批准，待后端接入”，尚未进入 `implemented`，尚无生产路由。

附件 `iam-api-documentation.md` 未包含本组培训业务接口。Page Contract 中的业务 API 与权限编码缺口继续有效，批准设计不会解除这些接入条件。

后续需提供：

1. 课程、题目、试卷、考试配置的查询、详情、创建、更新、状态操作 API；课程复制与视频上传 API；题目与试卷选择 API。
2. 请求、响应、错误和并发版本约定，以及上传文件约束。
3. 所属 App/Module 和各 Menu/Function 的权限编码。

资源目录生成器已显式登记这四页为待接入项。接口、权限和生产路由补齐后，再加入初始化目录，避免生成当前无法访问或执行的授权资源。

## 本次验证结果

- 四页 Preview Profile、Approval Schema、Contract 摘要及 12 张基线文件摘要校验均通过。
- 四页 approved 基线回归 12/12 通过；培训页面交互测试 18/18 通过。
- `pnpm quality` 已完整执行：Lint、Design/Standards/Contract/资源目录检查、39 项治理测试、生产/UIDesign/测试类型检查和两套构建通过。
- 全项目浏览器测试为 248 通过、10 失败，故全局 `quality` 未通过。失败均位于本次未修改的页面或测试：应用资源 1366 基线 1 项、用户与成员三视口基线 3 项、角色功能权限三视口基线 3 项、权限加载失败后新建角色按钮仍可见的三视口测试 3 项。
- 保留原有 IAM 基线与检查规则；本次用户审批仅覆盖四个培训页面，不覆盖这些全局失败。
- 既有非阻断警告：主按钮文字对比度 4.30:1，以及构建部分 chunk 超过 500 kB。
