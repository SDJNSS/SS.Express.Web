# SS.Express.Web 受治理前端页面标准工作流方案

> 状态：评审稿，尚未实施
>
> 编写日期：2026-09-03
>
> 适用范围：SS.Express.Web 及未来采用同类机制的前端项目
>
> 评审目的：交由多个 Agent 从架构、设计、工程、质量和跨项目复用角度复核；评审通过后再制定实施计划并开发。

## 1. 文档目标

本文提出一套面向企业级前端项目的“受治理页面交付工作流”。它希望把以下能力组织成一个可持续、可检查、可复用的完整流程：

- 项目级 Design Token、页面骨架、Page Pattern 和共享组件。
- `Frontend Design` 的视觉设计能力。
- `Frontend Design Premium` 的行为一致性、状态完整性、可访问性和验证机制。
- SS.Express.Web 已建立的 `UIDesign` 原型先行机制。
- Page Specification、人工审批、生产实现和视觉回归。
- Lint、TypeCheck、Build、浏览器测试和视觉检查等质量门禁。

最终希望用户只需提供 PRD，或提供 PRD 加参考图，即可启动标准流程：自动分析需求、生成可运行原型、完成自动检查、等待用户审核、根据批准原型实现生产页面，并验证最终页面与批准原型的一致性。

参考图是可选输入，不是启动完整工作流的必要条件。PRD 或等效的权威业务规格才是完整页面流程的最低业务输入。

## 2. 项目背景

SS.Express.Web 是物流平台的统一前端项目，需要同时承载多个子系统，例如：

- IAM：身份、组织、角色、权限等管理能力。
- TMS：订单、运输计划、调度、轨迹、费用等运输管理能力。
- VMS：车辆、司机、证照、车队等运力管理能力。
- 后续可能增加 WMS、OMS、YMS 或其他物流业务子系统。

项目采用 Vue 3、TypeScript、Vite、Element Plus、Pinia、Vue Router、Axios、SCSS 等技术，并使用 pnpm 进行依赖管理。业务代码按 `src/features/<subsystem>/<feature>` 归属，共享能力按纯 UI 与业务组件分别进入 `src/shared/components` 和 `src/shared/business-components`。

项目当前已经具备以下基础：

- 运行时 Design Token：`src/shared/styles/tokens.scss`。
- 页面骨架和共享组件：`AppPage`、`PageHeader`、`SearchPanel`、`DataTable`、`AppPagination` 等。
- 标准 Page Pattern：List、Detail、Form、Dashboard、Workspace、Wizard 等 PageTemplate。
- 独立的 `UIDesign` 原型工作区。
- `draft → reviewing → approved → implemented → archived` 原型生命周期。
- Page Specification、approved 原型、生产路由、Page Pattern 与视觉基线的关联清单。
- 硬编码样式、Feature 边界和 Page Pattern 静态检查。
- 1366×768、1440×900、1920×1080 三种桌面视口验证。
- Playwright 生产页面视觉回归。

现有基础不是要被新工作流替换，而是新工作流的项目级运行环境。

## 3. 当前前端页面开发的主要痛点

### 3.1 标准存在，但发现成本较高

项目标准目前分布在工程规范、架构文档、设计系统说明、运行时 Token、共享组件、UIDesign 文档、检查脚本和测试配置中。这样的物理分布符合代码职责，但缺少统一的标准入口和机器可读的所有权清单。

新开发者或 Agent 容易遇到以下问题：

- 不清楚应该先读哪份文档。
- 不清楚文档与代码发生冲突时谁是权威来源。
- 不清楚某个交互能力是否已有共享实现。
- 为了理解标准而扫描多个目录，增加上下文成本。
- 同一规则在多份文档中重复描述，可能逐渐发生漂移。

### 3.2 AI 生成页面容易产生视觉漂移

如果只要求 AI“根据 PRD 生成页面”，不同会话可能产生不同的：

- 色彩、字体、间距和圆角。
- 页面结构和信息密度。
- 表格、表单、弹窗和反馈方式。
- loading、empty、error 等状态表达。
- 按钮用词、保存后去向和删除确认方式。

即使单个页面看起来不错，也可能无法形成统一的产品系统。

### 3.3 参考图并不总是存在，也不一定符合项目标准

用户可能只提供 PRD，不提供参考图。即使提供了参考图，也可能来自其他产品、旧系统或设计工具，存在以下风险：

- 使用了与项目不同的色板、字体和圆角。
- 页面骨架与项目 AppShell 不一致。
- 业务信息不完整或与 PRD 冲突。
- 只表现默认状态，没有错误、权限和异步状态。
- 图片尺寸不能代表实际浏览器布局。

因此，参考图只能作为视觉证据，不能自动成为项目标准或视觉回归基线。

### 3.4 原型和生产页面可能再次分叉

原型得到批准后，如果生产页面重新进行视觉设计，或者直接复制原型中的模拟实现，容易出现：

- 生产页面与 approved 原型不一致。
- 原型代码绕过生产架构、API、权限和状态管理。
- 相同页面在不同数据量、错误状态和短视口下变形。
- 视觉基线被随意刷新，从而掩盖回归。

### 3.5 工作流缺乏跨项目复用边界

直接复制 SS.Express.Web 的标准到项目 B，会错误地把物流平台的视觉语言、页面密度和组件假设带入另一个产品。真正可复用的应该是“提炼标准和执行页面交付的方法”，而不是某个项目的具体 Token 和业务组件。

## 4. 目标与非目标

### 4.1 目标

本方案希望实现：

