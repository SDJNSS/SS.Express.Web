# IAM 隐藏 Page 功能权限入口缺失复盘

> 日期：2026-09-18  
> 范围：角色管理 → 角色功能权限  
> 目的：供前后端及系统资源目录维护会话统一权限模型、初始化资源和回归规则。

## 1. 现象

- 用户已拥有“查看角色功能权限”的 Function，但角色列表和角色详情不显示“功能权限”入口。
- 角色编辑抽屉没有“功能权限”入口。
- 直接访问 `/iam/roles/function-permissions` 可能被路由门禁拒绝。

## 2. 根因

本次问题由三处模型不一致叠加造成：

1. 前端曾假设 `CurrentAppMenus(app_id)` 会返回 Menu 下的 Page 和 Function，并据此使用 Page 权限码做隐藏路由门禁；最新运行时契约实际只返回 `App → Module → Menu`。
2. 列表、详情按钮和隐藏路由绑定了 Page 编码 `iam:roles:function-permissions`，而有效操作权限来自 `CurrentFunctions(menu_id)` 返回的 Function 编码 `iam:roles:function-permissions:view`。Function 集合中不存在 Page 编码，因此入口被默认隐藏，路由也可能进入 403。
3. 编辑抽屉从未实现“功能权限”入口，不属于权限加载问题。

测试未及时发现问题，是因为旧 Mock 在 `CurrentAppMenus` 中伪造了 `pages/functions`，且生产测试偏重直接打开目标路由，没有同时验证列表、详情、编辑三个真实入口及无权场景。

## 3. 正确权限模型

### 3.1 资源目录与运行时接口分工

资源目录仍维护完整结构：

```text
App → Module → Menu → Page → Function
```

运行时接口分工为：

```text
CurrentApps
  → CurrentAppMenus(app_id)       // 只返回 App → Module → Menu
  → 解析当前路由或隐藏 Page 所属 Menu
  → CurrentFunctions(menu_id)     // 返回该 Menu 范围内的有效 Function
```

- Menu 决定左侧导航和普通 Menu 路由。
- Page 是资源目录中的结构节点，用于记录隐藏路由、组件和归属关系；它不由 `CurrentAppMenus` 下发。
- Function 是可执行能力。前端按钮、隐藏 Page 入口、隐藏路由和 API 操作通过稳定 `permission_code` 关联，不需要额外配置“按钮编号”。
- 每个隐藏 Page 必须归属于唯一 Menu，使前端能够用真实 `menu_id` 加载 `CurrentFunctions`。

### 3.2 角色功能权限的编码映射

| 能力             | 资源类型 | 权限编码                                | 前端用途                                                   |
| ---------------- | -------- | --------------------------------------- | ---------------------------------------------------------- |
| 角色管理         | Menu     | `iam:roles:view`                        | 进入 `/iam/roles`                                          |
| 角色功能权限     | Page     | `iam:roles:function-permissions`        | 资源目录层级、路由与组件登记；不作为按钮或路由运行时门禁   |
| 查看角色功能权限 | Function | `iam:roles:function-permissions:view`   | 列表、详情、编辑入口；隐藏路由；`QueryFunctionPermissions` |
| 保存角色功能权限 | Function | `iam:roles:function-permissions:update` | 编辑权限树和调用 `SaveFunctionPermissions`                 |

同一个 `:view` Function 可以控制多个等价入口，因为三个入口都代表同一业务能力。保存是独立写能力，不能因具备 `:view` 自动获得。

## 4. 修复范围

- 角色列表“功能权限”按钮改用 `iam:roles:function-permissions:view`。
- 角色详情“配置功能权限”按钮改用同一 `:view` Function。
- 角色编辑抽屉补充“配置功能权限”入口，并使用同一 `:view` Function。
- `/iam/roles/function-permissions` 路由改用同一 `:view` Function；无权直接访问时进入 403，且不得调用权限树查询接口。
- 权限树保存继续单独检查 `iam:roles:function-permissions:update`。
- `CurrentAppMenus` 测试夹具不再伪造 Page/Function；生产回归覆盖三个入口、直接路由及有权/无权组合。
- 同步修订架构、权限规则、接口说明、框架 PRD 与两个 Page Contract；不自动修改 Approval Record 或视觉基线。

