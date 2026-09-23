<script setup lang="ts">
import { ref } from 'vue'

import { notification } from '@shared/services/notification'
import ApplicationResourcesPageView from '../components/ApplicationResourcesPageView.vue'
import type { ApplicationResourcesState } from '../types/applicationResources'
import { applicationResourcesFixture } from './applicationResources.fixture'

const params = new URLSearchParams(window.location.search)
const supportedStates = new Set<ApplicationResourcesState>([
  'ready',
  'loading',
  'empty',
  'filter-empty',
  'retryable-error',
  'unauthorized',
])
const requestedScenario = params.get('scenario') as ApplicationResourcesState | null
const state = ref<ApplicationResourcesState>(
  requestedScenario && supportedStates.has(requestedScenario) ? requestedScenario : 'ready',
)
const feedback = ref('应用与权限资源候选页面已就绪')

document.title = '应用与权限资源 · UI Design'

function announce(message: string) {
  feedback.value = message
  notification.success(message)
}

function retry() {
  state.value = 'loading'
  feedback.value = '正在重新加载完整目录'
  window.setTimeout(() => {
    state.value = 'ready'
    feedback.value = '完整目录已重新加载'
  }, 240)
}
</script>

<template>
  <p class="sr-only" role="status" aria-live="polite">{{ feedback }}</p>
  <ApplicationResourcesPageView
    :applications="state === 'empty' ? [] : applicationResourcesFixture"
    :state="state"
    initial-application-code="TMS"
    initial-resource-code="TMS.ORDERS"
    @action="announce"
    @retry="retry"
  />
</template>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px; /* standards-allow: visually hidden accessibility utility */
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