1. 建立一个统一的项目标准入口，明确每类标准的权威来源、运行时实现和检查方式。
2. 用户只提供 PRD 时，也可以自动生成符合项目风格的 UIDesign 原型。
3. 用户提供 PRD 和参考图时，自动将参考图适配到项目标准，而不是机械复制。
4. 自动组合 `Frontend Design` 与 `Frontend Design Premium`，同时利用项目自己的 Token、Pattern 和共享组件。
5. 原型必须经过用户明确批准后，才能进入生产实现。
6. 生产页面必须与 approved 原型、Page Specification 和项目标准保持可追踪关联。
7. 用确定性脚本和浏览器测试检查模型无法可靠自证的质量要求。
8. 将工作流封装为可复用能力，使项目 B 在建立自己的项目标准后可以采用同一流程。

### 4.2 非目标

本方案不追求：

- 根据一张图片直接猜测完整业务并上线生产页面。
- 让 AI 自动决定权限、费用、隐私、删除或不可逆业务状态。
- 让每个页面重新创造一套字体、色板、圆角和组件。
- 把所有标准实现代码搬到一个文档目录中。
- 用静态审计替代真实浏览器测试。
- 自动批准 AI 自己生成的原型。
- 测试失败时自动更新视觉基线。
- 把 SS.Express.Web 的业务视觉标准原样复制到其他项目。

## 5. 核心理念

### 5.1 单一入口，不等于所有文件放在一起

标准应该“逻辑集中、职责分离”：

- `standards/README.md` 是统一入口。
- 标准说明文档集中在 `standards/`。
- 运行时代码继续保留在 `src/`。
- 原型和视觉基线继续保留在 `UIDesign/`。
- 检查器继续保留在 `scripts/` 和 `tests/`。

这样既降低发现成本，又不破坏源码分层。

### 5.2 每个标准域只有一个权威所有者

每个标准域应同时明确：

1. Policy：规则和设计意图写在哪里。
2. Runtime Owner：运行时由哪个 Token、组件或服务实现。
3. Enforcement：由哪个脚本或测试验证。

例如 Design Token：

```text
Policy          standards/design-system.md
Runtime Owner   src/shared/styles/tokens.scss
Enforcement     pnpm standards:check + 视觉回归
```

### 5.3 项目契约优先于通用 Skill 默认值

规范冲突时，采用以下优先级：

1. 当前任务中用户明确确认的决定。
2. 维护中的 PRD、领域规则、API 合同和权限策略。
3. Page Specification。
4. approved 原型。
5. `DESIGN.md` 与 `UX-CONTRACT.md`。
6. 项目 Design Token、共享组件和 Page Pattern。
7. 一致的同类型已完成页面。
8. `Frontend Design Premium` 的低风险默认规则。

高风险事项没有权威依据时，不能落入通用默认值。

### 5.4 视觉创意与产品一致性分工

- `Frontend Design` 负责基于业务主题做出有辨识度的信息设计和视觉判断。
- `Frontend Design Premium` 负责跨页面行为一致性、状态覆盖、可访问性、安全和验证。
- `DESIGN.md` 保存项目长期视觉记忆。
- `UX-CONTRACT.md` 保存项目长期交互行为契约。
- SS.Express.Web 的 Token、共享组件和 PageTemplate 是生产实现边界。

普通 CRUD 页面应优先获得熟悉、稳定和高效的体验；视觉创意主要用于信息层级和业务表达。Dashboard、Workspace 等页面可以拥有一个更明确的视觉签名，但仍不得脱离项目 Token 和组件体系。

### 5.5 原型先行、人工批准、生产映射

UIDesign 原型用于确认页面结构、内容层级、尺寸、视觉和关键交互。生产页面用于接入真实 API、权限、状态管理、路由和异常处理。原型代码不直接复制到生产目录，生产实现必须按 `Search → Reuse → Extend → Create` 映射到现有组件体系。

## 6. 总体架构

整个方案分为三层：

```text
┌──────────────────────────────────────────────────────────┐
│  通用工作流层                                             │
│  可复用编排 Skill、输入协议、阶段门禁、模板、验证协议       │
└──────────────────────────┬───────────────────────────────┘
                           │ 读取项目适配器
┌──────────────────────────▼───────────────────────────────┐
│  项目标准层                                               │
│  AGENTS.md / standards / DESIGN.md / UX-CONTRACT.md       │
│  premium-ui.json / tokens / shared components / UIDesign  │
└──────────────────────────┬───────────────────────────────┘
                           │ 约束单页交付
┌──────────────────────────▼───────────────────────────────┐
│  页面任务层                                               │
│  PRD / 可选参考图 / Page Spec / Prototype / Baseline      │
│  Production Route / E2E / Visual Regression               │
└──────────────────────────────────────────────────────────┘
```

### 6.1 通用工作流层

建议未来创建一个独立、可安装的 Codex 编排 Skill，例如 `governed-ui-page-workflow`。该 Skill 不保存任何项目特定色值或业务规则，只负责：

- 识别页面开发类请求。
- 识别 PRD 和可选参考图。
- 加载当前项目标准。
- 组合 `Frontend Design` 和 `Frontend Design Premium`。
- 判断页面当前处于哪个生命周期阶段。
- 生成和校验工作流产物。
- 执行项目配置的确定性命令。
- 在人工审批门禁处停止。
- 输出统一评审包和最终验证报告。

通用 Skill 可单独版本化和安装，从而被不同项目复用。

### 6.2 项目标准层

项目标准层是通用工作流在当前代码库中的适配器。建议目标结构如下：

