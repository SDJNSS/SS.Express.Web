<script setup lang="ts">
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'

defineProps<{
  title: string
  description: string
  featurePath: string
  pageType?: string
}>()

const showReferenceImplementation = import.meta.env.DEV
</script>

<template>
  <AppPage>
    <PageHeader :title="title" :description="description" />
    <section class="feature-scaffold surface">
      <span class="feature-scaffold__icon"
        ><Icon icon="mdi:layers-triple-outline" width="34"
      /></span>
      <h2>功能开发中</h2>
      <p v-if="showReferenceImplementation">
        当前第一阶段已完成路由、导航和 Feature 边界注册。业务页面将在对应 PRD 与 Page Specification
        确认后继续实现。
      </p>
      <p v-else>该功能正在开发，暂不可用。请通过左侧导航进入其他已开放功能。</p>
      <dl v-if="showReferenceImplementation">
        <div>
          <dt>Feature 目录</dt>
          <dd>{{ featurePath }}</dd>
        </div>
        <div>
          <dt>推荐页面类型</dt>
          <dd>{{ pageType ?? 'ListPage' }}</dd>
        </div>
        <div>
          <dt>参考实现</dt>
          <dd><RouterLink to="/reference/list">查看标准页面</RouterLink></dd>
        </div>
      </dl>
    </section>
  </AppPage>
</template>

<style scoped lang="scss">
.feature-scaffold {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 360px;
  text-align: center;

  h2 {
    margin: var(--spacing-4) 0 var(--spacing-2);
    font-size: var(--font-size-lg);
  }
  > p {
    max-width: 620px;
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.8;
  }
  dl {
    width: min(620px, 80%);
    margin: var(--spacing-6) 0 0;
    text-align: left;
  }
  dl div {
    display: grid;
    grid-template-columns: 130px 1fr;
    padding: var(--spacing-3);
    border-top: 1px solid var(--border-light);
  }
  dt {
    color: var(--text-secondary);
  }
  dd {
    margin: 0;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  }
  a {
    color: var(--color-primary);
    font-family: var(--font-family);
  }
}

.feature-scaffold__icon {
  display: grid;
  width: 64px;
  height: 64px;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-large);
  place-items: center;
}
</style>
