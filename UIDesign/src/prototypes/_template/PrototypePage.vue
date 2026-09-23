<script setup lang="ts">
import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
</script>

<template>
  <AppPage>
    <PageHeader title="页面名称" description="说明页面目标、关键状态和本次需要确认的设计问题。" />
    <section class="prototype-content">
      在此组合 Shared Component、Business Component 与模拟数据，验证页面视觉和关键交互。
    </section>
  </AppPage>
</template>

<style scoped lang="scss">
.prototype-content {
  min-height: 360px;
  padding: var(--spacing-5);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-large);
  background: var(--background-card);
  color: var(--text-secondary);
}
</style>