```text
SS.Express.Web/
├── AGENTS.md
├── DESIGN.md
├── UX-CONTRACT.md
├── premium-ui.json
│
├── standards/
│   ├── README.md
│   ├── registry.json
│   ├── engineering.md
│   ├── architecture.md
│   ├── design-system.md
│   ├── page-patterns.md
│   ├── prototype-governance.md
│   └── quality-gates.md
│
├── docs/
│   ├── page-specs/
│   └── design/
│       ├── inputs/
│       └── concepts/
│
├── src/shared/
│   ├── styles/
│   ├── components/
│   └── business-components/
│
├── UIDesign/
├── scripts/
└── tests/
```

`DESIGN.md` 和 `UX-CONTRACT.md` 保留在项目根目录，便于 Premium Skill 和其他 Agent 自动发现；`standards/README.md` 将它们作为标准包成员统一索引，不在 `standards/` 内再维护副本。

### 6.3 页面任务层

每个页面应形成一个可追踪的交付单元：

```text
PRD 或业务规格
+ 可选参考图
+ Page Specification
+ UIDesign 原型
+ 原型状态与评审记录
+ approved 三视口视觉基线
+ 生产页面和路由
+ E2E、状态和视觉回归测试
```

## 7. 项目标准文件的职责

### 7.1 `AGENTS.md`

`AGENTS.md` 只作为 Agent 工作入口，不承载全部项目规范。建议最终包含：

- 什么请求属于 UI 页面工作。
- 页面工作必须使用哪个编排 Skill。
- 必须先读取 `standards/README.md`。
- 必须读取对应 PRD 和 Page Specification。
- 必须遵守的执行顺序。
- 什么时候必须停止等待人工批准。
- 依赖管理、Feature 边界等少量不可绕过规则。

### 7.2 `standards/README.md`

它是项目标准的唯一导航入口，应包含：

- 标准优先级。
- 标准域与负责人表。
- 不同任务需要读取哪些标准文件。
- 标准文档、运行时实现和检查器的链接。
- 修改全局标准的流程。
- 当前已批准的例外或迁移状态。

Agent 不应每次扫描整个项目，而应执行：

```text
AGENTS.md
  → standards/README.md
  → 根据任务类型读取 2～4 个标准文件
  → 对应 PRD 和 Page Specification
```

### 7.3 `standards/registry.json`

用于机器读取标准所有权，建议包含类似结构：

```json
{
  "version": 1,
  "designTokens": {
    "policy": "standards/design-system.md",
    "implementation": "src/shared/styles/tokens.scss",
    "validator": "pnpm standards:check"
  },
  "pagePatterns": {
    "policy": "standards/page-patterns.md",
    "implementation": "src/shared/components/page-templates",
    "validator": "pnpm standards:check"
  },
  "prototypeGovernance": {
    "policy": "standards/prototype-governance.md",
    "implementation": "UIDesign/approved-prototypes.json",
    "validator": "pnpm prototype:check"
  }
}
```

### 7.4 `DESIGN.md`

`DESIGN.md` 保存项目长期视觉语言和理由，至少描述：

- 产品定位、用户和使用场景。
- 产品界面应给人的具体感受。
- 品牌页与产品页的视觉表达边界。
- 色彩、字体、密度、间距、形状、阴影和动效原则。
- 图标、图表、状态和内容语气。
- 一个可持续的项目视觉签名。
- 禁止出现的反例。
- 与运行时 Token 的映射关系。

SS.Express.Web 属于成熟项目，应采用“运行时 Token 保持权威”的模式：

- `src/shared/styles/tokens.scss` 是精确运行时值的唯一实现。
- `DESIGN.md` 记录语义、关键值、应用原则和设计理由。
- 两者有差异时视为 drift，不能静默选择其中之一。
- 全局 Token 变更必须在同一个变更集中同步更新文档、运行时代码和验证证据。

### 7.5 `UX-CONTRACT.md`

`UX-CONTRACT.md` 定义跨页面可观察行为，包括：

- 列表筛选、排序、分页、选择和 URL 状态。
- 表单校验、保存、取消、离开提醒和重复提交保护。
- 创建、编辑、删除后的导航和反馈。
- Dialog、Drawer、Toast、Scrollbar 的唯一实现。
- loading、empty、no-results、error、partial-error、forbidden 状态。
- 键盘、焦点恢复、可访问名称和 live region。
- 搜索清空、IME、debounce 和过期响应处理。
- 权限失败、会话失效、冲突和异常恢复。

### 7.6 `premium-ui.json`

该文件让 Premium 的静态审计了解项目类型、源码范围、公共能力所有权和验证命令。例如：

```json
{
  "profile": "product-admin",
  "sourceRoots": ["src", "UIDesign/src"],
  "locale": "zh-CN",
  "canonicalMap": "UX-CONTRACT.md",
  "requiredCapabilities": [
    "Table Selection",
    "Select/Listbox",
    "Date",
    "Form",
    "Scrollbar",
    "Toast",
    "CRUD"
  ],
  "ownership": {
    "Select/Listbox": "authored",
    "Date": "authored"
  },
  "requiredCommands": ["quality", "visual"]
}
```

`premium-ui.json` 是配置和审计声明，不是工作流执行器，也不能替代项目自己的测试。

## 8. 输入协议

### 8.1 支持的输入模式

| 输入模式 | 是否可完成原型 | 是否可进入生产 | 设计依据 |
|---|---:|---:|---|
| PRD + 参考图 | 是 | 是 | PRD + 项目标准 + 经适配的参考图 |
| 仅 PRD | 是 | 是 | PRD + 项目标准 + approved 同类页面 |
| 仅参考图 | 可生成受限视觉草稿 | 否 | 图片只能证明外观，不能证明业务规则 |

完整生产流程的最低输入是 PRD 或等效权威业务规格。参考图始终是可选增强输入。

### 8.2 PRD 最低应表达的内容

