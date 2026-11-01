<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import DetailPageTemplate from '@shared/components/page-templates/DetailPageTemplate.vue'

const route = useRoute()
const router = useRouter()
const sourcePath = computed(() => (typeof route.query.from === 'string' ? route.query.from : ''))

function retryAuthorization() {
  void router.replace(sourcePath.value || '/platform/welcome')
}
</script>

<template>
  <AppPage>
    <DetailPageTemplate scroll-mode="contained">
      <div class="authorization-service-error" role="alert">
        <Icon icon="mdi:shield-alert-outline" width="64" aria-hidden="true" />
        <h2>暂时无法校验页面权限</h2>
        <p>权限服务当前不可用。为保护数据，本次访问已停止，但这不代表当前账号没有权限。</p>
        <p v-if="sourcePath" class="authorization-service-error__source">
          待访问地址：{{ sourcePath }}
        </p>
        <div class="authorization-service-error__actions">
          <el-button @click="router.push('/platform/welcome')">返回欢迎页</el-button>
          <el-button type="primary" @click="retryAuthorization">重新校验</el-button>
        </div>
      </div>
    </DetailPageTemplate>
  </AppPage>
</template>

<style scoped lang="scss">
.authorization-service-error {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  text-align: center;
}

.authorization-service-error h2 {
  margin: var(--spacing-4) 0 var(--spacing-2);
  color: var(--text-primary);
  font-size: var(--font-size-xl);
}

.authorization-service-error p {
  max-width: 600px;
  margin: 0 0 var(--spacing-4);
}

.authorization-service-error__source {
  padding: var(--spacing-2) var(--spacing-3);
  overflow-wrap: anywhere;
  background: var(--background-muted);
  border-radius: var(--radius-default);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
}

.authorization-service-error__actions {
  display: flex;
  gap: var(--spacing-2);
}
</style>
