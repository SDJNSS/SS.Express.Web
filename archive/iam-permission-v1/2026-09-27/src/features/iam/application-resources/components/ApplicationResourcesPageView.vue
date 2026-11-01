<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import DateTimeText from '@shared/components/DateTimeText.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import WorkspacePageTemplate from '@shared/components/page-templates/WorkspacePageTemplate.vue'
import { resolveLocalMdiIcon } from '@shared/icons/registerIcons'
import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'
import ApplicationFormDrawer from './ApplicationFormDrawer.vue'
import CatalogImpactDialog from './CatalogImpactDialog.vue'
import ResourceFormDrawer from './ResourceFormDrawer.vue'
import type {
  ApplicationFormValue,
  ApplicationRecord,
  ApplicationResourcesState,
  CatalogDeleteImpact,
  CatalogFilters,
  CatalogTarget,
  PermissionResourceRecord,
  PermissionResourceType,
  ResourceFormValue,
} from '../types/applicationResources'

const props = withDefaults(
  defineProps<{
    applications: ApplicationRecord[]
    state: ApplicationResourcesState
    initialApplicationCode?: string
    initialResourceCode?: string
    catalogWarning?: string
    authoritativeDeleteImpactReady?: boolean
    allowStructuralDelete?: boolean
    submitApplication?:
      | ((
          value: ApplicationFormValue,
          mode: 'create' | 'edit',
          record?: ApplicationRecord,
        ) => Promise<void>)
      | undefined
    submitResource?:
      | ((
          value: ResourceFormValue,
          mode: 'create' | 'edit',
          record?: PermissionResourceRecord,
        ) => Promise<void>)
      | undefined
    submitStatus?:
      ((target: CatalogTarget, targetStatus: 'active' | 'disabled') => Promise<void>) | undefined
    submitDelete?:
      ((target: CatalogTarget, impact: CatalogDeleteImpact) => Promise<void>) | undefined
  }>(),
  {
    initialApplicationCode: '',
    initialResourceCode: '',
    catalogWarning: '',
    authoritativeDeleteImpactReady: false,
    allowStructuralDelete: false,
    submitApplication: undefined,
    submitResource: undefined,
    submitStatus: undefined,
    submitDelete: undefined,
  },
)

const emit = defineEmits<{
  action: [message: string]
  retry: []
}>()

const emptyFilters = (): CatalogFilters => ({
  keyword: '',
  appStatus: '',
  resourceStatus: '',
  resourceType: '',
})
const draftFilters = reactive<CatalogFilters>(emptyFilters())
const appliedFilters = ref<CatalogFilters>(emptyFilters())
const selectedApplicationId = ref(0)
const selectedResourceId = ref(0)
const selectedKind = ref<'application' | 'resource'>('application')
const applicationFormVisible = ref(false)
const applicationFormMode = ref<'create' | 'edit'>('create')
const resourceFormVisible = ref(false)
const resourceFormMode = ref<'create' | 'edit'>('create')
const resourceParent = ref<PermissionResourceRecord>()
const actionDialogVisible = ref(false)
const actionDialogMode = ref<'status' | 'delete'>('status')
const actionSubmitting = ref(false)
const actionError = ref('')

function flattenResources(nodes: PermissionResourceRecord[]): PermissionResourceRecord[] {
  return nodes.flatMap((node) => [node, ...flattenResources(node.children)])
}

function findResourceByCode(
  applications: ApplicationRecord[],
  resourceCode: string,
): PermissionResourceRecord | undefined {
  for (const application of applications) {
    const found = flattenResources(application.modules).find(
      (resource) => resource.resourceCode === resourceCode,
    )
    if (found) return found
  }
  return undefined
}

function matchesText(value: string | null | undefined, keyword: string) {
  return (value ?? '').toLocaleLowerCase('zh-CN').includes(keyword)
}