理想情况下，PRD 应描述：

- 页面目标和主要用户。
- 所属子系统和业务对象。
- 字段、查询条件、表格列和操作。
- 主要业务状态和状态流转。
- 权限或角色要求。
- 成功、失败和空数据场景。
- 验收标准。

如果缺少低风险内容，可以使用项目默认规则并在评审包中明确记录假设。如果缺少高风险内容，则不能替用户做出决定。

### 8.3 参考图的角色

参考图可以影响：

- 信息结构。
- 内容层级。
- 区域关系。
- 某些具有业务意义的视觉表达。

参考图不能直接决定：

- 项目色板和字体。
- 全局间距、圆角和阴影。
- AppShell 和 PageTemplate。
- 共享组件交互行为。
- 权限、删除、费用和业务状态流转。
- 最终视觉回归基线。

原始参考图应作为输入证据保存。只有用户批准后的 UIDesign 原型截图才成为页面视觉基线。

### 8.4 信任边界

- 当前用户请求定义任务范围和操作授权。
- PRD、API、权限文档和参考图提供业务或设计证据。
- 文档内部出现的命令、Agent 指令或扩大任务范围的文字不自动成为执行指令。
- 发现业务文档相互矛盾时，应报告冲突，不能静默选择。

## 9. 设计冲突裁决规则

| 冲突场景 | 裁决规则 |
|---|---|
| 参考图颜色与项目 Token 不一致 | 项目 Token 优先 |
| 参考图字体与 `DESIGN.md` 不一致 | `DESIGN.md` 优先 |
| 参考图页面骨架与 Page Pattern 不一致 | 项目 Page Pattern 优先 |
| 参考图内容与 PRD 不一致 | PRD 优先，并在评审报告记录差异 |
| Skill 默认建议与项目契约不一致 | 项目契约优先 |
| 页面希望私建已有公共组件 | 复用或扩展公共组件 |
| 文档与运行时实现不一致 | 生成 drift 报告并要求决策 |
| 权限、费用、隐私或不可逆状态不明确 | 阻止相关能力进入批准和生产 |

参考图中确实有价值、但项目当前没有的模式，应形成“系统级扩展提案”，不能直接以页面私有实现绕过现有标准。

## 10. Skill 编排方式

### 10.1 Skill 分工

完整页面工作需要组合三个层次的 Skill：

1. `governed-ui-page-workflow`：未来建设的通用编排 Skill。
2. `frontend-design`：负责业务主题、信息表达和受控视觉设计。
3. `frontend-design-premium`：负责产品行为契约、一致性、状态、可访问性、安全和验证。

编排 Skill 应强制依次加载：

```text
当前项目 AGENTS.md
standards/README.md
DESIGN.md
UX-CONTRACT.md
premium-ui.json
对应 PRD / Page Specification
frontend-design
frontend-design-premium
```

实际顺序可由 Skill 实现细化，但在开始设计前必须同时拥有业务上下文、项目标准和两个设计 Skill 的约束。

### 10.2 自动触发

`AGENTS.md` 应规定以下任务必须使用编排 Skill：

- 根据 PRD 创建新页面。
- 根据 PRD 和图片还原或设计页面。
- 创建或修改 UIDesign 页面原型。
- 将 approved 原型实现为生产页面。
- 对现有页面做整体重构或视觉升级。

通用 Skill 的描述也应覆盖这些自然语言，从而提高自动匹配的可靠性。

### 10.3 不依赖本机插件缓存路径

Premium 自带的审计脚本可以作为本地 Agent 验证手段，但项目 CI 不应硬编码某台机器上的 Codex 插件缓存路径。需要进入 CI 的稳定规则应采用以下方式之一：

- 转化为项目自有的 Node 检查脚本。
- 使用经过版本锁定和许可确认的项目工具。
- 将所需规则加入现有 ESLint、Playwright 或项目自有审计器。

## 11. 标准页面交付工作流

### 11.1 阶段 0：请求识别与输入登记

触发条件：用户请求新增、设计、还原或实现一个页面。

自动执行：

- 识别 PRD、参考图和相关附件。
- 判断输入模式：`prd-only`、`prd-with-reference` 或 `reference-only`。
- 识别子系统、Feature、页面名称和页面类型。
- 为页面生成稳定的 `pageId` 候选。
- 检查当前是否已有相同 Page Specification、原型或生产路由。

输出：输入摘要和已发现资源清单。

门禁：如果只有参考图，没有业务规格，只允许进入受限视觉草稿流程。

### 11.2 阶段 1：项目上下文预检

自动执行：

- 读取项目标准入口和任务路由。
- 确认 `DESIGN.md`、`UX-CONTRACT.md` 和 `premium-ui.json` 可用。
- 读取运行时 Token、共享组件和对应 PageTemplate。
- 找到至少一个同类型 approved 页面或说明不存在。
- 确认技术栈、locale、时区和支持视口。
- 解析每个适用公共能力的唯一 owner。

典型公共能力包括：

- Table Selection。
- Select/Listbox。
- Date。
- Form。
- Scrollbar。
- Toast。
- CRUD。

门禁：有适用能力但 owner 未解析时，不得为该能力创建页面私有替代品。

### 11.3 阶段 2：Page Specification 生成或校验

从 PRD 自动生成或补全 Page Specification，至少包含：

- `pageId`、名称、子系统、Feature、路由。
- 页面目标、用户和权限。
- 页面类型与标准 PageTemplate。
- 查询条件、字段、列、操作和分页。
- 数据与业务状态。
- loading、empty、no-results、error、forbidden 等 UI 状态。
- 输入模式和参考图路径。
- 三个标准视口。
- 原型路径、批准要求和生产目标。
- 验收标准和未决事项。

