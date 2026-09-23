<script setup lang="ts">
import SubsystemWorkspace, {
  type WorkspaceMetric,
  type WorkspaceModule,
} from '@shared/business-components/SubsystemWorkspace.vue'

const metrics: WorkspaceMetric[] = [
  { label: '有效用户', value: 268, hint: '今日登录 142 人' },
  { label: '组织节点', value: 34, hint: '覆盖 8 个运营区域' },
  { label: '角色模板', value: 16, hint: '本月新增 2 个' },
  { label: '权限风险', value: 3, hint: '需要管理员复核' },
]

const modules: WorkspaceModule[] = [
  {
    title: '用户与成员',
    description: '账号生命周期、岗位与组织归属',
    icon: 'mdi:account-multiple-outline',
    to: '/iam/members',
  },
  {
    title: '组织架构',
    description: '企业、部门与运营中心层级',
    icon: 'mdi:domain',
    to: '/iam/organizations',
  },
  {
    title: '角色权限',
    description: '角色模板与细粒度操作权限',
    icon: 'mdi:shield-account-outline',
    to: '/iam/roles',
  },
  {
    title: '审计日志',
    description: '记录身份与权限相关的关键操作',
    icon: 'mdi:file-document-check-outline',
  },
]
</script>

<template>
  <SubsystemWorkspace
    title="IAM 身份中心"
    description="统一管理平台用户、组织、角色与访问权限"
    :metrics="metrics"
    :modules="modules"
  />
</template>