function filterResources(
  nodes: PermissionResourceRecord[],
  filters: CatalogFilters,
  applicationMatchesKeyword: boolean,
): PermissionResourceRecord[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase('zh-CN')
  const hasResourceFilters = Boolean(keyword || filters.resourceStatus || filters.resourceType)
  if (
    !hasResourceFilters ||
    (applicationMatchesKeyword && !filters.resourceStatus && !filters.resourceType)
  ) {
    return nodes
  }

  return nodes.flatMap((node) => {
    const children = filterResources(node.children, filters, applicationMatchesKeyword)
    const textMatches =
      !keyword ||
      matchesText(node.resourceCode, keyword) ||
      matchesText(node.resourceName, keyword) ||
      matchesText(node.apiPath, keyword)
    const statusMatches = !filters.resourceStatus || node.status === filters.resourceStatus
    const typeMatches = !filters.resourceType || node.resourceType === filters.resourceType
    if ((textMatches && statusMatches && typeMatches) || children.length) {
      return [{ ...node, children }]
    }
    return []
  })
}

const visibleApplications = computed(() => {
  if (!['ready', 'filter-empty'].includes(props.state) || props.state === 'filter-empty') return []
  const filters = appliedFilters.value
  const keyword = filters.keyword.trim().toLocaleLowerCase('zh-CN')

  return props.applications.flatMap((application) => {
    if (filters.appStatus && application.status !== filters.appStatus) return []
    const applicationMatchesKeyword =
      !keyword ||
      matchesText(application.appCode, keyword) ||
      matchesText(application.appName, keyword)
    const modules = filterResources(application.modules, filters, applicationMatchesKeyword)
    if (!applicationMatchesKeyword && !modules.length) return []
    if ((filters.resourceStatus || filters.resourceType) && !modules.length) return []
    return [{ ...application, modules }]
  })
})

const selectedApplication = computed(() =>
  visibleApplications.value.find((application) => application.id === selectedApplicationId.value),
)
const currentResources = computed(() => selectedApplication.value?.modules ?? [])
const selectedResource = computed(() =>
  flattenResources(currentResources.value).find(
    (resource) => resource.id === selectedResourceId.value,
  ),
)
const activeFilterCount = computed(() => Object.values(appliedFilters.value).filter(Boolean).length)
const hasFilterResult = computed(() => visibleApplications.value.length > 0)
const canMaintainPage = computed(
  () =>
    props.state === 'ready' && props.applications.some((application) => application.canMaintain),
)

function handleFilterEnter(event: KeyboardEvent) {
  if (!event.isComposing) applyFilters()
}

function resourceCounts(nodes: PermissionResourceRecord[]) {
  const all = flattenResources(nodes)
  return {
    moduleCount: all.filter((resource) => resource.resourceType === 'module').length,
    menuCount: all.filter((resource) => resource.resourceType === 'menu').length,
    pageCount: all.filter((resource) => resource.resourceType === 'page').length,
    functionCount: all.filter((resource) => resource.resourceType === 'function').length,
  }
}

const currentCounts = computed(() => resourceCounts(currentResources.value))
const selectedTarget = computed<CatalogTarget | undefined>(() => {
  if (selectedKind.value === 'application' && selectedApplication.value) {
    const application = selectedApplication.value
    return {
      targetType: 'application',
      id: application.id,
      code: application.appCode,
      name: application.appName,
      status: application.status,
      version: application.version,
      canMaintain: application.canMaintain,
    }
  }
  const resource = selectedResource.value
  if (!resource) return undefined
  return {
    targetType: 'resource',
    id: resource.id,
    code: resource.resourceCode,
    name: resource.resourceName,
    status: resource.status,
    version: resource.version,
    canMaintain: resource.canMaintain,
    resourceType: resource.resourceType,
  }
})
const selectedImpact = computed<CatalogDeleteImpact>(() => {
  if (selectedKind.value === 'application') {
    return {
      ...currentCounts.value,
      descendantCount:
        currentCounts.value.moduleCount +
        currentCounts.value.menuCount +
        currentCounts.value.pageCount +
        currentCounts.value.functionCount,
    }
  }
  const resource = selectedResource.value
  if (!resource) {
    return {
      moduleCount: 0,
      menuCount: 0,
      pageCount: 0,
      functionCount: 0,
      descendantCount: 0,
    }
  }
  const counts = resourceCounts([resource])
  return {
    ...counts,
    descendantCount:
      counts.moduleCount + counts.menuCount + counts.pageCount + counts.functionCount - 1,
    isLastModule:
      resource.resourceType === 'module' && (selectedApplication.value?.modules.length ?? 0) <= 1,
  }
})

