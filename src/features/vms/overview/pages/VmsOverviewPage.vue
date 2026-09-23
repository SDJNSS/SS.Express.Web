<script setup lang="ts">
import SubsystemWorkspace, {
  type WorkspaceMetric,
  type WorkspaceModule,
} from '@shared/business-components/SubsystemWorkspace.vue'

const metrics: WorkspaceMetric[] = [
  { label: '车辆总数', value: 286, hint: '本月新增 8 辆' },
  { label: '运输中', value: 142, hint: '占比 49.7%' },
  { label: '证照预警', value: 11, hint: '30 天内到期' },
  { label: '待维保', value: 7, hint: '2 辆已逾期' },
]

const modules: WorkspaceModule[] = [
  {
    title: '车辆档案',
    description: '车辆资料、组织归属与运营状态',
    icon: 'mdi:truck-outline',
  },
  {
    title: '司机档案',
    description: '司机资质、服务记录与排班状态',
    icon: 'mdi:account-tie-hat-outline',
    ...(import.meta.env.DEV ? { to: '/vms/drivers' } : {}),
  },
  {
    title: '证照管理',
    description: '统一有效期、年检与预警规则',
    icon: 'mdi:card-account-details-outline',
    ...(import.meta.env.DEV ? { to: '/vms/certificates' } : {}),
  },
  {
    title: '维保计划',
    description: '按里程和周期安排车辆维保',
    icon: 'mdi:wrench-outline',
    ...(import.meta.env.DEV ? { to: '/vms/maintenance' } : {}),
  },
]
</script>

<template>
  <SubsystemWorkspace
    title="VMS 车辆管理"
    description="统一管理车辆、司机、证照与维保计划"
    :metrics="metrics"
    :modules="modules"
  />
</template>