建议加入：

```yaml
designInput:
  mode: prd-only
  references: []
  strategy:
    - project-design-contract
    - canonical-page-pattern
    - approved-sibling-pages
```

有参考图时：

```yaml
designInput:
  mode: prd-with-reference
  references:
    - docs/design/inputs/tms-order-list/reference.png
  referencePolicy: adapt-to-project-standards
```

门禁：权限、金额、隐私、不可逆状态、非幂等外部副作用或共享业务状态流转未明确时，相关能力必须进入 unresolved 清单。

### 11.4 阶段 3：Search、Reuse 和 Canonical Resolution

在视觉设计前完成：

- 搜索现有 Shared Components。
- 搜索对应 PageTemplate。
- 搜索同类型 approved 页面。
- 搜索可复用的业务组件和 composable。
- 建立 `需求 → owner → 复用/扩展/新建` 决策表。
- 检查是否会发生跨 Feature 深层导入。

只有确认没有 owner，且该能力会重复出现时，才允许提出新的共享能力。

### 11.5 阶段 4：受约束设计方案

`Frontend Design` 根据业务主题提出简短设计方案，但其创意空间受项目契约限制。

设计方案应说明：

- 页面单一目标。
- 信息层级和布局策略。
- 使用的 PageTemplate。
- 复用组件清单。
- 采用的项目视觉签名。
- 在参考图基础上做出的适配。
- 页面关键状态。
- 是否需要系统级设计扩展。

普通 CRUD 页面不得重新设计色板、字体、间距和圆角。Dashboard 或 Workspace 最多选择一个有业务含义的视觉签名，其他区域保持克制。

门禁：设计方案与 PRD、项目 Token 或现有 Pattern 冲突时，先解决冲突再编码。

### 11.6 阶段 5：创建 UIDesign draft

推荐原型目录：

```text
UIDesign/src/prototypes/<subsystem>/<feature>/<page-id>/
├── PrototypePage.vue
├── prototype.meta.ts
├── mock-data.ts
└── README.md
```

原型必须：

- 初始状态为 `draft`。
- 使用项目 Token、PageTemplate 和共享组件。
- 使用本地模拟数据。
- 不导入 `@features`。
- 不调用真实 API、认证和权限 Store。
- 不注册生产路由。
- 表现关键交互和关键状态。
- 避免创建第二套 UI Framework、HTTP Client 或 lockfile。

### 11.7 阶段 6：自动验证与自我评审

进入人工评审前至少完成：

- UIDesign Lint、TypeCheck 和 Build。
- Design Token、Feature 边界和 Page Pattern 检查。
- 1366×768、1440×900、1920×1080 页面截图。
- ready、loading、empty、no-results、error、forbidden 状态检查。
- 表格、Dialog、Drawer、Select、DatePicker 等打开状态检查。
- 键盘访问、可见焦点和焦点恢复检查。
- 文本溢出、短视口、长内容和滚动所有权检查。
- reduced-motion 和必要的 locale 检查。
- 与至少一个同类型 approved 页面进行一致性比较。

自动验证通过后，状态可以进入 `reviewing`，但不能自动进入 `approved`。

### 11.8 阶段 7：生成用户评审包

评审包应尽量短而完整，包含：

- 三个标准视口截图。
- 页面访问方式。
- 使用的 PageTemplate 和共享组件。
- 设计依据和关键设计决策。
- PRD-only 时参考了哪些项目标准和 sibling 页面。
- 有参考图时做了哪些适配和差异处理。
- 已覆盖的页面状态。
- 自动检查结果。
- 业务假设和 unresolved 决策。
- 建议结论：可批准、需修改或被业务问题阻塞。

### 11.9 阶段 8：人工批准

用户可以做出：

- 要求修改。
- 批准视觉。
- 批准视觉与交互。
- 拒绝。

只有用户明确批准后，Agent 才能：

- 将原型状态改为 `approved`。
- 写入批准日期和关联 Page Specification。
- 生成或更新 approved 三视口视觉基线。
- 允许生产页面实现。

视觉基线更新必须是审批动作的一部分，不能由普通业务提交自动刷新。

### 11.10 阶段 9：生产页面实现

生产代码归属：

```text
src/features/<subsystem>/<feature>/
```

生产实现必须：

- 重新执行 `Search → Reuse → Extend → Create`。
- 使用 approved 原型作为视觉和结构依据。
- 接入真实 API、类型、权限、路由和状态管理。
- 实现 loading、empty、error、permission 和失败恢复。
- 防止重复提交和过期响应覆盖。
- 使用项目统一 Toast、Dialog、Form、Select、Date 和 CRUD 行为。
- 不把原型中的 mock、假权限和页面私有公共实现直接复制到生产目录。

门禁：原型不是 `approved`、关联清单不完整或高风险业务规则未解决时，不得注册生产路由。

### 11.11 阶段 10：最终质量门禁

