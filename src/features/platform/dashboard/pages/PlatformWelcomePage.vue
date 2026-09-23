<script setup lang="ts">
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import DetailPageTemplate from '@shared/components/page-templates/DetailPageTemplate.vue'
import { getDashboardAccessContext } from '../api/dashboardApi'

const { displayName } = getDashboardAccessContext()
</script>

<template>
  <AppPage class="welcome-page">
    <DetailPageTemplate scroll-mode="contained">
      <template #header>
        <PageHeader title="欢迎页" description="欢迎进入陆链统一物流平台" />
      </template>

      <section class="welcome-page__panel" aria-labelledby="welcome-title">
        <div class="welcome-page__content">
          <span class="welcome-page__icon" aria-hidden="true">
            <Icon icon="mdi:truck-fast-outline" width="32" />
          </span>
          <p class="welcome-page__eyebrow">UNIFIED LOGISTICS PLATFORM</p>
          <h2 id="welcome-title">欢迎，{{ displayName }}</h2>
          <p>您已成功登录陆链控制台。请选择顶部 App 与左侧菜单开始工作。</p>
        </div>
      </section>
    </DetailPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
.welcome-page__panel {
  display: grid;
  flex: 1;
  min-height: 0;
  padding: var(--spacing-12);
  place-items: center;
  text-align: center;
}

.welcome-page__content {
  display: flex;
  max-width: calc(var(--spacing-10) * 14);
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-3);
}

.welcome-page__icon {
  display: grid;
  width: calc(var(--spacing-12) + var(--spacing-4));
  height: calc(var(--spacing-12) + var(--spacing-4));
  margin-bottom: var(--spacing-2);
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: 50%;
  place-items: center;
}

.welcome-page__eyebrow {
  margin: 0;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
  font-weight: 650;
  letter-spacing: 0.12em;
}

.welcome-page__content h2 {
  margin: 0;
  font-size: var(--font-size-metric);
  line-height: 1.4;
}

.welcome-page__content > p:last-child {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.8;
}
</style>
