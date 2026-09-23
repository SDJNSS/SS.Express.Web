<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAppShellContext } from '@app/composables/useAppShellContext'
import { useSessionStore } from '@app/store/session'
import AppShell from '@shared/components/AppShell.vue'
import type { AppShellBreadcrumb } from '@shared/components/appShell.types'
import { notification } from '@shared/services/notification'
import { createDmsFileTransferGateway } from '@features/dms/files/public'
import { fileTransferKey } from '@shared/services/fileTransfer'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const collapsed = ref(false)
const searchKeyword = ref('')
const userInitial = computed(() => session.user.name.trim().charAt(0).toUpperCase() || '用')
const {
  currentApp,
  currentSystemId,
  currentSystemLabel,
  shellSystems,
  shellNavigation,
  navigationState,
  navigationMessage,
  resolveAppEntry,
  retryNavigation,
} = useAppShellContext()
const fileGateway = createDmsFileTransferGateway(() => {
  if (!session.canEnterAppShell || !session.user.id || !session.navigationPermissionScope)
    return undefined
  return currentApp.value
})
provide(fileTransferKey, fileGateway)
const shellBreadcrumbs = computed<AppShellBreadcrumb[]>(() => {
  const labels = [...(route.meta.breadcrumb ?? [currentSystemLabel.value])]
  const pageTitle = route.meta.title?.trim()
  if (pageTitle) {
    if (labels.length) labels[labels.length - 1] = pageTitle
    else labels.push(pageTitle)
  }
  return labels.map((label, index) => ({
    id: `${index}-${label}`,
    label,
  }))
})

async function switchSubsystem(href: string, systemId?: string) {
  const destination = systemId ? await resolveAppEntry(systemId) : href
  if (destination) await router.push(destination)
}

function submitGlobalSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return
  notification.info(`正在全平台搜索“${keyword}”`)
}

function handleUserCommand(command: string) {
  if (command === 'logout') {
    session.expireSession()
    void router.replace('/login')
    return
  }
  const messages: Record<string, string> = {
    settings: '个人设置功能正在建设中',
    organization: '组织切换功能正在建设中',
  }
  notification.info(messages[command] ?? '该操作正在建设中')
}
</script>

<template>
  <AppShell
    v-model:collapsed="collapsed"
    v-model:search-value="searchKeyword"
    product-name="陆链控制台"
    :current-system-id="currentSystemId"
    :current-system-label="currentSystemLabel"
    :systems="shellSystems"
    :navigation="shellNavigation"
    :breadcrumbs="shellBreadcrumbs"
    :notification-count="0"
    :navigation-state="navigationState"
    :navigation-message="navigationMessage"
    :display-name="session.user.name"
    :tenant-name="session.currentTenantName"
    :user-initial="userInitial"
    :user-avatar-url="session.user.avatarUrl"
    @navigate="switchSubsystem"
    @retry-navigation="retryNavigation"
    @search="submitGlobalSearch"
    @notification="notification.info('暂无新的高优先级通知')"
    @user-command="handleUserCommand"
  >
    <RouterView />
  </AppShell>
</template>