至少执行：

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm ui:typecheck
pnpm ui:build
pnpm test:visual
```

随着工作流完善，还应覆盖：

- 生产页面完整成功路径 E2E。
- 失败路径和权限路径 E2E。
- 基础可访问性检查。
- approved 原型与生产页面视觉比较。
- Popup、Drawer、Dialog、表格滚动等结构比较。
- `premium-ui.json` 声明的项目命令。

所有强制门禁通过后，状态才可以进入 `implemented`。

## 12. 原型生命周期和权限

保留现有生命周期：

```text
draft → reviewing → approved → implemented → archived
```

| 状态 | 进入条件 | 谁可以触发 |
|---|---|---|
| `draft` | 已创建原型 | Agent 自动 |
| `reviewing` | 自动检查达到评审条件 | Agent 自动 |
| `approved` | 用户明确批准 | 仅人工授权后由 Agent 更新 |
| `implemented` | 生产实现及全部门禁完成 | Agent 在验证后更新 |
| `archived` | 被批准的新版本替代 | 人工决策或明确迁移规则 |

如果用户提出修改，状态返回 `draft` 或继续保持 `reviewing`，并保留评审记录。

## 13. PRD-only 工作模式

用户仅提供 PRD 时，不应要求补充参考图，也不应因此降低交付质量。

设计依据顺序：

```text
PRD
  → Page Specification
  → DESIGN.md / UX-CONTRACT.md
  → Design Token / Page Pattern / Shared Components
  → 同类型 approved 页面
  → Frontend Design 的受控设计判断
  → UIDesign draft
```

不同页面类型应使用不同的设计自由度：

| 页面类型 | 设计自由度 | 重点 |
|---|---:|---|
| 列表页 | 低 | 查询效率、列层级、状态、批量操作 |
| 详情页 | 低到中 | 信息分组、主次关系、操作路径 |
| 编辑页 | 低 | 字段分区、校验、提交和离开行为 |
| 工作台 | 中 | 任务优先级、异常提醒、快捷入口 |
| 驾驶舱 | 中到高 | 信息可视化和一个业务视觉签名 |
| 全新页面模式 | 受控 | 先提出 Pattern 扩展，不允许页面私建标准 |

PRD-only 的评审包用“设计依据报告”替代“参考图差异报告”。用户批准后的 UIDesign 原型成为该页面第一份视觉权威，并生成视觉回归基线。

## 14. PRD + 参考图工作模式

有参考图时增加以下步骤：

1. 识别图片实际尺寸和目标视口。
2. 提取布局区域、信息层级和关键业务表达。
3. 对照项目 AppShell、Token、Pattern 和 Shared Components。
4. 生成参考图适配表：保留、映射、舍弃、待确认。
5. 用项目组件重新构建，而不是通过截图背景或绝对定位模拟。
6. 在评审包中说明与原图的差异及原因。

原图不自动成为视觉基线。只有用户明确要求逐像素还原且该要求不违反项目标准时，才将像素接近度视为主要验收目标。

## 15. 仅参考图工作模式

仅有图片时可以：

- 创建视觉探索或受限原型草稿。
- 识别潜在页面类型和布局。
- 使用模拟内容表达视觉结构。
- 输出需要补充的业务问题。

不能：

- 猜测权限和业务状态流转。
- 承诺字段、按钮和操作完整。
- 将原型标记为业务 approved。
- 实现或注册生产路由。

如果用户后续补充 PRD，可以将现有视觉草稿纳入完整工作流。

## 16. 自动化边界与人工门禁

### 16.1 可高度自动化

- 标准入口解析。
- PRD 内容结构化。
- Page Specification 初稿。
- 页面类型和 PageTemplate 识别。
- Shared Components 搜索和复用建议。
- Canonical owner 解析。
- UIDesign 目录和草稿生成。
- 模拟数据和主要页面状态。
- 三视口截图。
- Lint、TypeCheck、Build 和静态审计。
- 基础浏览器交互和视觉回归。
- 评审包和最终验证报告。

### 16.2 必须保留人工门禁

- 项目初次视觉方向批准。
- approved 原型批准。
- 新增全局 Token 或公共 Pattern。
- 改变跨页面行为契约。
- 权限、安全、隐私、费用和法律相关决定。
- 删除、禁用、归档等不可逆或高影响动作。
- 非幂等外部副作用和共享业务状态流转。
- 视觉基线更新。

### 16.3 可以默认但必须记录

没有权威规定且不涉及高风险时，可以采用维护中的项目默认值。例如：

- 后台可搜索表格使用服务端分页。
- 新建成功返回所属列表并保留相关列表状态。
- 搜索使用 IME-safe 处理和过期响应取消。
- 无指定时使用项目统一 loading 组件。
- 目标为 WCAG 2.2 AA 的基础要求。

默认决定应写入评审报告或 Page Specification，避免成为隐式行为。

## 17. 质量保障模型

统一风格和尺寸不能只依赖提示词，应建立三类保障：

### 17.1 预防性约束

- 唯一 Design Token。
- 唯一 AppShell 和 PageTemplate。
- Shared Components 和 Canonical UI Map。
- Feature 边界。
- PRD、Page Specification 和 approved 门禁。
- `AGENTS.md` 和编排 Skill 的固定执行顺序。

### 17.2 阻断性检查

- 硬编码颜色、字号、间距、圆角和阴影检查。
- 跨 Feature 深层导入检查。
- 标准页面 Pattern 检查。
- 原型状态、Page Specification 和生产路由关联检查。
- Lint、TypeCheck、Build。
- Premium 规则的项目化检查。

### 17.3 检测性验证

- 三种标准桌面视口截图。
- approved 原型与生产页面视觉回归。
- success、loading、empty、error、permission 等状态测试。
- 键盘、焦点、弹层、滚动和可访问性验证。
- 与 sibling 页面的一致性复核。

三者共同工作，才能把“尽量一致”提升为“可执行、可阻断、可追踪的一致性”。任何机制都不能保证所有视觉问题绝对为零，但可以显著降低随机漂移和人工遗漏。

## 18. 建议的页面状态测试矩阵

不是所有页面都需要全部状态，但适用状态必须显式选择，不能只测试 happy path。

| 状态 | 列表 | 详情 | 表单 | 工作台 |
|---|---:|---:|---:|---:|
| ready | 必须 | 必须 | 必须 | 必须 |
| loading | 必须 | 必须 | 提交时必须 | 必须 |
| empty | 必须 | 视业务 | 不适用 | 必须 |
| no-results | 有搜索时必须 | 不适用 | 不适用 | 有筛选时需要 |
| error | 必须 | 必须 | 必须 | 必须 |
| permission-denied | 有权限控制时必须 | 有权限控制时必须 | 有权限控制时必须 | 有权限控制时必须 |
| partial-error | 多区域或部分加载时 | 视业务 | 视业务 | 常见 |
| long-content | 必须 | 必须 | 必须 | 必须 |
| short-viewport | 必须 | 必须 | 必须 | 必须 |
| reduced-motion | 有动效时 | 有动效时 | 有动效时 | 有动效时 |

## 19. 可追踪关系

Page Specification 和原型清单应能回答：

- 页面来自哪个 PRD。
- 是否有参考图，参考图位于哪里。
- 使用哪个 PageTemplate。
- 使用哪些公共能力 owner。
- 原型路径和当前状态是什么。
- 谁在什么时候批准。
- approvedReference 和三视口基线在哪里。
- 对应生产路由和生产组件在哪里。
- 哪些测试证明已完成。

建议页面规格最终包含类似字段：

```yaml
id: tms-order-list
subsystem: tms
feature: orders
pageType: list
pattern: ListPageTemplate
route: /tms/orders

