# IAM 权限与角色管理边界

更新：2026-09-27。

- 新版权限治理为 V2：前端 Menu/Button/ButtonPage 与后端独立 Function 分离，通过 Permission → Package → Role 关联。七个新页面位于 `src/features/iam/permission-governance/pages/`，入口显隐和路由使用 CurrentPageResources，不混入旧 Function 结果补权。
- `/iam/roles` 仍是角色管理 Menu；授权入口指向 `/iam/roles/authorization` 并检查 `IAM.ROLES.AUTHORIZATION`。
- `/iam/roles/assignments` 保留角色成员管理，仍按既有成员分配接口执行，不因旧功能权限树退役而删除。
- `/iam/members` 内通过“分配角色”按钮打开 MemberRolesDrawer。先按 user_id + tenant_id 获取最新成员身份与字符串 member_version，再 QueryRoles / MemberRole/Query。Assign/Revoke 仍由相应旧 Function 权限控制；不直接改 Tenant 管理员身份或给用户直授资源。
- 新 `/iam/members/effective-permissions` 只读查看有效权限，通过 `IAM.MEMBERS.EFFECTIVE_PERMISSIONS` 判断入口。角色分配抽屉不读取任何旧 Function 权限树。
- 2026-09-29 接口迁移后，基础业务页也通过 CurrentPageResources 获取精确资源；旧 UI 谓词仅作显式适配，不再调用 CurrentFunctions。注册表/rollout 与通信证据需专项复核，禁止把旧产物当成本次已验收授权清单。
- 401/403、字符串版本冲突、can_maintain、集团受控角色及成员有效性均按既有契约处理；前端门禁只改善体验，服务端执行最终授权。

旧页面约束仅在 `archive/iam-permission-v1/2026-09-27/docs/permissions/iam-access-control.md` 保留追溯。活动扫描范围、退役记录、后续自动化缺口见 [自动维护接入说明](../coordination/iam-maintenance-adoption.md)。
