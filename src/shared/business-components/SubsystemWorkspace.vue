<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { RouterLink } from 'vue-router'

import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'

export interface WorkspaceMetric {
  label: string
  value: string | number
  hint: string
}

export interface WorkspaceModule {
  title: string
  description: string
  icon: string
  to?: string
}

defineProps<{
  title: string
  description: string
  metrics: WorkspaceMetric[]
  modules: WorkspaceModule[]
}>()
</script>

<template>
  <AppPage>
    <PageHeader :title="title" :description="description">
      <template v-if="$slots.actions" #actions>
        <slot name="actions" />
      </template>
    </PageHeader>

    <section class="workspace-metrics surface">
      <article v-for="metric in metrics" :key="metric.label">
        <span>{{ metric.label }}</span>
        <strong>{{ metric.value }}</strong>
        <small>{{ metric.hint }}</small>
      </article>
    </section>

    <section class="workspace-main surface">
      <header>
        <h2>功能模块</h2>
        <p>当前工程已完成模块边界与路由装配，可按 Feature 逐步迁移业务。</p>
      </header>
      <div class="workspace-modules">
        <component
          :is="module.to ? RouterLink : 'article'"
          v-for="module in modules"
          :key="module.title"
          :to="module.to"
          class="workspace-module"
          :class="{ 'workspace-module--unavailable': !module.to }"
        >
          <span class="workspace-module__icon"><Icon :icon="module.icon" width="24" /></span>
          <div>
            <strong>{{ module.title }}</strong>
            <p>{{ module.description }}</p>
          </div>
          <Icon v-if="module.to" icon="mdi:chevron-right" width="20" />
          <span v-else class="workspace-module__status">待接入</span>
        </component>
      </div>
    </section>
  </AppPage>
</template>

<style scoped lang="scss">
.workspace-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: var(--spacing-5) 0;
}

.workspace-metrics article {
  padding: 0 var(--spacing-5);
  border-right: 1px solid var(--border-light);

  &:last-child {
    border-right: 0;
  }
  span,
  small {
    display: block;
    color: var(--text-secondary);
  }
  strong {
    display: block;
    margin: var(--spacing-2) 0;
    font-size: var(--font-size-metric);
  }
  small {
    font-size: var(--font-size-xs);
  }
}

.workspace-main {
  flex: 1;
  min-height: 0;
  padding: var(--spacing-5);

  > header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding-bottom: var(--spacing-4);
    border-bottom: 1px solid var(--border-light);
  }

  h2 {
    margin: 0;
    font-size: var(--font-size-lg);
  }
  header p {
    margin: 0;
    color: var(--text-secondary);
  }
}

.workspace-modules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-4);
  padding-top: var(--spacing-5);
}

.workspace-module {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--spacing-4);
  min-height: 92px;
  padding: var(--spacing-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
  transition:
    border-color 150ms ease,
    box-shadow 150ms ease;

  &:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-card);
  }
  strong {
    font-size: var(--font-size-md);
  }
  p {
    margin: var(--spacing-1) 0 0;
    color: var(--text-secondary);
  }
}

.workspace-module--unavailable {
  cursor: default;
}

.workspace-module--unavailable:hover {
  border-color: var(--border-default);
  box-shadow: none;
}

.workspace-module__status {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.workspace-module__icon {
  display: grid;
  width: 48px;
  height: 48px;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-default);
  place-items: center;
}
</style>