function initializeSelection() {
  const initialApplication =
    props.applications.find(
      (application) => application.appCode === props.initialApplicationCode,
    ) ?? props.applications[0]
  selectedApplicationId.value = initialApplication?.id ?? 0
  const initialResource = findResourceByCode(
    initialApplication ? [initialApplication] : [],
    props.initialResourceCode,
  )
  selectedResourceId.value = initialResource?.id ?? initialApplication?.modules[0]?.id ?? 0
  selectedKind.value = initialResource ? 'resource' : 'application'
}

function synchronizeSelection() {
  const currentApplication = props.applications.find(
    (application) => application.id === selectedApplicationId.value,
  )
  if (!currentApplication) {
    initializeSelection()
    return
  }

  if (selectedKind.value === 'resource') {
    const currentResource = flattenResources(currentApplication.modules).find(
      (resource) => resource.id === selectedResourceId.value,
    )
    if (!currentResource) {
      selectedResourceId.value = currentApplication.modules[0]?.id ?? 0
      selectedKind.value = selectedResourceId.value ? 'resource' : 'application'
    }
  }
}

function selectApplication(application: ApplicationRecord) {
  selectedApplicationId.value = application.id
  selectedResourceId.value = application.modules[0]?.id ?? 0
  selectedKind.value = 'application'
}

function selectResource(resource: PermissionResourceRecord) {
  selectedResourceId.value = resource.id
  selectedKind.value = 'resource'
}

function applyFilters() {
  appliedFilters.value = { ...draftFilters }
  emit(
    'action',
    activeFilterCount.value ? `已应用 ${activeFilterCount.value} 个筛选条件` : '已显示完整目录',
  )
}

function resetFilters() {
  Object.assign(draftFilters, emptyFilters())
  appliedFilters.value = emptyFilters()
  emit('action', '已清空筛选并恢复完整目录')
}

function openApplicationForm(mode: 'create' | 'edit') {
  applicationFormMode.value = mode
  applicationFormVisible.value = true
}

function openResourceForm(mode: 'create' | 'edit', parent?: PermissionResourceRecord) {
  resourceFormMode.value = mode
  resourceParent.value = parent
  resourceFormVisible.value = true
}

function openAction(mode: 'status' | 'delete') {
  actionDialogMode.value = mode
  actionError.value = ''
  actionDialogVisible.value = true
}

async function saveApplication(value: ApplicationFormValue) {
  await props.submitApplication?.(
    value,
    applicationFormMode.value,
    applicationFormMode.value === 'edit' ? selectedApplication.value : undefined,
  )
}

async function saveResource(value: ResourceFormValue) {
  await props.submitResource?.(
    value,
    resourceFormMode.value,
    resourceFormMode.value === 'edit' ? selectedResource.value : undefined,
  )
}

async function confirmAction() {
  const target = selectedTarget.value
  if (!target || actionSubmitting.value) return
  actionSubmitting.value = true
  try {
    if (actionDialogMode.value === 'status') {
      const targetStatus = target.status === 'active' ? 'disabled' : 'active'
      await props.submitStatus?.(target, targetStatus)
      emit('action', `${target.name} ${targetStatus === 'active' ? '启用' : '停用'}候选已提交`)
    } else {
      await props.submitDelete?.(target, selectedImpact.value)
      emit('action', `${target.name} 软删除候选已提交`)
    }
    actionDialogVisible.value = false
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '操作失败，请重试'
  } finally {
    actionSubmitting.value = false
  }
}

function resourceTypeLabel(type: PermissionResourceType) {
  return { module: 'Module', menu: 'Menu', page: 'Page', function: 'Function' }[type]
}

function childResourceLabel(resource: PermissionResourceRecord) {
  if (resource.resourceType === 'module') return 'Menu'
  if (resource.resourceType === 'menu' || resource.resourceType === 'page') {
    return 'Page / Function'
  }
  return ''
}

