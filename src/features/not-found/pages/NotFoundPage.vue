<script setup lang="ts">
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
</script>

<template>
  <AppPage>
    <div class="not-found">
      <Icon icon="mdi:map-marker-question-outline" width="64" aria-hidden="true" />
      <h2>页面未找到</h2>
      <p>当前地址不存在，或对应模块尚未启用。</p>
      <el-button type="primary" @click="$router.push('/platform/dashboard')">返回工作台</el-button>
    </div>
  </AppPage>
</template>

<style scoped lang="scss">
.not-found {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);

  h2 {
    margin: var(--spacing-4) 0 var(--spacing-2);
    color: var(--text-primary);
    font-size: var(--font-size-xl);
  }

  p {
    margin: 0 0 var(--spacing-5);
  }
}
</style>
