# 业务原型

按 `<subsystem>/<feature>/<page-id>` 存放业务页面原型。每个页面必须包含 `prototype.meta.ts`，并在 `@ui/prototype-registry` 显式注册。

原型必须使用模拟数据覆盖正常、空、加载、异常和关键交互状态；不得连接生产 API。确认后的原型应记录关联 PRD、Page Specification、评审日期和有意差异。