function statusLabel(status: 'active' | 'disabled') {
  return status === 'active' ? '启用' : '停用'
}

function nodeIcon(resource: PermissionResourceRecord) {
  const fallback =
    resource.resourceType === 'module'
      ? 'mdi:layers-triple-outline'
      : resource.resourceType === 'menu'
        ? 'mdi:clipboard-text-outline'
        : resource.resourceType === 'page'
          ? 'mdi:file-document-outline'
          : 'mdi:wrench-outline'
  return resolveLocalMdiIcon(resource.icon, fallback)
}

watch(
  () => props.applications,
  () => synchronizeSelection(),
  { immediate: true },
)

watch(
  visibleApplications,
  (applications) => {
    if (!applications.length) return
    if (!applications.some((application) => application.id === selectedApplicationId.value)) {
      selectApplication(applications[0]!)
      return
    }
    if (
      selectedKind.value === 'resource' &&
      !flattenResources(currentResources.value).some(
        (resource) => resource.id === selectedResourceId.value,
      )
    ) {
      selectedResourceId.value = currentResources.value[0]?.id ?? 0
      selectedKind.value = selectedResourceId.value ? 'resource' : 'application'
    }
  },
  { deep: true },
)
</script>

<template>
  <AppPage class="application-resources-page">
    <PageHeader
      title="应用与权限资源"
      description="集团超级管理员维护 App、Module、Menu、Page、Function 权限资源树"
    >
      <template #actions>
        <el-button
          v-permission="IAM_PERMISSIONS.applicationResources.view"
          :loading="state === 'loading'"
          :disabled="state === 'unauthorized'"
          @click="emit('retry')"
        >
          <Icon icon="mdi:refresh" width="18" aria-hidden="true" />刷新完整目录
        </el-button>
      </template>
    </PageHeader>

    <el-result
      v-if="state === 'unauthorized'"
      class="application-resources-page__result surface"
      icon="warning"
      title="无权访问应用与权限资源"
      sub-title="该管理视图仅向集团超级管理员开放，未加载任何目录数据。"
    />

    <template v-else>
      <SearchPanel :loading="state === 'loading'" @search="applyFilters" @reset="resetFilters">
        <el-input
          v-model="draftFilters.keyword"
          clearable
          aria-label="关键字"
          placeholder="App、资源名称 / 编码 / API Path"
          @keyup.enter="handleFilterEnter"
        >
          <template #prefix><Icon icon="mdi:magnify" width="18" aria-hidden="true" /></template>
        </el-input>
        <el-select
          v-model="draftFilters.appStatus"
          clearable
          aria-label="App 状态"
          placeholder="App 状态"
        >
          <el-option label="启用" value="active" />
          <el-option label="停用" value="disabled" />
        </el-select>
        <el-select
          v-model="draftFilters.resourceStatus"
          clearable
          aria-label="资源状态"
          placeholder="资源状态"
        >
          <el-option label="启用" value="active" />
          <el-option label="停用" value="disabled" />
        </el-select>
        <el-select
          v-model="draftFilters.resourceType"
          clearable
          aria-label="资源类型"
          placeholder="资源类型"
        >
          <el-option label="Module" value="module" />
          <el-option label="Menu" value="menu" />
          <el-option label="Page" value="page" />
          <el-option label="Function" value="function" />
        </el-select>
        <template #footer-leading>
          <el-button
            v-permission="IAM_PERMISSIONS.applicationResources.create"
            type="primary"
            :disabled="!canMaintainPage"
            @click="openApplicationForm('create')"
          >
            <Icon icon="mdi:plus" width="18" aria-hidden="true" />新增 App
          </el-button>
        </template>
      </SearchPanel>

      <el-alert
        v-if="catalogWarning"
        :title="catalogWarning"
        type="warning"
        :closable="false"
        show-icon
      />

      <div v-if="activeFilterCount" class="application-resources-page__filter-summary">
        <span>已应用 {{ activeFilterCount }} 个筛选条件</span>
        <el-button link type="primary" @click="resetFilters">清空筛选</el-button>
      </div>

      <WorkspacePageTemplate
        aside-width="252px"
        scroll-mode="capped-page"
        :page-height-limit="2"
        class="application-resources-workspace"
      >
        <template #aside>
          <section class="application-list" aria-labelledby="application-list-title">
            <header>
              <div>
                <h2 id="application-list-title">App</h2>
                <span>{{ visibleApplications.length }} 个结果</span>
              </div>
            </header>

            <div v-if="state === 'loading'" class="application-list__state">
              <el-skeleton :rows="6" animated />
            </div>
            <el-result
              v-else-if="state === 'retryable-error'"
              icon="error"
              title="目录加载失败"
              sub-title="筛选条件已保留"
            >
              <template #extra
                ><el-button type="primary" @click="emit('retry')">重新加载</el-button></template
              >
            </el-result>
            <el-empty v-else-if="state === 'empty'" description="暂无 App">
              <el-button
                v-permission="IAM_PERMISSIONS.applicationResources.create"
                type="primary"
                @click="openApplicationForm('create')"
                >新增 App</el-button
              >
            </el-empty>
            <el-empty v-else-if="!hasFilterResult" description="无匹配结果">
              <el-button @click="resetFilters">清空筛选</el-button>
            </el-empty>
            <div v-else class="application-list__items">
              <button
                v-for="application in visibleApplications"
                :key="application.id"
                type="button"
                class="application-list__item"
                :class="{
                  'application-list__item--active': selectedApplicationId === application.id,
                }"
                :aria-pressed="selectedApplicationId === application.id"
                @click="selectApplication(application)"
              >
                <span class="application-list__icon">
                  <Icon
                    :icon="resolveLocalMdiIcon(application.icon, 'mdi:cube-outline')"
                    width="20"
                    aria-hidden="true"
                  />
                </span>
                <span class="application-list__copy">
                  <strong>{{ application.appName }}</strong>
                  <small
                    >{{ application.appCode }} ·
                    {{ flattenResources(application.modules).length }} 个资源</small
                  >
                </span>
                <StatusTag
                  :label="statusLabel(application.status)"
                  :tone="application.status === 'active' ? 'success' : 'info'"
                />
              </button>
            </div>
          </section>
        </template>

        <div class="resource-workspace">
          <section class="resource-tree-panel" aria-labelledby="resource-tree-title">
            <header>
              <div>
                <h2 id="resource-tree-title">资源树</h2>
                <span
                  >{{ selectedApplication?.appCode ?? '—' }} · Module → Menu → Page / Function</span
                >
              </div>
              <el-button
                v-if="selectedApplication"
                v-permission="IAM_PERMISSIONS.applicationResources.create"
                size="small"
                :disabled="!selectedApplication.canMaintain || state !== 'ready'"
                @click="openResourceForm('create')"
              >
                <Icon icon="mdi:plus" width="16" aria-hidden="true" />新增 Module
              </el-button>
            </header>

            <el-alert
              v-if="selectedApplication?.status === 'disabled'"
              title="App 已停用：下级资源保留直接状态，但当前均不生效。"
              type="warning"
              :closable="false"
              show-icon
            />

            <el-tree
              v-if="state === 'ready' && currentResources.length"
              class="resource-tree"
              :data="currentResources"
              :props="{ children: 'children', label: 'resourceName' }"
              node-key="id"
              default-expand-all
              highlight-current
              :expand-on-click-node="false"
              :current-node-key="selectedKind === 'resource' ? selectedResourceId : undefined"
              @node-click="selectResource"
            >
              <template #default="{ data }">
                <div class="resource-tree__node">
                  <Icon :icon="nodeIcon(data)" width="17" aria-hidden="true" />
                  <span>{{ data.resourceName }}</span>
                  <small>{{ resourceTypeLabel(data.resourceType) }}</small>
                  <i
                    class="resource-tree__state"
                    :class="data.isCurrentlyEffective ? 'is-effective' : 'is-invalid'"
                    :title="
                      data.isCurrentlyEffective ? '当前有效' : data.invalidReason || '当前无效'
                    "
                  />
                </div>
              </template>
            </el-tree>
            <el-skeleton v-else-if="state === 'loading'" :rows="8" animated />
            <el-empty v-else description="当前 App 暂无匹配资源" />
          </section>

          <section class="resource-inspector" aria-labelledby="resource-inspector-title">
            <div class="resource-inspector__sticky">
              <template v-if="selectedKind === 'application' && selectedApplication">
                <header>
                  <div>
                    <p>App</p>
                    <h2 id="resource-inspector-title">{{ selectedApplication.appName }}</h2>
                    <code>{{ selectedApplication.appCode }}</code>
                  </div>
                  <div class="resource-inspector__actions">
                    <el-button
                      v-permission="IAM_PERMISSIONS.applicationResources.create"
                      size="small"
                      :disabled="!selectedApplication.canMaintain"
                      @click="openResourceForm('create')"
                      >新增 Module</el-button
                    >
                    <el-button
                      v-permission="IAM_PERMISSIONS.applicationResources.update"
                      size="small"
                      :disabled="!selectedApplication.canMaintain"
                      @click="openApplicationForm('edit')"
                      >编辑 App</el-button
                    >
                    <el-button
                      v-permission="IAM_PERMISSIONS.applicationResources.changeStatus"
                      size="small"
                      plain
                      :type="selectedApplication.status === 'active' ? 'warning' : 'success'"
                      :disabled="!selectedApplication.canMaintain"
                      @click="openAction('status')"
                      >{{ selectedApplication.status === 'active' ? '停用' : '启用' }}</el-button
                    >
                    <el-button
                      v-permission="IAM_PERMISSIONS.applicationResources.delete"
                      size="small"
                      type="danger"
                      plain
                      :disabled="!selectedApplication.canMaintain"
                      @click="openAction('delete')"
                      >删除 App</el-button
                    >
                  </div>
                </header>
                <div class="resource-inspector__tags">
                  <StatusTag
                    :label="statusLabel(selectedApplication.status)"
                    :tone="selectedApplication.status === 'active' ? 'success' : 'info'"
                  />
                  <StatusTag
                    :label="selectedApplication.canMaintain ? '可维护' : '只读'"
                    :tone="selectedApplication.canMaintain ? 'primary' : 'info'"
                  />
                </div>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="ID">{{
                    selectedApplication.id
                  }}</el-descriptions-item>
                  <el-descriptions-item label="路由前缀">{{
                    selectedApplication.routePrefix || '—'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="图标">{{
                    selectedApplication.icon || '—'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="版本">{{
                    selectedApplication.version
                  }}</el-descriptions-item>
                  <el-descriptions-item label="说明" :span="2">{{
                    selectedApplication.description || '—'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="备注" :span="2">{{
                    selectedApplication.remarks || '—'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="创建信息">
                    {{ selectedApplication.createdBy || '—' }} ·
                    <DateTimeText :value="selectedApplication.createdAt" />
                  </el-descriptions-item>
                  <el-descriptions-item label="更新信息">
                    {{ selectedApplication.updatedBy || '—' }} ·
                    <DateTimeText :value="selectedApplication.updatedAt" />
                  </el-descriptions-item>
                </el-descriptions>
              </template>

              <template v-else-if="selectedResource">
                <header>
                  <div>
                    <p>{{ resourceTypeLabel(selectedResource.resourceType) }}</p>
                    <h2 id="resource-inspector-title">{{ selectedResource.resourceName }}</h2>
                    <code>{{ selectedResource.resourceCode }}</code>
                  </div>
                  <div class="resource-inspector__actions">
                    <el-button
                      v-if="selectedResource.resourceType !== 'function'"
                      v-permission="IAM_PERMISSIONS.applicationResources.create"
                      size="small"
                      :disabled="!selectedResource.canMaintain"
                      @click="openResourceForm('create', selectedResource)"
                      >新增 {{ childResourceLabel(selectedResource) }}</el-button
                    >
                    <el-button
                      v-permission="IAM_PERMISSIONS.applicationResources.update"
                      size="small"
                      :disabled="!selectedResource.canMaintain"
                      @click="openResourceForm('edit')"
                      >编辑</el-button
                    >
                    <el-button
                      v-permission="IAM_PERMISSIONS.applicationResources.changeStatus"
                      size="small"
                      plain
                      :type="selectedResource.status === 'active' ? 'warning' : 'success'"
                      :disabled="!selectedResource.canMaintain"
                      @click="openAction('status')"
                      >{{ selectedResource.status === 'active' ? '停用' : '启用' }}</el-button
                    >
                    <el-button
                      v-permission="IAM_PERMISSIONS.applicationResources.delete"
                      size="small"
                      type="danger"
                      plain
                      :disabled="!selectedResource.canMaintain || selectedImpact.isLastModule"
                      @click="openAction('delete')"
                      >删除</el-button
                    >
                  </div>
                </header>
                <div class="resource-inspector__tags">
                  <StatusTag
                    :label="resourceTypeLabel(selectedResource.resourceType)"
                    tone="info"
                  />
                  <StatusTag
                    :label="`直接${statusLabel(selectedResource.status)}`"
                    :tone="selectedResource.status === 'active' ? 'success' : 'info'"
                  />
                  <StatusTag
                    :label="selectedResource.isCurrentlyEffective ? '当前有效' : '当前无效'"
                    :tone="selectedResource.isCurrentlyEffective ? 'success' : 'warning'"
                  />
                </div>
                <el-alert
                  v-if="selectedResource.invalidReason"
                  :title="selectedResource.invalidReason"
                  :type="selectedResource.isCurrentlyEffective ? 'info' : 'warning'"
                  :closable="false"
                  show-icon
                />
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="ID">{{ selectedResource.id }}</el-descriptions-item>
                  <el-descriptions-item label="所属 App">{{
                    selectedApplication?.appCode
                  }}</el-descriptions-item>
                  <el-descriptions-item label="父节点 ID">{{
                    selectedResource.parentId || 'App 根节点'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="展示排序">{{
                    selectedResource.sortOrder
                  }}</el-descriptions-item>
                  <el-descriptions-item label="路由地址">{{
                    selectedResource.routePath || '—'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="页面组件">{{
                    selectedResource.component || '—'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="权限编码">{{
                    selectedResource.permissionCode || '—'
                  }}</el-descriptions-item>
                  <el-descriptions-item
                    v-if="selectedResource.resourceType === 'menu'"
                    label="导航显示"
                    >{{ selectedResource.isVisible ? '显示' : '隐藏' }}</el-descriptions-item
                  >
                  <el-descriptions-item label="请求方式">{{
                    selectedResource.httpMethod || '—'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="接口路径">{{
                    selectedResource.apiPath || '—'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="可维护">{{
                    selectedResource.canMaintain ? '是' : '否'
                  }}</el-descriptions-item>
                  <el-descriptions-item label="版本">{{
                    selectedResource.version
                  }}</el-descriptions-item>
                  <el-descriptions-item label="创建信息">
                    {{ selectedResource.createdBy || '—' }} ·
                    <DateTimeText :value="selectedResource.createdAt" />
                  </el-descriptions-item>
                  <el-descriptions-item label="更新信息">
                    {{ selectedResource.updatedBy || '—' }} ·
                    <DateTimeText :value="selectedResource.updatedAt" />
                  </el-descriptions-item>
                  <el-descriptions-item label="备注" :span="2">{{
                    selectedResource.remarks || '—'
                  }}</el-descriptions-item>
                </el-descriptions>
              </template>

              <el-empty v-else description="选择 App 或资源节点查看完整定义" />
            </div>
          </section>
        </div>
      </WorkspacePageTemplate>
    </template>

    <ApplicationFormDrawer
      v-model="applicationFormVisible"
      :mode="applicationFormMode"
      :application="selectedApplication"
      :submit="saveApplication"
      @action="emit('action', $event)"
    />
    <ResourceFormDrawer
      v-model="resourceFormVisible"
      :mode="resourceFormMode"
      :applications="applications"
      :application-id="selectedApplication?.id ?? 0"
      :parent-resource="resourceParent"
      :resource="resourceFormMode === 'edit' ? selectedResource : undefined"
      :submit="saveResource"
      @action="emit('action', $event)"
    />
    <CatalogImpactDialog
      v-model="actionDialogVisible"
      :mode="actionDialogMode"
      :target="selectedTarget"
      :impact="selectedImpact"
      :authoritative-impact-ready="authoritativeDeleteImpactReady"
      :allow-structural-delete="allowStructuralDelete"
      :error-message="actionError"
      :submitting="actionSubmitting"
      @confirm="confirmAction"
    />
  </AppPage>
</template>

<style scoped lang="scss">
.application-resources-page__result {
  display: grid;
  flex: 1;
  place-items: center;
}

.application-resources-page__filter-summary {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-2);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.application-resources-workspace {
  min-height: 0;
}

.application-list,
.resource-tree-panel,
.resource-inspector {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.application-list {
  gap: var(--spacing-3);
  position: sticky;
  top: 0;
  align-self: start;
  padding: var(--spacing-4);
}

.application-list > header,
.resource-tree-panel > header,
.resource-inspector__sticky > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-3);
}

.application-list h2,
.resource-tree-panel h2,
.resource-inspector h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.application-list header span,
.resource-tree-panel header span,
.resource-inspector header p,
.resource-inspector header code {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.application-list header span,
.resource-tree-panel header span {
  display: block;
  margin-top: var(--spacing-1);
}

.application-list__items {
  display: grid;
  flex: 1;
  align-content: start;
  gap: var(--spacing-2);
  min-height: 0;
  overflow: auto;
}

.application-list__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--spacing-3);
  width: 100%;
  padding: var(--spacing-3);
  color: var(--text-regular);
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-default);
  cursor: pointer;
}

.application-list__item :deep(.el-tag) {
  grid-column: 2;
  justify-self: start;
}

.application-list__item:hover {
  background: var(--background-muted);
  border-color: var(--border-light);
}

.application-list__item:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 1px;
}

.application-list__item--active {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
}

.application-list__icon {
  display: grid;
  grid-row: 1 / span 2;
  width: var(--spacing-10);
  height: var(--spacing-10);
  color: var(--color-primary);
  background: var(--background-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-default);
  place-items: center;
}

.application-list__copy,
.application-list__copy strong,
.application-list__copy small {
  display: block;
  min-width: 0;
}

.application-list__copy strong {
  overflow: hidden;
  color: var(--text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.application-list__copy small {
  margin-top: var(--spacing-1);
  overflow: hidden;
  color: var(--text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.application-list__state {
  padding-top: var(--spacing-4);
}

.resource-workspace {
  display: grid;
  grid-template-columns: minmax(300px, 0.8fr) minmax(0, 1.2fr);
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.resource-tree-panel {
  gap: var(--spacing-3);
  padding: var(--spacing-4);
  border-right: 1px solid var(--border-default);
}

.resource-tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.resource-tree__node {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  min-width: 0;
}

.resource-tree__node > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-tree__node > small {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.resource-tree__state {
  flex: none;
  width: var(--spacing-2);
  height: var(--spacing-2);
  border-radius: 50%;
}

.resource-tree__state.is-effective {
  background: var(--color-success);
}

.resource-tree__state.is-invalid {
  background: var(--color-warning);
}

.resource-inspector {
  overflow: visible;
}

.resource-inspector__sticky {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  position: sticky;
  top: 0;
  align-self: start;
  width: 100%;
  min-width: 0;
  padding: var(--spacing-5);
}

.resource-inspector header p,
.resource-inspector header code {
  display: block;
  margin: 0 0 var(--spacing-1);
  font-family: var(--font-family);
}

.resource-inspector header code {
  margin: var(--spacing-1) 0 0;
  color: var(--color-primary);
  overflow-wrap: anywhere;
}

.resource-inspector__actions,
.resource-inspector__tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.resource-inspector__actions {
  justify-content: flex-end;
}

.resource-inspector :deep(.el-descriptions__table) {
  table-layout: fixed;
}

.resource-inspector :deep(.el-descriptions__content) {
  overflow-wrap: anywhere;
  white-space: normal;
}

@media (max-width: 1500px) {
  .resource-workspace {
    grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.2fr);
  }

  .resource-inspector__sticky {
    padding: var(--spacing-4);
  }
}
</style>
