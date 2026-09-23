<script setup lang="ts">
import SubsystemWorkspace, {
  type WorkspaceMetric,
  type WorkspaceModule,
} from '@shared/business-components/SubsystemWorkspace.vue'

const metrics: WorkspaceMetric[] = [
  { label: '今日订单', value: 128, hint: '较昨日 -6.2%' },
  { label: '待调度', value: 12, hint: '3 单即将超时' },
  { label: '运输中', value: 46, hint: '准点率 94.8%' },
  { label: '异常任务', value: 5, hint: '需立即跟进' },
]

const modules: WorkspaceModule[] = [
  {
    title: '运输订单',
    description: '客户委托、线路与时效要求',
    icon: 'mdi:clipboard-text-outline',
    ...(import.meta.env.DEV ? { to: '/tms/orders' } : {}),
  },
  {
    title: '调度工作台',
    description: '车辆、司机与运输任务编排',
    icon: 'mdi:map-marker-path',
    ...(import.meta.env.DEV ? { to: '/tms/dispatch' } : {}),
  },
  {
    title: '运输任务',
    description: '在途跟踪、异常与回单管理',
    icon: 'mdi:routes',
    ...(import.meta.env.DEV ? { to: '/tms/trips' } : {}),
  },
  { title: '运费结算', description: '运输计费与承运商对账', icon: 'mdi:cash-multiple' },
]
</script>

<template>
  <SubsystemWorkspace
    title="TMS 运输管理"
    description="覆盖订单、调度、在途执行与回单闭环"
    :metrics="metrics"
    :modules="modules"
  />
</template>
