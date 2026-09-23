# UI Design 原型工作区

`UIDesign` 是物流平台的可运行 Preview Host。它服务于视觉与交互确认，不承载生产业务逻辑，也不是第二套生产应用。存量 Legacy Prototype 继续可用；新页面默认装载 Feature 内的 Canonical Page View，避免 Preview 与 Production 维护两套页面。

## 目录定位

- 原型负责页面结构、信息层级、尺寸、布局和关键交互。
- PRD 与 `docs/page-specs/` 负责业务规则、权限、校验、异常和验收标准。
- 正式页面及唯一页面结构归属 `src/features/<subsystem>/<feature>`。
- Preview 复用 `src/shared/styles/tokens.scss`、Shared Component 与 Element Plus `zh-CN` Provider。
- Legacy Prototype 只能依赖 `@shared`；新页面只能通过 `@feature-preview/<subsystem>/<feature>/public.preview` 导入受控入口。
- Preview Binding 只使用 PageViewFixture、Mock 权限和场景；禁止真实 API、认证、生产 Store、生产路由和网络请求。
- Production Binding 不得反向导入 `public.preview.ts`、Preview Binding 或 Fixture。

## 目录结构

```text
UIDesign/
├── index.html                 # 原型目录入口
├── vite.config.ts            # 独立 Vite 入口，复用根项目依赖
├── tsconfig.json
└── src/
    ├── App.vue               # 原型目录页/原型装载器
    ├── prototype-registry.ts # 已确认原型清单
    ├── fixtures/             # 新页面 PageViewFixture（按 subsystem/feature）
    ├── framework/            # 唯一公共框架原型
    ├── patterns/             # List/Detail/Form/Dashboard/Workspace 模式
    ├── prototypes/           # 按 subsystem/feature/page 存放业务原型
    └── styles/               # 原型工作区样式，只做候选规则或展示样式
```

Legacy Prototype 路径继续兼容：

```text
UIDesign/src/prototypes/<subsystem>/<feature>/<page-id>/
├── PrototypePage.vue
├── prototype.meta.ts
├── mock-data.ts              # 可选，仅静态模拟数据
└── README.md                 # 设计说明、评审记录、差异说明
```

新页面代码放在 Feature：

```text
src/features/<subsystem>/<feature>/
├── components/<Page>View.vue
├── preview/<Page>PreviewPage.vue
├── pages/<Page>Page.vue
└── public.preview.ts
```

## 启动与检查

```bash
pnpm ui:dev
pnpm ui:typecheck
pnpm ui:build
pnpm ui:preview
```

默认开发地址：`http://127.0.0.1:4174`。

新 Preview 使用 `http://127.0.0.1:4174/?preview=<page-id>`；`capture=1` 隐藏 44px 工具栏，用于只捕获 `page-content`。原来的 `?prototype=<page-id>` 链接保持兼容。

`approved-prototypes.json` 只维护 Legacy v0 的已批准页面投影。新 v0.1 页面由 `approvals/<page-id>.json` 保存人工 Approval Record，不进入该文件；基础、Preview 与 Production 前置条件分别由 Page Contract Profile 校验。

## 原型生命周期

Legacy 原型通过 `prototype.meta.ts` 标记状态；新页面生命周期来自 Candidate Evidence 与人工 Approval Record，而不是在 Page Contract 内自报状态：

```text
draft → reviewing → approved → implemented → archived
```

- `draft`：设计探索中，可快速调整。
- `reviewing`：正在进行浏览器审查与业务确认。
- `approved`：视觉和交互已确认，正式开发不得随意二次设计。
- `implemented`：已完成生产代码实现和视觉对比。
- `archived`：被新版本替代，仅保留追溯价值。

当前 `vms-vehicle-list` 已随生产 Mock 页面退役，仅保留 archived Legacy Preview、概念图与三视口历史基线；它不再属于 active approved 清单，也不再声明生产路由或权限资源。

## 标准工作流

1. 读取 `standards/README.md`、`DESIGN.md`、`UX-CONTRACT.md`、PRD 与 Page Contract。
2. 在 Feature 中创建 Canonical Page View、Preview Binding 与 `public.preview.ts`，Fixture 只表达 PRD 可证明的页面模型。
3. 运行 base/preview Profile、`pnpm ui:dev`，在 Registry 三个标准视口检查交互、打开态和溢出。
4. 生成 Candidate Snapshot；人工评审，公共问题回收到 Token、Canonical Component 或 Page Pattern。
5. 人工批准后生成 Approval Record、固化三个标准视口基线；然后才能进入真实 API、权限、Production Binding 与路由装配。
6. Production Integration 对比 Approved Preview，并运行生产视觉回归。

## 视觉基线

- `UIDesign/baselines/<page-id>/` 保存 Legacy 生产视觉回归或 v0.1 已批准 Preview 的三个标准桌面视口截图。
- 新 Candidate Preview 截图进入临时候选证据区，不能直接写入上述 Baseline。
- 视觉基线只能在用户明确批准后更新；后续变更必须重新评审并同步 Approval Record 中的 SHA-256 摘要。
- CI 使用 `pnpm test:visual` 将生产路由截图与这些基线进行比较；普通业务提交不得自动刷新基线。

## 边界原则

`UIDesign` 可以引用：

- `@shared/styles` 中的 Design Token。
- 稳定的 `@shared/components` 与 `@shared/business-components`。
- 原型目录内的模拟数据和展示状态。
- `@feature-preview/<subsystem>/<feature>/public.preview` 受控入口。

`UIDesign` 不可以引用：

- `@features` 或相对路径下的 Feature 内部实现。
- 真实 API、认证、权限 Store 和生产路由。
- 独立的 UI Framework、HTTP Client、状态管理库或第二份 lockfile。

Legacy 原型代码不直接复制进生产目录。新页面由 Preview/Production 两个薄装配共享 Canonical Page View，并按 Search → Reuse → Extend → Create 使用现有组件体系。完整规范见 `standards/page-contract.md`。