## 5. 系统资源目录核对清单

资源初始化或调整时逐项检查：

- [ ] IAM App 下存在承载角色管理的 Module。
- [ ] “角色管理”是 Menu，路由为 `/iam/roles`，组件指向角色管理页面。
- [ ] “角色功能权限”是该 Menu 下唯一的隐藏 Page，路由为 `/iam/roles/function-permissions`，组件指向角色功能权限页面。
- [ ] Page 下存在 `iam:roles:function-permissions:view` Function，并与 `QueryFunctionPermissions` 的服务端授权编码一致。
- [ ] Page 下存在 `iam:roles:function-permissions:update` Function，并与 `SaveFunctionPermissions` 的服务端授权编码一致。
- [ ] 需要使用该页面的角色已被授予 `:view`；需要保存的角色另行授予 `:update`。
- [ ] `CurrentFunctions(角色管理 menu_id)` 能返回当前用户实际拥有的上述 Function 编码。
- [ ] `CurrentAppMenus` 只返回 App、Module、Menu；资源初始化不得要求它返回 Page/Function 才能进入隐藏 Page。
- [ ] 前端常量、后端授权特性、资源目录和初始化 JSON 中的 `permission_code` 大小写与分隔符完全一致。
- [ ] Page 编码不被配置成任何前端按钮或 API 的授权编码。

## 6. 必须覆盖的测试矩阵

| `:view`  | `:update` | 预期                                             |
| -------- | --------- | ------------------------------------------------ |
| 有       | 有        | 三个入口可见；路由和查询可用；可保存             |
| 有       | 无        | 三个入口可见；路由和查询可用；保存入口隐藏或只读 |
| 无       | 任意      | 三个入口隐藏；直接访问进入 403；不请求权限树     |
| 加载失败 | 未知      | 默认拒绝受控入口和隐藏 Page；不使用静态权限补权  |

此外必须验证：

- 三个入口都携带同一角色上下文，并能正确返回角色列表。
- `CurrentAppMenus` Mock 不包含 `pages/functions` 时，隐藏 Page 的所属 Menu 仍能正确解析。
- 切换 Menu/App 后旧 Function 快照不会泄漏。
- 服务端仍对查询和保存接口分别执行最终授权，前端隐藏不能代替 403 校验。

## 7. 防复发规则

1. 命名和使用上区分 Page 编码与 Function 编码；`*Page` 常量不得用于 `v-permission`、隐藏 Page 路由门禁或 API 操作。
2. 一个隐藏 Page 必须登记“所属 Menu + `:view` Function”；所有入口与路由复用该 `:view` Function。
3. 每个写操作使用 `:update` 或专用 Function，禁止由查看权限推导写权限。
4. `CurrentAppMenus` 的契约测试固定为 `App → Module → Menu`，不得在 Mock 中增加后端不存在的 Page/Function 字段。
5. 权限页面回归必须同时覆盖“入口点击”和“直接 URL”，并至少包含查看且可写、仅查看、完全无权三种组合。
6. 资源目录生成/初始化检查应验证：隐藏 Page 有唯一父 Menu、至少一个稳定 view Function、前后端权限码一致。
7. 前端权限仅负责可发现性和误操作防护；后端始终是最终授权边界。

## 8. 结论

本次故障不是缺少“按钮编号”，而是把 Page 的目录编码误当成 Function 的运行时授权编码。以后统一以 `CurrentFunctions(menu_id)` 返回的稳定 Function `permission_code` 连接资源、入口、路由和 API；Page 继续承担隐藏页面的结构归属，不承担按钮授权。
