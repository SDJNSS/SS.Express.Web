# Page Contract v0.1

`docs/page-specs/` 是唯一页面规格目录。Page Contract v0.1 是现有 Page Specification 的版本升级，不创建平行 Contract 文件，也不把同一业务事实复制到 Registry、Preview Registry 或审批清单。

## 版本规则

- `platform-dashboard.yaml` 是显式白名单内的 Legacy v0，暂由旧治理检查器保护。已退役的 VMS 车辆样本仅保留归档 Preview 与视觉证据，不再声明 Production Binding。
- 所有新页面必须声明 `schemaVersion: "0.1"`。
- 未声明版本且不在白名单、或声明未知版本，均直接失败。
- 存量 v0 在发生实质页面修改时迁移；不进行一次性批量重写。
- v0.1 Contract 不保存 `draft/reviewing/approved` 状态。生命周期来自候选证据与外部人工审批记录。

结构 Schema 位于 `standards/schemas/page-contract.v0.1.schema.json`。`scripts/check-page-contracts.mjs` 在 JSON Schema 之外继续验证唯一 ID、内部引用、受控路径、Registry Key、Feature 归属和 Profile 前置条件。

## 最小示例

```yaml
schemaVersion: '0.1'
page:
  id: tms-order-list
  name: 运输订单列表
  feature: tms/orders
  type: ListPage
  patternKey: ListPageTemplate
  revision: 1
sources:
  inputMode: prd-only
  prd:
    - id: order-list-prd
      ref: docs/prd/tms/order-list.md
  api: []
  permissions: []
  ux:
    - id: platform-ux
      ref: UX-CONTRACT.md
      section: Dataset navigation
  references:
    - id: approved-list-sibling
      ref: docs/design/concepts/vms-vehicle-list.png
      origin: project
      kind: approved-page
implementation:
  canonicalEntry: src/features/tms/orders/components/OrderListPageView.vue
  previewEntry: src/features/tms/orders/public.preview.ts
  previewBinding: src/features/tms/orders/preview/OrderListPreviewPage.vue
  productionBinding: src/features/tms/orders/pages/OrderListPage.vue
  productionRoute: /tms/orders
  routeSource: src/features/tms/routes.ts
composition:
  layoutKey: AppLayout
  regions:
    - { id: filters, role: search, order: 1 }
    - { id: results, role: data, order: 2 }
  components:
    - id: order-table
      componentKey: shared.data-table
      regionId: results
      purpose: 展示查询结果
states:
  - id: ready
    isDefault: true
    scopeRef: page
    observableResult: 展示筛选、表格和分页
  - id: loading
    scopeRef: results
    observableResult: 结果区域展示稳定加载态
  - id: empty
    scopeRef: results
    observableResult: 无匹配结果并保留筛选条件
  - id: retryable-error
    scopeRef: results
    observableResult: 展示错误和重试动作
interactions:
  - id: search-orders
    trigger: 提交筛选条件
    targetRef: results
    observableResult: 页码重置并刷新结果
    ruleRef: platform-ux
mockScenarios:
  - id: ready-default
    isDefault: true
    fixtureRef: UIDesign/fixtures/tms/orders-ready.json
    stateRef: ready
    acceptanceRefs: [orders-visible]
exceptions: []
issues:
  blockers: []
  deferred: []
  outOfScope: []
acceptance:
  - id: orders-visible
    sourceRef: order-list-prd
    observableResult: 查询成功后展示订单和分页
    affectedScopes: [preview-visual, preview-interaction]
    stateRef: ready
verification:
  viewports: [desktop-1366, desktop-1440, desktop-1920]
  browserTests: [tests/preview/tms-order-list.spec.ts]
```

这只是结构示例，不是 TMS 订单业务需求，不能直接作为该页面 PRD 或开发依据。

## Source 与输入模式

- `prd` 至少一项，且所有 `ref` 必须是仓库内受控文件。
- `prd-only` 表示用户没有提供视觉参考；仍可登记 `origin: project` 的已批准相邻页面。
- `prd-with-reference` 至少包含一个 `origin: user` 的参考证据。
- 参考图只影响可由视觉证据支持的布局/风格决策，不能定义权限、状态流转、字段含义或 API。
- API/权限在 Preview 阶段可以为空；进入 Production 前必须补齐适用权威来源。

## Canonical Page 与 Preview

新页面使用一棵页面组件树：

```text
Preview Binding（Fixture / Mock 权限）
            ↓
    Canonical Page View
            ↑
Production Binding（真实 API / 权限 / 路由）
```

平台框架是唯一例外：当 Contract 同时声明 `shared.app-shell` 与 `app-layout-production-owner` 例外时，Production Binding 可以直接指向唯一的 `src/app/layouts/AppLayout.vue`。此时 `productionRoute` 是用于验证框架装配的代表业务路由，Feature 页面仍不得自行创建第二个壳层。

`public.preview.ts` 是 UIDesign 唯一允许导入的 Feature 入口。Preview 代码不得引用真实 API、认证、生产 Store 或路由；Production 代码不得导入 Preview Entry/Fixture。Legacy 原型继续存在，但不是新页面复制两套实现的先例。

Preview 批准范围当前为 `page-content`：使用 `?preview=<page-id>&capture=1` 隐藏工具栏。完整 `AppLayout + Page Content` 在 Production Integration 视觉回归中验证。

## Profiles

### base

- 对所有 v0.1 Contract 执行 Schema、安全路径、唯一 ID、内部引用、Registry Key 与 Feature 归属检查。
- PRD/UX/参考来源必须存在。
- 允许实现文件、API、权限、场景和测试尚未完成。
- `blockers` 是合法状态，不会伪装成结构错误。

### preview

- 必须指定 `--page`；运行 base 全部检查。
- Canonical Entry、`public.preview.ts`、Preview Binding、默认 Scenario、Fixture 和 Browser Test 必须存在。
- Viewport 必须与 Registry 三项精确一致。
- 对请求的 approval scope 存在 blocker 时返回 `blocked`；交互 scope 还要求至少一个可观察交互。
- Candidate Snapshot 只能写入临时候选证据区，不能覆盖 `UIDesign/baselines`。

### production

- 必须指定 `--page`；运行 preview 全部检查。
- Production Binding、路由、API 与权限来源必须可解析。
- 必须存在匹配当前 Contract digest 的人工批准记录。
- Approval Record 必须通过 `standards/schemas/approval-record.v1.schema.json`，并匹配 Page ID、Revision、Scope、三个标准 Viewport 及基线文件摘要。
- 缺少记录、Contract 变化或基线变化都会返回 `blocked`；不得通过写入 Legacy `approved-prototypes.json` 绕过。

退出码：`0=passed`、`1=validation failed`、`2=blocked`、`3=unexpected internal error`。`--format json` 会输出稳定的 `status`、finding 和 `rawSha256`；人工审批使用版本化的 `sha256-canonical-json-v1` 摘要，忽略 YAML 排版差异但会识别 Contract 内容变化。
