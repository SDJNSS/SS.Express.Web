<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Icon } from '@iconify/vue'

import AppShell from '@shared/components/AppShell.vue'
import type { AppShellNavigationItem } from '@shared/components/appShell.types'
import PlatformFrameworkPageView from '../components/PlatformFrameworkPageView.vue'
import type {
  FrameworkPreviewState,
  FrameworkSearchModel,
  FrameworkTaskRow,
} from '../types/frameworkShell'
import { frameworkShellFixture } from './frameworkShell.fixture'

const supportedScenarios = new Set<FrameworkPreviewState>([
  'ready',
  'loading',
  'empty',
  'retryable-error',
])
const requestedScenario = new URLSearchParams(window.location.search).get('scenario')
const initialScenario = supportedScenarios.has(requestedScenario as FrameworkPreviewState)
  ? (requestedScenario as FrameworkPreviewState)
  : 'ready'

document.title = '物流平台框架页候选 · UI Design'

const collapsed = ref(false)
const activeSystemId = ref('tms')
const activeHref = ref('/tms/trips')
const globalSearch = ref('')
const selectedContext = ref('华东中心')
const scenario = ref<FrameworkPreviewState>(initialScenario)
const interactionLoading = ref(false)
const query = ref<FrameworkSearchModel>({ keyword: '', status: '', routeType: '' })
const page = ref(1)
const pageSize = ref(10)
const previewStatus = ref('候选框架已就绪')
let interactionTimer: number | undefined

const currentSystemLabel = computed(
  () =>
    (activeSystemId.value === 'tms'
      ? frameworkShellFixture.currentSystemLabel
      : frameworkShellFixture.systems.find((system) => system.id === activeSystemId.value)
          ?.label) ?? frameworkShellFixture.currentSystemLabel,
)

const navigation = computed<AppShellNavigationItem[]>(() =>
  frameworkShellFixture.navigation.map((item) => {
    const children = item.children?.map((child) => ({
      ...child,
      active: child.href === activeHref.value,
    }))
    return {
      ...item,
      active: item.href === activeHref.value || Boolean(children?.some((child) => child.active)),
      ...(children ? { children } : {}),
    }
  }),
)

const filteredRows = computed(() => {
  const keyword = query.value.keyword.trim().toLocaleLowerCase('zh-CN')
  return frameworkShellFixture.rows.filter((row) => {
    const matchesKeyword =
      !keyword ||
      [row.taskNo, row.route, row.vehicle, row.dispatcher].some((value) =>
        value.toLocaleLowerCase('zh-CN').includes(keyword),
      )
    const matchesStatus = !query.value.status || row.status === query.value.status
    const matchesRouteType = !query.value.routeType || row.routeType === query.value.routeType
    return matchesKeyword && matchesStatus && matchesRouteType
  })
})

const effectiveState = computed<FrameworkPreviewState>(() => {
  if (scenario.value !== 'ready') return scenario.value
  if (interactionLoading.value) return 'loading'
  return filteredRows.value.length ? 'ready' : 'empty'
})
const pagedRows = computed<FrameworkTaskRow[]>(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})
const visibleTotal = computed(() =>
  effectiveState.value === 'ready' || effectiveState.value === 'loading'
    ? filteredRows.value.length
    : 0,
)

function completeLocalAction(message: string) {
  if (interactionTimer) window.clearTimeout(interactionTimer)
  scenario.value = 'ready'
  interactionLoading.value = true
  previewStatus.value = '正在更新候选数据'
  interactionTimer = window.setTimeout(() => {
    interactionLoading.value = false
    previewStatus.value = message
  }, 220)
}

function handleNavigate(href: string) {
  const system = frameworkShellFixture.systems.find((item) => item.href === href)
  if (system) {
    activeSystemId.value = system.id
    previewStatus.value = `已切换 ${system.label} 导航选中态；候选内容仍保留 TMS 样例`
    return
  }
  activeHref.value = href
  previewStatus.value = '已更新候选导航选中态'
}

