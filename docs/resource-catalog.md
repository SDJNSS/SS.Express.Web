# 前端权限资源目录导出

资源目录生成器读取 `UIDesign/approvals/*.json` 与
`UIDesign/approved-prototypes.json`，导出已批准且可交付的业务资源；另包含产品明确确认、且不涉及页面重设计的 IAM/TMS/VMS Overview 正式入口，并使用后端提供的
`iam-resource-catalog.schema.json` 校验结果。

```bash
pnpm resource-catalog:generate
```

默认输出：`artifacts/iam-resource-catalog.json`。

CI/本地一致性检查：

```bash
pnpm resource-catalog:check
```

可选参数：

```bash
pnpm resource-catalog:generate -- --output <json路径> --schema <schema路径>
```

当前规则：

- 登录、找回密码不进入权限资源目录。
- Tenant 选择属于认证上下文流程，不作为业务菜单。
- 框架本身不是可授权页面；DMS 默认 Module 负责承载统一框架。
- `Menu` 是左侧导航直接展示的生产路由；`Page` 是由 Menu 内操作进入、但不单独展示在导航中的生产路由。
- `Function` 只登记已实现且实际调用受保护后端 API 的业务动作；展开、切换 Tab、前端校验等纯前端交互不登记。
- 一个页面动作依赖多个受保护 API 时逐个登记 Function；不同页面调用同一 API 时按业务入口分别登记，后端按任一对应 Function 授权即可调用。
- Dashboard 是 DMS 的 Menu，使用 `dms:dashboard:view`；Welcome 是其隐藏 Page，使用 `dms:welcome:view`，供无 Dashboard 权限的用户进入。
- IAM、TMS、VMS Overview 是各 App 默认 Module 下排序为 1 的 Menu，分别使用 `iam:overview:view`、`tms:overview:view`、`vms:overview:view`；它们当前没有真实统计 API，因此不生成虚构 Function。
- 已退役的 VMS 车辆样本不再生成 Menu 或 Function；历史视觉稿继续作为 archived Preview 保存。此处只维护前端期望目录，不代表自动删除线上已有 IAM 资源。
- 任何新增 approved 页面未登记资源或排除原因时，生成器直接失败。

## 当前页面分类

| App | 类型 | 资源           | 路由                              | 归属说明                                        |
| --- | ---- | -------------- | --------------------------------- | ----------------------------------------------- |
| DMS | Menu | 物流运营总览   | `/platform/dashboard`             | 顶层导航入口                                    |
| DMS | Page | Welcome        | `/platform/welcome`               | Dashboard 无权限时的隐藏兜底页                  |
| IAM | Menu | 身份总览       | `/iam/overview`                   | 默认 Module 的首个入口                          |
| IAM | Menu | 集团信息       | `/iam/group`                      | 顶层导航入口                                    |
| IAM | Menu | Tenant 管理    | `/iam/tenants`                    | 顶层导航入口                                    |
| IAM | Menu | 组织管理       | `/iam/organizations`              | 顶层导航入口                                    |
| IAM | Menu | 岗位管理       | `/iam/positions`                  | 顶层导航入口                                    |
| IAM | Menu | 用户与成员     | `/iam/members`                    | 顶层导航入口                                    |
| IAM | Page | 用户角色与权限 | `/iam/members/permissions`        | 从用户与成员页进入；角色可维护，Function 只读   |
| IAM | Menu | 角色管理       | `/iam/roles`                      | 顶层导航入口                                    |
| IAM | Page | 角色功能权限   | `/iam/roles/function-permissions` | 从角色管理页进入                                |
| IAM | Page | 角色数据权限   | `/iam/roles/data-permissions`     | 从角色管理页进入                                |
| IAM | Page | 角色分配       | `/iam/roles/assignments`          | 从角色管理页进入                                |
| IAM | Menu | 应用与权限资源 | `/iam/application-resources`      | 顶层导航入口                                    |
| TMS | Menu | 运输总览       | `/tms/overview`                   | 默认 Module 的首个入口；当前不生成统计 Function |
| VMS | Menu | 车辆管理总览   | `/vms/overview`                   | 默认 Module 的首个入口；当前不生成统计 Function |

登录、找回密码和 Tenant 上下文选择属于认证流程，不写入权限资源目录。未 approved 的脚手架页、概览占位页和 TMS 占位页不会生成。