requirements:
  prd: docs/prd/tms-orders.md

designInput:
  mode: prd-only
  references: []

prototype:
  path: UIDesign/src/prototypes/tms/orders/tms-order-list
  requiredStatus: approved
  manifest: UIDesign/approved-prototypes.json

viewports:
  - desktop-1366
  - desktop-1440
  - desktop-1920

verification:
  visualBaseline: UIDesign/baselines/tms-order-list
  e2e: tests/e2e/tms-order-list.spec.ts
```

字段名称可以在实施阶段根据现有检查脚本调整，但关联关系应保持。

## 20. 跨项目复用方案

### 20.1 可直接复用的内容

- 通用编排 Skill。
- 输入模式和信任边界。
- 生命周期和人工门禁。
- Page Specification 模板。
- UIDesign 原型方法论。
- 标准目录模板。
- Canonical owner 解析方法。
- 评审包模板。
- 质量门禁协议。
- 项目初始化和 drift 检查方法。

### 20.2 不应直接复用的内容

- SS.Express.Web 的颜色和字体。
- 物流平台的页面密度和视觉签名。
- TMS、VMS、IAM 业务组件。
- 当前项目的路由、权限和 API 假设。
- 已批准的视觉基线。
- 项目特定 Page Pattern 变体。

### 20.3 项目 B 的初始化流程

项目 B 首次采用工作流时，应先进入 `bootstrap` 模式：

1. 识别技术栈、构建工具、包管理器和目录结构。
2. 查找现有 Design Token、主题、字体和图标。
3. 查找共享组件、页面外壳和重复页面模式。
4. 检查代表性生产页面和 sibling 流程。
5. 查找 PRD、架构、API、权限和测试入口。
6. 生成标准资产清单、冲突清单和 drift 报告。
7. 判断项目属于成熟项目还是全新项目。
8. 生成项目 B 自己的 `standards/`、`DESIGN.md`、`UX-CONTRACT.md` 和 `premium-ui.json` 提案。
9. 人工评审项目标准。
10. 标准通过验证后，启用常规页面交付流程。

成熟项目应以现有稳定代码和设计系统为证据，不得借标准提炼自动进行重品牌。全新项目可以由 `Frontend Design` 生成种子视觉方向，但必须由用户批准后才能成为项目标准。

## 21. 建议的实施阶段

本方案通过评审后，建议分阶段建设，避免一次性大改。

### 阶段 A：标准入口重构

- 创建 `standards/`。
- 创建 `standards/README.md` 和 `registry.json`。
- 迁移或拆分现有工程、架构和设计系统文档。
- 更新项目内文档引用。
- 更新 `AGENTS.md` 的按任务读取机制。
- 不改变生产行为。

### 阶段 B：项目设计与行为契约

- 从现有 Token、组件和页面提炼 `DESIGN.md`。
- 创建 `UX-CONTRACT.md`。
- 创建 `premium-ui.json`。
- 明确 Table、Select、Date、Form、Scrollbar、Toast 和 CRUD owner。
- 建立文档与运行时实现 drift 检查。

### 阶段 C：补齐确定性质量门禁

- 完善现有静态检查。
- 增加标准注册表一致性检查。
- 增加状态、权限、可访问性和关键 E2E。
- 完善 approved 原型与生产路由视觉比较。
- 保证 CI 不依赖本机插件缓存路径。

### 阶段 D：建设通用编排 Skill

- 创建 `governed-ui-page-workflow`。
- 定义输入协议和阶段状态机。
- 提供 Page Specification、Prototype、评审报告模板。
- 强制组合 `Frontend Design` 和 `Frontend Design Premium`。
- 支持 PRD-only、PRD + 图片、仅图片受限模式。

### 阶段 E：试点页面

选择一个覆盖典型能力的页面，例如 TMS 订单列表：

- PRD-only 生成 Page Specification。
- 自动选择 ListPageTemplate。
- 创建 UIDesign draft。
- 三视口与多状态验证。
- 人工批准。
- 生产实现和视觉回归。
- 记录人工介入次数、失败点和流程耗时。

### 阶段 F：项目 B 验证

- 选择一个结构不同的项目。
- 执行 bootstrap 标准提炼。
- 不复制 SS.Express.Web 的视觉值。
- 使用相同通用 Skill 生成一个页面。
- 验证工作流是否真正与具体框架和业务解耦。

## 22. 验收标准

工作流初版至少满足：

1. 用户仅提供 PRD 时可以创建合规 UIDesign draft。
2. 用户提供参考图时，页面会适配项目标准，而不是复制外部样式。
3. 普通页面不得新增硬编码颜色、字号、间距、圆角和阴影。
4. 页面必须使用规定 PageTemplate 或登记的例外。
5. UIDesign 不得导入生产 Feature、真实 API 或生产权限 Store。
6. 三种标准桌面视口均有自动截图。
7. 适用的 loading、empty、no-results、error 和 permission 状态已验证。
8. 原型不能由 Agent 自动批准。
9. 未 approved 的页面不能注册生产路由。
10. 生产页面能追踪到 PRD、Page Specification、approved 原型和视觉基线。
11. 生产实现通过 Lint、TypeCheck、Build、浏览器测试和视觉回归。
12. 普通提交不能自动刷新视觉基线。
13. 高风险业务决定缺少权威依据时会被阻断。
14. 项目 B 能在完成自己的标准提炼后复用同一通用流程。

## 23. 风险与缓解措施

| 风险 | 影响 | 缓解措施 |
|---|---|---|
| 标准文档过多 | Agent 读取成本上升 | 单一 README 入口 + 任务路由 + registry |
| 文档与代码漂移 | Skill 使用过期规则 | drift 检查 + 同 changeset 更新 |
| AI 过度设计 CRUD | 页面失去一致性 | 页面类型对应设计自由度 |
| 图片覆盖项目风格 | 引入外部视觉体系 | 固定冲突裁决表 |
| PRD 缺少业务信息 | 猜测高风险规则 | unresolved 清单 + 条件门禁 |
| 原型与生产分叉 | 审批失去意义 | 关联清单 + approved 视觉回归 |
| 自动更新基线掩盖回归 | 错误被当作正确结果 | 基线更新必须人工批准 |
| Skill 升级改变行为 | 工作流结果不稳定 | 版本兼容检查 + 工作流回归样例 |
| 依赖本机插件路径 | CI 和他人环境失败 | 项目化确定性检查 |
| 跨项目复制视觉标准 | 项目 B 风格错误 | 通用流程与项目适配器分离 |

## 24. 建议复核重点

请复核 Agent 分别检查以下问题：

### 24.1 架构复核

- 通用工作流层、项目标准层、页面任务层的职责是否清晰。
- `standards/` 与 `src/`、`UIDesign/` 的边界是否合理。
- 是否存在重复权威来源。
- 是否能支持 IAM/TMS/VMS 等多子系统。

### 24.2 设计系统复核

- `DESIGN.md` 与 `tokens.scss` 的所有权是否清晰。
- Page Pattern 是否覆盖主要页面类型。
- PRD-only 模式能否稳定生成统一风格页面。
- 参考图冲突裁决是否合理。
- 设计自由度是否过高或过低。

### 24.3 UX 与可访问性复核

- Canonical UI Map 是否覆盖关键交互能力。
- 状态矩阵和焦点行为是否充分。
- 人工门禁是否覆盖高风险行为。
- 是否存在无法通过静态检查证明的关键体验。

### 24.4 工程复核

- 工作流能否在现有 Vue/Vite/Element Plus 项目中落地。
- 检查脚本是否应使用 Node、ESLint 或 Playwright 实现。
- Page Specification 和 manifest 是否易于维护。
- CI 命令是否稳定、可重复且不依赖个人环境。

### 24.5 跨项目复用复核

- 通用 Skill 是否混入 SS.Express.Web 特定规则。
- 项目 B bootstrap 是否足以提炼项目自己的标准。
- 成熟项目与新项目是否需要不同初始化策略。
- 是否需要把通用工作流维护为独立仓库或插件。

### 24.6 流程复核

- 哪些阶段可以合并或删除。
- 哪些门禁可能造成不必要的开发阻塞。
- 哪些人工审批不可缺少。
- 是否能在保证质量的同时保持日常开发效率。

## 25. 待评审决策

以下问题建议在实施前形成明确结论：

1. 标准目录最终命名采用 `standards/` 还是其他名称。
2. `DESIGN.md` 和 `UX-CONTRACT.md` 是否保持根目录权威文件。
3. Page Specification 继续使用 YAML，还是统一为 JSON/TypeScript Schema。
4. 是否为 `standards/registry.json` 建立 JSON Schema。
5. approved 动作由谁执行，是否记录批准人标识。
6. PRD-only 页面是否默认只生成一个推荐方案，还是在首次新 Pattern 时提供候选方案。
7. 是否新增独立 E2E 命令和可访问性命令。
8. 通用编排 Skill 放在个人 Skill、团队插件还是独立仓库中维护。
9. Premium 的哪些规则应项目化进入 CI，哪些只作为 Agent 本地复核。
10. 项目 B 的 bootstrap 产物是否需要单独的人工批准状态。

## 26. 建议结论

该方案总体可行，且与 SS.Express.Web 已有 Design Token、PageTemplate、UIDesign、原型治理和视觉回归机制兼容。建议保留以下核心结构：

```text
可复用编排 Skill
+ 项目标准适配器
+ PRD-first 输入协议
+ 可选参考图
+ UIDesign 原型先行
+ 人工 approved 门禁
+ 生产映射
+ 确定性质量检查
+ 跨项目 bootstrap
```

需要明确摒弃“一张图片直接生成并自动上线生产页面”的思路。正确目标不是追求无人工参与，而是把人工判断集中到真正需要决策的位置，把重复、可验证的工作尽可能自动化。

在多个 Agent 完成复核、待评审决策形成结论之前，本文件仅作为方案提案，不应被视为已经生效的项目标准。
