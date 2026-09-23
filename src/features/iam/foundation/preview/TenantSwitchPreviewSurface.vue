<script setup lang="ts">
import { ref } from 'vue'

import AppPage from '@shared/components/AppPage.vue'
import AppShell from '@shared/components/AppShell.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import TenantChoicePanel from '../components/TenantChoicePanel.vue'
import type { FoundationPreviewState, TenantOption } from '../types/foundation'

defineProps<{
  options: TenantOption[]
  selectedId: number | undefined
  setAsDefault: boolean
  state: FoundationPreviewState
}>()

const emit = defineEmits<{
  select: [id: number]
  'update:setAsDefault': [value: boolean]
  submit: []
  cancel: []
  retry: []
}>()

const collapsed = ref(false)
const search = ref('')
const dialogVisible = ref(true)

function cancelSwitch() {
  dialogVisible.value = false
  emit('cancel')
}
</script>

<template>
  <AppShell
    v-model:collapsed="collapsed"
    v-model:search-value="search"
    product-name="SS Express"
    current-system-id="iam"
    current-system-label="身份与访问管理"
    :systems="[
      { id: 'iam', label: 'IAM', icon: 'mdi:shield-account-outline', href: '/iam' },
      { id: 'tms', label: 'TMS', icon: 'mdi:truck-fast-outline', href: '/tms' },
      { id: 'vms', label: 'VMS', icon: 'mdi:car-cog', href: '/vms' },
    ]"
    :navigation="[
      {
        id: 'organization',
        label: '组织管理',
        icon: 'mdi:domain',
        href: '/iam/organizations',
        active: true,
      },
      {
        id: 'members',
        label: '用户与成员',
        icon: 'mdi:account-multiple-outline',
        href: '/iam/members',
      },
    ]"
    :breadcrumbs="[
      { id: 'iam', label: 'IAM' },
      { id: 'dashboard', label: '欢迎页' },
    ]"
    display-name="林嘉"
    tenant-name="陆链华东运营中心"
    user-initial="林"
  >
    <AppPage>
      <PageHeader title="欢迎回来，林嘉" description="当前业务空间：陆链华东运营中心" />
      <section class="tenant-switch-preview__placeholder surface">
        <strong>当前 Tenant 上下文保持可用</strong>
        <p>切换请求成功前，页面不会混合显示新 Tenant 标识与旧 Tenant 数据。</p>
      </section>
    </AppPage>

    <el-dialog
      v-model="dialogVisible"
      class="tenant-switch-preview__dialog"
      width="760"
      :show-close="false"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
    >
      <TenantChoicePanel
        :options="options"
        :selected-id="selectedId"
        :set-as-default="setAsDefault"
        :state="state"
        mode="switch"
        @select="emit('select', $event)"
        @update:set-as-default="emit('update:setAsDefault', $event)"
        @submit="emit('submit')"
        @cancel="cancelSwitch"
        @retry="emit('retry')"
      />
    </el-dialog>
  </AppShell>
</template>

<style scoped lang="scss">
.tenant-switch-preview__placeholder {
  display: grid;
  min-height: calc(var(--spacing-12) * 6);
  gap: var(--spacing-2);
  padding: var(--spacing-6);
  place-content: center;
  text-align: center;
}

.tenant-switch-preview__placeholder strong {
  font-size: var(--font-size-lg);
}

.tenant-switch-preview__placeholder p {
  margin: 0;
  color: var(--text-secondary);
}

:global(.tenant-switch-preview__dialog .el-dialog) {
  color: var(--text-inverse);
  background: var(--background-sidebar);
  border: 1px solid color-mix(in srgb, var(--color-sidebar-muted) 34%, transparent);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-floating);
}

:global(.tenant-switch-preview__dialog .el-dialog__header) {
  padding: 0;
}

:global(.tenant-switch-preview__dialog .el-dialog__body) {
  padding: var(--spacing-6);
}
</style>
