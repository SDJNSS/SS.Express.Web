<script setup lang="ts">
import { Icon } from '@iconify/vue'

defineProps<{
  productName: string
}>()
</script>

<template>
  <div class="auth-brand" aria-label="陆链控制台">
    <span class="auth-brand__mark" aria-hidden="true">
      <Icon icon="mdi:cube-outline" width="28" />
    </span>
    <span class="auth-brand__copy">
      <strong>{{ productName }}</strong>
      <small>LOGISTICS CONTROL NETWORK</small>
    </span>
  </div>
</template>

<style scoped lang="scss">
.auth-brand {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-3);
  width: fit-content;
}

.auth-brand__mark {
  display: grid;
  width: calc(var(--spacing-10) + var(--spacing-2));
  height: calc(var(--spacing-10) + var(--spacing-2));
  color: var(--color-sidebar-brand);
  background: color-mix(in srgb, var(--background-sidebar-active) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-sidebar-brand) 42%, transparent);
  border-radius: var(--radius-large);
  place-items: center;
}

.auth-brand__copy {
  display: grid;
  gap: var(--spacing-1);
}

.auth-brand__copy strong {
  font-size: var(--font-size-lg);
  letter-spacing: 0.04em;
}

.auth-brand__copy small {
  color: var(--color-sidebar-muted);
  font-size: var(--font-size-xs);
  letter-spacing: 0.12em;
}
</style>
