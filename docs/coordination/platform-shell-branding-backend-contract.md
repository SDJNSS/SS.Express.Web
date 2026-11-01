# 框架品牌配置：后端配合约定

## 范围

前端已按此**待实现的增量契约**改造生产 `AppLayout → AppShell`。只配置左上角品牌区，不涉及权限、App 名称、登录页、浏览器标题或新增配置管理页面。

复用现有 `POST /iam-admin/Auth/CurrentProfile`，Authorization 沿用 Bearer Token，请求体不变（无请求体）。不增加接口、不调用需要集团管理权限的 `/Group/Info`，不新增业务 Function/Permission。保持当前会话自服务鉴权规则。

## 响应增量

保留现有响应信封和 `data` 中所有用户资料字段，新增可选 `data.branding`：

```json
{
  "branding": {
    "brand_name": "陆链控制台",
    "platform_name": "多式联运智慧调度平台",
    "logo_url": "https://assets.example.com/platform/logo.png"
  }
}
```

以上是 **data 内新增片段**，不是替换整个 CurrentProfile 响应。

| 字段            | 类型                  | 含义 / 空值行为                                                 |
| --------------- | --------------------- | --------------------------------------------------------------- |
| `branding`      | object / null，可省略 | 平台品牌展示配置；缺失使用全部默认值                            |
| `brand_name`    | string / null，可省略 | 主品牌名；空值默认“陆链控制台”                                  |
| `platform_name` | string / null，可省略 | 品牌下方的小字平台名称；空值默认“多式联运智慧调度平台”          |
| `logo_url`      | string / null，可省略 | 可直接用于 img 的图片地址；空值或加载失败使用前端已有立方体图标 |

## 后端要求

1. 返回平台/部署级品牌配置，不拿当前 App 名、用户名、Tenant 名冒充品牌。切换 IAM/TMS 等 App 时品牌不变。配置如何存储由后端确定，可复用集团配置；本次不要求新增表或前端配置表单。
2. 三项分别允许缺省；品牌未配置或图片取链失败时，不要使整个 CurrentProfile 失败。保留用户资料正常返回。
3. `logo_url` 返回完整 HTTP(S) URL（生产推荐 HTTPS），或站点根相对路径 `/assets/...`。不返回文件 ID、Iconify 名称、HTML、SVG 源码、Base64/data URL、磁盘路径或协议相对 URL。
4. 图片应直接可访问，不要求前端附加 Authorization；若 DMS 使用私有文件，由后端生成展示地址，前端不再调用 GetAccessUrl。推荐稳定展示地址；如使用签名 URL，刷新 CurrentProfile 时返回有效新地址，过期时本版前端仅回退图标，不自动续签。
5. 推荐透明底、适配深海军蓝背景的正方形 Logo。前端使用固定图标区域和 contain，不拉伸图片；推荐简短品牌名和平台名，超长时省略并提供鼠标/键盘完整提示。
6. 保持旧客户端兼容：只增加字段，不删除或改名既有字段，不要求增加请求参数。

## 前端行为与联调验收

- 初始显示默认品牌；CurrentProfile 返回后分别替换有效字段。不缓存品牌到 localStorage，不阻塞导航或页面加载。
- 返回空白、缺字段、字段类型错误、非法 URL 或图片 404，均按字段独立回退；不会把坏图标显示成破图。
- 折叠侧栏保留 Logo，品牌/平台名称可通过聚焦或悬浮查看；展开保持主品牌大、小字平台名的两行布局，沿用现有 Token。
- 旧登录会话/旧 Tenant 的迟到资料响应被忽略，不覆盖新上下文。
- 后端上线后：刷新已登录页面，核对三字段、清空任一字段、Logo 不可用和普通用户访问即可。无须新增前端路由或业务授权。

前端实现：`src/shared/components/AppShell.vue`、`appShellBranding.ts`、`src/app/composables/useAppShellContext.ts`；接口类型：`src/features/iam/shell-context/types/shellContext.ts`。

## 前端验证记录（2026-09-29）

- 已修改正式页面绑定，复用共享 AppShell 和既有 Token；不新增页面或业务授权。
- ESLint、生产/Preview/测试 TypeCheck、生产/Preview Build、标准检查与 Page Contract base 通过；Premium strict 审计 0 项。
- 项目 Playwright：品牌区与现有框架测试共 66 项通过，覆盖 1366×768、1440×900、1920×1080。已检查默认/远端品牌、坏图回退、折叠/展开、长名称键盘提示、旧会话迟到响应及导航回归。当前未提供可用 ego-browser，使用工程内 Chromium 测试。
- 已人工核对三视口截图：品牌区仍为 48px 高，两行名称不挤压 Logo，默认文字完整显示；长文字保留完整提示。截图位于系统临时目录 `platform-shell-branding-{default|configured}-desktop-{1366|1440|1920}.png`，是测试证据，不是批准基线。
- 全量 `pnpm quality` 仍阻断于既有 `foundation.group.load` 通信链证据检查；production profile 另报告原基线摘要不匹配，以及本次 Contract revision 更新后的审批摘要/版本不匹配。未改写批准记录或视觉基线，不能宣称全量发布门禁通过。
- 新增 branding 响应通过显式 Mock 验证；真实后端尚待按本文实现、联调，不把 Mock 结果作为后端已完成的证明。
