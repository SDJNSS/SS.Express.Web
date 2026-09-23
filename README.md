# 陆链控制台

面向企业物流运营的一体化前端平台。当前工程在一个统一 App Shell 中支持平台总览、IAM、TMS 与 VMS，并允许按相同方式继续接入 WMS、FMS 等子系统。

## 启动

```bash
pnpm install
pnpm dev
```

首次对接后端时，从 `.env.example` 复制本地环境文件并设置 `DEV_API_TARGET`。浏览器统一请求 `VITE_API_BASE_URL`（默认 `/api`），开发服务器再代理到后端；业务代码不得写死 Host。

```bash
Copy-Item .env.example .env.local
pnpm dev
```

质量检查：

```bash
pnpm lint
pnpm test:governance
pnpm typecheck
pnpm ui:typecheck
pnpm test:typecheck
pnpm build
pnpm ui:build
pnpm test:visual
```

`pnpm lint` 同时检查代码风格、`DESIGN.md` 漂移、硬编码样式、Feature/Preview 边界、页面 Pattern，以及 Page Contract 与 Legacy 已批准原型关联。`pnpm quality` 可一次执行完整质量链路。

统一标准从 [standards/README.md](standards/README.md) 进入。根目录 [DESIGN.md](DESIGN.md) 保存视觉意图，[UX-CONTRACT.md](UX-CONTRACT.md) 保存跨页面行为；精确运行时值仍只由 `src/shared/styles/tokens.scss` 定义。

## UI 原型工作区

`UIDesign/` 是可运行 Preview Host。Legacy 原型继续兼容；新页面通过受控 `public.preview.ts` 装载 Feature 内的 Canonical Page View，不承载真实 API、认证、生产 Store 或路由。

```bash
pnpm ui:dev
pnpm ui:typecheck
pnpm ui:build
```

原型目录约定、生命周期和开发边界见 [UIDesign/README.md](UIDesign/README.md)。

视觉回归固定验证 `1366×768`、`1440×900`、`1920×1080`。只有原型完成评审并更新 `UIDesign/approved-prototypes.json` 后，才能使用 `pnpm test:visual:update` 建立或更新基线；日常开发和 CI 仅运行 `pnpm test:visual` 做对比，不会覆盖基线。

## 已实现

- Vue 3 + TypeScript Strict + Vite + Element Plus + Pinia + Vue Router。
- Axios 统一客户端、权限指令、全局会话 Store、Design Token 与 Iconify。
- 多子系统路由聚合与随系统切换的侧栏导航。
- 平台物流运营总览，可视化运输线路、指标、待办与车辆分布。
- IAM、TMS、VMS 三个受权限目录治理的 Overview 正式入口。
- 标准共享组件、物流业务选择器、页面模板与四类 Reference Page。

架构与边界说明见 [docs/architecture.md](docs/architecture.md)，工程规范见 [docs/frontend-engineering-standard.md](docs/frontend-engineering-standard.md)。