function handleGlobalSearch(keyword: string) {
  query.value = { ...query.value, keyword }
  page.value = 1
  completeLocalAction(keyword ? `已在候选数据中检索“${keyword}”` : '请输入全局检索内容')
}

function search() {
  page.value = 1
  completeLocalAction('候选筛选条件已生效')
}

function reset() {
  query.value = { keyword: '', status: '', routeType: '' }
  page.value = 1
  completeLocalAction('候选筛选条件已重置')
}

function selectContext(command: string) {
  selectedContext.value = command
  previewStatus.value = `已切换为${command}`
}

function handleUserCommand(command: string) {
  const commandLabels: Record<string, string> = {
    settings: '个人设置',
    organization: '切换组织',
    logout: '退出登录',
  }
  previewStatus.value = `${commandLabels[command] ?? '用户操作'}仅展示候选反馈，不执行生产动作`
}

onBeforeUnmount(() => {
  if (interactionTimer) window.clearTimeout(interactionTimer)
})
</script>

<template>
  <AppShell
    v-model:collapsed="collapsed"
    v-model:search-value="globalSearch"
    :product-name="frameworkShellFixture.productName"
    :current-system-id="activeSystemId"
    :current-system-label="currentSystemLabel"
    :systems="frameworkShellFixture.systems"
    :navigation="navigation"
    :breadcrumbs="frameworkShellFixture.breadcrumbs"
    :notification-count="3"
    display-name="林嘉"
    tenant-name="陆链华东运营中心"
    user-initial="林"
    search-placeholder="搜索任务、线路、车辆"
    data-testid="platform-framework-shell"
    @navigate="handleNavigate"
    @search="handleGlobalSearch"
    @notification="previewStatus = '候选通知入口已响应'"
    @user-command="handleUserCommand"
  >
    <template #context>
      <el-dropdown trigger="click" @command="selectContext">
        <button
          class="preview-context"
          type="button"
          aria-label="切换运营上下文"
          @click="previewStatus = '运营上下文菜单已打开'"
        >
          <Icon icon="mdi:domain" width="18" aria-hidden="true" />
          <span>{{ selectedContext }}</span>
          <Icon icon="mdi:chevron-down" width="17" aria-hidden="true" />
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="华东中心">华东中心</el-dropdown-item>
            <el-dropdown-item command="华南中心">华南中心</el-dropdown-item>
            <el-dropdown-item command="全国视图">全国视图</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </template>

    <p class="sr-only" role="status" aria-live="polite">{{ previewStatus }}</p>
    <PlatformFrameworkPageView
      v-model="query"
      v-model:page="page"
      v-model:page-size="pageSize"
      :rows="pagedRows"
      :total="visibleTotal"
      :state="effectiveState"
      @search="search"
      @reset="reset"
      @refresh="completeLocalAction('候选数据已刷新')"
      @retry="completeLocalAction('候选数据已重新加载')"
    />

    <template #footer>
      <span>陆链控制台 · 平台统一框架</span>
      <span class="preview-footer__divider" aria-hidden="true"></span>
      <span>UIDesign · 待复核</span>
    </template>
  </AppShell>
</template>

<style scoped lang="scss">
.preview-context {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  max-width: calc(var(--spacing-10) * 5);
  height: var(--size-control);
  padding: 0 var(--spacing-3);
  overflow: hidden;
  color: var(--text-regular);
  white-space: nowrap;
  background: var(--background-muted);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
  cursor: pointer;
}

.preview-context span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-footer__divider {
  width: 1px;
  height: 12px;
  margin: 0 var(--spacing-3);
  background: var(--border-default);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: calc(var(--spacing-1) * -1);
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1500px) {
  .preview-context {
    max-width: calc(var(--spacing-10) * 4);
  }
}
</style>
