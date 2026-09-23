<script setup lang="ts">
import { inject } from 'vue'

import { appShellContentContextKey } from './appShellContentContext'

defineProps<{
  title: string
  description?: string
}>()

const appShellContext = inject(appShellContentContextKey, undefined)
</script>

<template>
  <Teleport v-if="appShellContext && $slots.actions" defer :to="appShellContext.pageActionsTarget">
    <div class="page-header__actions">
      <slot name="actions" />
    </div>
  </Teleport>
  <header v-if="!appShellContext" class="page-header">
    <div class="page-header__copy">
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped lang="scss">
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-4);
  min-height: var(--size-header);
}

.page-header__copy {
  min-width: 0;

  h1 {
    margin: 0;
    color: var(--text-primary);
    font-size: var(--font-size-xl);
    font-weight: 650;
    line-height: 1.4;
    letter-spacing: -0.01em;
  }

  p {
    margin: var(--spacing-1) 0 0;
    color: var(--text-secondary);
    font-size: var(--font-size-base);
    line-height: 1.5;
  }
}

.page-header__actions {
  display: flex;
  flex: none;
  gap: var(--spacing-2);
}
</style>
