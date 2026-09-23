# 设计系统入口（兼容指针）

本文件不再维护颜色、字号、间距、圆角或组件值，避免形成第三份 Design Token 真源。

- 统一标准索引：`standards/README.md`
- 视觉意图与可审计镜像：`DESIGN.md`
- 运行时唯一 Token：`src/shared/styles/tokens.scss`
- 跨页面交互契约：`UX-CONTRACT.md`
- Layout、Pattern、Component 与 Viewport 稳定 ID：`standards/registry.json`
- 当前视觉证据：`docs/design/concepts/platform-dashboard.png`、`docs/design/concepts/vms-vehicle-list.png`

修改全局视觉标准时，必须在同一变更中更新运行时 Owner、`DESIGN.md` 与验证，并运行 `pnpm design:check`。
