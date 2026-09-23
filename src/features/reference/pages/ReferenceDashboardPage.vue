<script setup lang="ts">
import SubsystemWorkspace, {
  type WorkspaceMetric,
  type WorkspaceModule,
} from '@shared/business-components/SubsystemWorkspace.vue'

const metrics: WorkspaceMetric[] = [
  { label: '核心指标 A', value: '1,286', hint: '较上期 +8.4%' },
  { label: '核心指标 B', value: '94.8%', hint: '目标 95.0%' },
  { label: '待处理事项', value: 12, hint: '3 项即将超时' },
  { label: '异常预警', value: 5, hint: '2 项高优先级' },
]

const modules: WorkspaceModule[] = [
  { title: 'Metric Card', description: '关键指标与趋势说明', icon: 'mdi:counter' },
  { title: 'Chart', description: '统一 ECharts 主题和提示格式', icon: 'mdi:chart-line' },
  { title: 'Table', description: '承载可操作的明细数据', icon: 'mdi:table' },
  {
    title: 'Status Panel',
    description: '展示待办、告警和异常状态',
    icon: 'mdi:alert-circle-outline',
  },
]
</script>

<template>
  <SubsystemWorkspace
    title="ReferenceDashboardPage"
    description="标准仪表盘页面模板与组件组合参考"
    :metrics="metrics"
    :modules="modules"
  />
</template>
