<script setup lang="ts">
import AuthBrand from '@shared/components/AuthBrand.vue'
import AuthPageTemplate from '@shared/components/page-templates/AuthPageTemplate.vue'
import TenantChoicePanel from './TenantChoicePanel.vue'
import type { FoundationPreviewState, TenantOption } from '../types/foundation'

defineProps<{
  options: TenantOption[]
  selectedId: number | undefined
  setAsDefault: boolean
  state: FoundationPreviewState
  account?: string | undefined
}>()

const emit = defineEmits<{
  select: [id: number]
  'update:setAsDefault': [value: boolean]
  submit: []
  cancel: []
  retry: []
}>()
</script>

<template>
  <AuthPageTemplate variant="focused" class="tenant-context-page">
    <template #access>
      <div class="tenant-context-page__layout">
        <header class="tenant-context-page__brand"><AuthBrand product-name="SS Express" /></header>
        <TenantChoicePanel
          class="tenant-context-page__panel"
          :options="options"
          :selected-id="selectedId"
          :set-as-default="setAsDefault"
          :state="state"
          mode="select"
          @select="emit('select', $event)"
          @update:set-as-default="emit('update:setAsDefault', $event)"
          @submit="emit('submit')"
          @cancel="emit('cancel')"
          @retry="emit('retry')"
        />
        <footer class="tenant-context-page__footer">
          <span>当前身份：{{ account || 'hmxt' }}</span
          ><i aria-hidden="true"></i><span>仅显示本人可进入的 Tenant</span>
        </footer>
      </div>
    </template>
  </AuthPageTemplate>
</template>

<style scoped lang="scss">
.tenant-context-page__layout {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: var(--spacing-8) var(--spacing-12);
  background:
    linear-gradient(
      color-mix(in srgb, var(--color-sidebar-muted) 8%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-sidebar-muted) 8%, transparent) 1px,
      transparent 1px
    ),
    var(--background-sidebar);
  background-size: var(--spacing-10) var(--spacing-10);
}

.tenant-context-page__brand {
  width: calc(var(--spacing-10) * 6);
}

.tenant-context-page__panel {
  align-self: center;
  justify-self: center;
}

.tenant-context-page__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-3);
  color: var(--color-sidebar-muted);
  font-size: var(--font-size-xs);
}

.tenant-context-page__footer i {
  width: var(--spacing-8);
  height: 1px;
  background: color-mix(in srgb, var(--color-sidebar-muted) 42%, transparent);
}

@media (max-height: 800px) {
  .tenant-context-page__layout {
    padding: var(--spacing-5) var(--spacing-10);
  }
}
</style>
