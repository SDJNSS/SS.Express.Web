<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import DetailPageTemplate from '@shared/components/page-templates/DetailPageTemplate.vue'

const route = useRoute()
const router = useRouter()
const sourcePath = computed(() => typeof route.query.from === 'string' ? route.query.from : '')
</script>

<template>
  <AppPage>
    <DetailPageTemplate scroll-mode="contained">
      <div class="forbidden-page">
        <Icon icon="mdi:shield-lock-outline" width="64" aria-hidden="true" />
        <h2>无权访问此页面</h2>
        <p>当前账号在本 Tenant 下没有该页面权限。你可以返回可访问入口，或联系管理员授权。</p>
        <p v-if="sourcePath" class="forbidden-page__source">原地址：{{ sourcePath }}</p>
        <div class="forbidden-page__actions">
          <el-button @click="router.back()">返回上一页</el-button>
          <el-button type="primary" @click="router.push('/platform/welcome')">返回欢迎页</el-button>
        </div>
      </div>
    </DetailPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
.forbidden-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  text-align: center;

  h2 {
    margin: var(--spacing-4) 0 var(--spacing-2);
    color: var(--text-primary);
    font-size: var(--font-size-xl);
  }

  p {
    max-width: 560px;
    margin: 0 0 var(--spacing-4);
  }
}

.forbidden-page__source {
  padding: var(--spacing-2) var(--spacing-3);
  overflow-wrap: anywhere;
  background: var(--background-muted);
  border-radius: var(--radius-default);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
}

.forbidden-page__actions {
  display: flex;
  gap: var(--spacing-2);
}
</style>
