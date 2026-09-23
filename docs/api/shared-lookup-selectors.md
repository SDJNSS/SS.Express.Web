# Shared Selector 数据源状态

以下组件属于可复用业务选择器，当前统一通过
`src/shared/composables/useLookupOptions.ts` 调用 `src/shared/api/lookupApi.ts`。
`lookupApi.ts` 只返回本地种子数据并模拟延迟，**没有 HTTP 请求，也不是生产数据源**。

| 组件                       | 当前消费方     | 状态                      |
| -------------------------- | -------------- | ------------------------- |
| `OrganizationSelector.vue` | Reference 表单 | Mock，保留供复用          |
| `UserSelector.vue`         | Reference 表单 | Mock，保留供复用          |
| `DriverSelector.vue`       | 暂无           | Mock，保留供后续 VMS 接入 |
| `VehicleSelector.vue`      | 暂无           | Mock，保留供后续接入      |
| `CustomerSelector.vue`     | 暂无           | Mock，保留供后续接入      |
| `AddressSelector.vue`      | 暂无           | Mock，保留供后续接入      |

VMS 车辆样本生产页退役后，不再有生产路由消费这些 Mock 数据。Reference 页面是否仅在开发环境注册属于独立决策；在该决策完成前，Reference 仍可使用上述选择器演示统一交互。

接入真实接口时必须先确认查询语义、Tenant/数据范围、分页与搜索规则，再把 `lookupApi.ts` 替换为对应 Feature 的公开查询能力。权限资源应依据真实受保护 API 建立，不能因为 Selector 位于 shared 目录而虚构通用 Function。
