<script setup lang="ts">
import type { EntityId } from '@shared/types/entityId'
import { resourceElementAttributes } from '@shared/services/resourceElement'
import { configurationElements } from '../iam-resource.registry'
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import WorkspacePageTemplate from '@shared/components/page-templates/WorkspacePageTemplate.vue'
import type {
  PermissionGovernanceApp,
  PermissionGovernancePreviewState,
  PermissionRecord,
  SystemResourceRecord,
} from '../types/permissionGovernance'

const props = defineProps<{
  apps: PermissionGovernanceApp[]
  resources: SystemResourceRecord[]
  permission: PermissionRecord
  state: PermissionGovernancePreviewState
  back?: () => void
  saveComposition?: (
    record: PermissionRecord,
    frontendResourceId: EntityId,
    functionResourceIds: EntityId[],
  ) => Promise<void>
}>()

const emit = defineEmits<{ action: [message: string]; retry: []; 'retry-save': [] }>()

const parentKeyword = ref('')
const functionKeyword = ref('')
const baselineParentId = ref<EntityId | ''>(
  props.state === 'empty-parent' ? '' : props.permission.frontendResourceId,
)
const baselineFunctionIds = ref(
  props.state === 'empty-parent' ? [] : [...props.permission.functionResourceIds],
)
const selectedParentId = ref<EntityId | ''>(baselineParentId.value)
const selectedFunctionIds = ref([...baselineFunctionIds.value])
const confirmVisible = ref(false)
const submitting = ref(false)

function matchesKeyword(resource: SystemResourceRecord, keyword: string) {
  const search = keyword.trim().toLocaleLowerCase('zh-CN')
  if (!search) return true
  return [resource.resourceName, resource.resourceCode, resource.routePath, resource.apiPath].some(
    (value) => value.toLocaleLowerCase('zh-CN').includes(search),
  )
}

const app = computed(() => props.apps.find((candidate) => candidate.id === props.permission.appId))
const frontendResources = computed(() =>
  props.resources
    .filter(
      (resource) =>
        resource.appId === props.permission.appId &&
        ['MENU', 'BUTTON', 'BUTTON_PAGE'].includes(resource.resourceType) &&
        (resource.status === 'ACTIVE' || resource.resourceId === selectedParentId.value),
    )
    .filter((resource) => matchesKeyword(resource, parentKeyword.value)),
)
const functionResources = computed(() =>
  props.resources
    .filter(
      (resource) =>
        resource.appId === props.permission.appId &&
        resource.resourceType === 'FUNCTION' &&
        (resource.status === 'ACTIVE' || selectedFunctionIds.value.includes(resource.resourceId)),
    )
    .filter((resource) => matchesKeyword(resource, functionKeyword.value)),
)
const selectedParent = computed(() =>
  props.resources.find((resource) => resource.resourceId === selectedParentId.value),
)
const selectedFunctions = computed(() =>
  props.resources.filter((resource) => selectedFunctionIds.value.includes(resource.resourceId)),
)
const baselineFunctionSet = computed(() => new Set(baselineFunctionIds.value))
const selectedFunctionSet = computed(() => new Set(selectedFunctionIds.value))
const addedFunctions = computed(() =>
  selectedFunctions.value.filter((resource) => !baselineFunctionSet.value.has(resource.resourceId)),
)
const removedFunctions = computed(() =>
  props.resources.filter(
    (resource) =>
      baselineFunctionSet.value.has(resource.resourceId) &&
      !selectedFunctionSet.value.has(resource.resourceId),
  ),
)
const baselineParent = computed(() =>
  props.resources.find((resource) => resource.resourceId === baselineParentId.value),
)
const dirty = computed(
  () =>
    selectedParentId.value !== baselineParentId.value ||
    selectedFunctionIds.value.some((id) => !baselineFunctionSet.value.has(id)) ||
    baselineFunctionIds.value.some((id) => !selectedFunctionSet.value.has(id)),
)
const valid = computed(
  () => Boolean(selectedParentId.value) && selectedFunctionIds.value.length > 0,
)

function restoreChanges() {
  selectedParentId.value = baselineParentId.value
  selectedFunctionIds.value = [...baselineFunctionIds.value]
  emit('action', '已恢复为权限最近一次资源组合')
}

function requestSave() {
  if (
    !dirty.value ||
    !valid.value ||
    submitting.value ||
    props.state === 'version-conflict' ||
    props.state === 'unknown-result'
  )
    return
  confirmVisible.value = true
}

async function confirmSave() {
  if (
    !valid.value ||
    submitting.value ||
    props.state === 'version-conflict' ||
    props.state === 'unknown-result' ||
    selectedParentId.value === ''
  )
    return

  if (props.saveComposition) {
    submitting.value = true
    try {
      await props.saveComposition(props.permission, selectedParentId.value, [
        ...selectedFunctionIds.value,
      ])
    } catch {
      confirmVisible.value = false
      return
    } finally {
      submitting.value = false
    }
  }

  baselineParentId.value = selectedParentId.value
  baselineFunctionIds.value = [...selectedFunctionIds.value]
  confirmVisible.value = false
  emit(
    'action',
    `“${props.permission.permissionName}”权限配置已保存：1 个前端资源，${selectedFunctionIds.value.length} 个后端 Function`,
  )
}

function resourceTypeLabel(type: SystemResourceRecord['resourceType']) {
  return (
    {
      MODULE: 'Module',
      MENU: 'Menu',
      BUTTON: 'Button',
      BUTTON_PAGE: 'ButtonPage',
      FUNCTION: 'Function',
    } as const
  )[type]
}

watch([() => props.permission, () => props.state], ([permission, state]) => {
  const emptyParent = state === 'empty-parent'
  baselineParentId.value = emptyParent ? '' : permission.frontendResourceId
  baselineFunctionIds.value = emptyParent ? [] : [...permission.functionResourceIds]
  selectedParentId.value = baselineParentId.value
  selectedFunctionIds.value = [...baselineFunctionIds.value]
  confirmVisible.value = false
})
</script>

<template>
  <AppPage
    :resource_element="configurationElements.page"
    :scrollable="false"
    class="permission-function-page"
  >
    <PageHeader
      title="权限功能配置"
      description="将一个前端资源与同一 App 下的后端 Function 组合为权限"
    >
      <template #actions>
        <el-button v-if="back" v-resource-element="configurationElements.local" @click="back">
          <Icon icon="mdi:chevron-left" width="16" aria-hidden="true" />返回权限管理
        </el-button>
        <el-button
          v-resource-element="configurationElements.local"
          :disabled="!dirty || submitting"
          @click="restoreChanges"
          >放弃更改</el-button
        >
        <el-button
          v-if="permission.canMaintain"
          v-resource-element="configurationElements.save"
          type="primary"
          :disabled="
            !dirty ||
            !valid ||
            submitting ||
            state === 'version-conflict' ||
            state === 'unknown-result'
          "
          :loading="submitting"
          @click="requestSave"
        >
          保存权限配置
        </el-button>
      </template>
    </PageHeader>

    <section class="permission-function-context" aria-label="当前权限">
      <div>
        <span><Icon icon="mdi:shield-key-outline" width="20" aria-hidden="true" /></span>
        <div>
          <strong>{{ permission.permissionName }}</strong>
          <small>{{ permission.permissionCode }}</small>
        </div>
      </div>
      <div class="permission-function-context__app">
        <small>所属 App</small>
        <strong>{{ app?.appName || permission.appName }}</strong>
      </div>
      <div class="permission-function-context__metrics">
        <span
          ><strong>{{ selectedParent ? 1 : 0 }}</strong
          ><small>前端资源</small></span
        >
        <span
          ><strong>{{ selectedFunctionIds.length }}</strong
          ><small>后端 Function</small></span
        >
      </div>
      <div>
        <StatusTag
          :label="permission.status === 'ACTIVE' ? '启用' : '停用'"
          :tone="permission.status === 'ACTIVE' ? 'success' : 'info'"
        />
        <StatusTag v-if="dirty" label="有未保存更改" tone="warning" />
      </div>
    </section>

    <el-alert
      v-if="state === 'version-conflict'"
      title="权限版本已变化，本地选择已保留。请重新加载最新结果后核对再保存。"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #default>
        <el-button
          v-resource-element="configurationElements.query"
          link
          type="primary"
          @click="emit('retry')"
          >重新加载并核对</el-button
        >
      </template>
    </el-alert>

    <el-alert
      v-else-if="state === 'unknown-result'"
      title="保存结果尚未确认。本地选择已保留，请勿再次点击保存。"
      type="warning"
      :closable="false"
      show-icon
    >
      <template #default>
        <div class="permission-function-recovery">
          <span>可先回读服务端结果，或使用原 request_id 显式重试同一请求。</span>
          <el-button
            v-resource-element="configurationElements.query"
            link
            type="primary"
            @click="emit('retry')"
            >刷新确认结果</el-button
          >
          <el-button
            v-resource-element="configurationElements.save"
            link
            type="primary"
            @click="emit('retry-save')"
            >使用原请求标识重试</el-button
          >
        </div>
      </template>
    </el-alert>

    <el-alert
      v-else-if="state === 'empty-parent'"
      title="该权限尚未配置前端资源，请先选择一个 Menu、Button 或 ButtonPage。"
      type="info"
      :closable="false"
      show-icon
    />

    <section v-if="state === 'loading'" class="permission-function-state">
      <el-icon class="is-loading"><Icon icon="mdi:loading" /></el-icon>正在加载权限资源
    </section>
    <el-result
      v-else-if="state === 'retryable-error'"
      icon="error"
      title="权限资源加载失败"
      sub-title="请重新加载后再配置"
    >
      <template #extra
        ><el-button
          v-resource-element="configurationElements.query"
          type="primary"
          @click="emit('retry')"
          >重新加载</el-button
        ></template
      >
    </el-result>
    <el-empty v-else-if="state === 'empty'" description="当前 App 暂无可配置资源" />

    <WorkspacePageTemplate
      v-else
      class="permission-function-workspace"
      aside-width="clamp(240px, 24vw, 340px)"
      scroll-mode="contained"
      aria-label="权限功能配置工作区"
    >
      <template #aside>
        <article class="permission-function-panel permission-function-panel--parent">
          <header>
            <div>
              <strong>1. 选择前端资源</strong><small>必选一个 Menu、Button 或 ButtonPage</small>
            </div>
            <StatusTag label="父节点" tone="primary" />
          </header>
          <el-input v-model="parentKeyword" clearable placeholder="搜索前端资源名称或路由">
            <template #prefix><Icon icon="mdi:magnify" width="16" aria-hidden="true" /></template>
          </el-input>
          <div class="permission-function-options">
            <el-radio-group v-model="selectedParentId" :disabled="!permission.canMaintain">
              <el-radio
                v-for="resource in frontendResources"
                :key="resource.resourceId"
                :value="resource.resourceId"
                :disabled="resource.status !== 'ACTIVE'"
                border
              >
                <span>
                  <strong>{{ resource.resourceName }}</strong>
                  <small
                    >{{ resourceTypeLabel(resource.resourceType) }} ·
                    {{ resource.routePath || '无路由' }}</small
                  >
                </span>
              </el-radio>
            </el-radio-group>
            <el-empty
              v-if="!frontendResources.length"
              description="未找到前端资源"
              :image-size="64"
            />
          </div>
        </article>
      </template>

      <div class="permission-function-workspace__main">
        <article class="permission-function-panel">
          <header>
            <div>
              <strong>2. 选择后端 Function</strong><small>至少选择一个查询或业务操作接口</small>
            </div>
            <StatusTag label="子节点" tone="info" />
          </header>
          <el-input v-model="functionKeyword" clearable placeholder="搜索 Function 名称或 API Path">
            <template #prefix><Icon icon="mdi:magnify" width="16" aria-hidden="true" /></template>
          </el-input>
          <div class="permission-function-options">
            <el-checkbox-group v-model="selectedFunctionIds" :disabled="!permission.canMaintain">
              <el-checkbox
                v-for="resource in functionResources"
                :key="resource.resourceId"
                :value="resource.resourceId"
                :disabled="
                  resource.status !== 'ACTIVE' && !selectedFunctionIds.includes(resource.resourceId)
                "
                border
              >
                <span>
                  <strong>{{ resource.resourceName }}</strong>
                  <small>{{ resource.httpMethod }} {{ resource.apiPath }}</small>
                </span>
              </el-checkbox>
            </el-checkbox-group>
            <el-empty
              v-if="!functionResources.length"
              description="未找到后端 Function"
              :image-size="64"
            />
          </div>
        </article>

        <article class="permission-function-preview">
          <header>
            <div><strong>组合预览</strong><small>保存后形成一条 iam_permission</small></div>
            <StatusTag
              :label="valid ? '结构完整' : '待补充'"
              :tone="valid ? 'success' : 'warning'"
            />
          </header>

          <div v-if="selectedParent" class="permission-function-preview__tree">
            <div class="permission-function-preview__parent">
              <Icon icon="mdi:gesture-tap-button" width="18" aria-hidden="true" />
              <span>
                <strong>{{ selectedParent.resourceName }}</strong>
                <small>{{ resourceTypeLabel(selectedParent.resourceType) }} · 前端资源</small>
              </span>
            </div>
            <ul v-if="selectedFunctions.length">
              <li v-for="resource in selectedFunctions" :key="resource.resourceId">
                <Icon icon="mdi:api" width="16" aria-hidden="true" />
                <span>
                  <strong>{{ resource.resourceName }}</strong>
                  <small>{{ resource.httpMethod }} {{ resource.apiPath }}</small>
                </span>
              </li>
            </ul>
            <el-empty v-else description="请选择至少一个后端 Function" :image-size="64" />
          </div>
          <el-empty v-else description="请先选择前端资源" :image-size="72" />

          <footer>
            <Icon icon="mdi:information-outline" width="16" aria-hidden="true" />
            前端接口注册表只用于辅助选择，不替代 iam_resource，也不会在此页反向修改资源目录。
          </footer>
        </article>
      </div>
    </WorkspacePageTemplate>

    <el-dialog
      v-model="confirmVisible"
      v-bind="resourceElementAttributes(configurationElements.save)"
      title="确认保存权限功能配置"
      width="560"
      append-to-body
    >
      <dl class="permission-function-confirm">
        <div>
          <dt>前端父资源</dt>
          <dd>
            {{ baselineParent?.resourceName || '未配置' }}
            <Icon icon="mdi:arrow-right" width="15" aria-hidden="true" />
            {{ selectedParent?.resourceName || '未配置' }}
          </dd>
        </div>
        <div>
          <dt>Function 变更</dt>
          <dd>新增 {{ addedFunctions.length }} 个，移除 {{ removedFunctions.length }} 个</dd>
        </div>
        <div>
          <dt>当前版本</dt>
          <dd>{{ permission.version }}</dd>
        </div>
      </dl>
      <div
        v-if="addedFunctions.length || removedFunctions.length"
        class="permission-function-confirm__changes"
      >
        <p v-if="addedFunctions.length">
          <strong>新增：</strong>{{ addedFunctions.map((item) => item.resourceName).join('、') }}
        </p>
        <p v-if="removedFunctions.length">
          <strong>移除：</strong>{{ removedFunctions.map((item) => item.resourceName).join('、') }}
        </p>
      </div>
      <template #footer>
        <el-button
          v-resource-element="configurationElements.local"
          :disabled="submitting"
          @click="confirmVisible = false"
          >继续检查</el-button
        >
        <el-button
          v-resource-element="configurationElements.save"
          type="primary"
          :loading="submitting"
          @click="confirmSave"
          >确认保存</el-button
        >
      </template>
    </el-dialog>
  </AppPage>
</template>

<style scoped lang="scss">
.permission-function-page {
  min-height: 0;
}

.permission-function-context {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.55fr) auto auto;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2) var(--spacing-3);
  background: var(--background-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
}

.permission-function-context > div,
.permission-function-context__metrics {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.permission-function-context > div:first-child > span {
  display: grid;
  width: var(--spacing-8);
  height: var(--spacing-8);
  place-items: center;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border-radius: var(--radius-small);
}

.permission-function-context > div:first-child > div,
.permission-function-context__app,
.permission-function-context__metrics span {
  display: grid;
  gap: var(--spacing-1);
}

.permission-function-context small,
.permission-function-panel small,
.permission-function-preview small,
.permission-function-preview footer {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.permission-function-context__app,
.permission-function-context__metrics {
  padding-inline: var(--spacing-3);
  border-left: 1px solid var(--border-light);
}

.permission-function-context__metrics span {
  min-width: var(--spacing-12);
  text-align: center;
}

.permission-function-workspace {
  flex: 1;
  min-height: 0;
}

.permission-function-workspace__main {
  display: grid;
  grid-template-columns: minmax(280px, 0.92fr) minmax(320px, 1.08fr);
  height: 100%;
  min-height: 0;
}

.permission-function-panel,
.permission-function-preview {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
  min-width: 0;
  min-height: 0;
  padding: var(--spacing-3);
}

.permission-function-panel {
  border-right: 1px solid var(--border-default);
}

.permission-function-panel--parent {
  height: 100%;
  border-right: 0;
}

.permission-function-panel > header,
.permission-function-preview > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-2);
}

.permission-function-panel > header > div,
.permission-function-preview > header > div {
  display: grid;
  gap: var(--spacing-1);
}

.permission-function-options {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}

.permission-function-options :deep(.el-radio-group),
.permission-function-options :deep(.el-checkbox-group) {
  display: grid;
  gap: var(--spacing-2);
}

.permission-function-options :deep(.el-radio),
.permission-function-options :deep(.el-checkbox) {
  align-items: flex-start;
  width: 100%;
  height: auto;
  min-height: var(--size-table-row);
  padding: var(--spacing-2);
  margin: 0;
  white-space: normal;
}

.permission-function-options :deep(.el-radio__label),
.permission-function-options :deep(.el-checkbox__label) {
  min-width: 0;
  white-space: normal;
}

.permission-function-options :deep(.el-radio__label span),
.permission-function-options :deep(.el-checkbox__label span) {
  display: grid;
  gap: var(--spacing-1);
  min-width: 0;
}

.permission-function-options :deep(.el-radio__label small),
.permission-function-options :deep(.el-checkbox__label small) {
  overflow-wrap: anywhere;
}

.permission-function-preview__tree {
  min-height: 0;
  overflow: auto;
}

.permission-function-preview__parent,
.permission-function-preview li {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  border-radius: var(--radius-small);
}

.permission-function-preview__parent {
  color: var(--color-primary);
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary);
}

.permission-function-preview__parent span,
.permission-function-preview li span {
  display: grid;
  gap: var(--spacing-1);
  min-width: 0;
  color: var(--text-regular);
}

.permission-function-preview ul {
  display: grid;
  gap: var(--spacing-1);
  padding: var(--spacing-2) 0 0 var(--spacing-8);
  margin: 0;
  list-style: none;
  border-left: 1px solid var(--border-default);
}

.permission-function-preview li {
  background: var(--background-muted);
}

.permission-function-preview footer {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-2);
  padding-top: var(--spacing-2);
  margin-top: auto;
  border-top: 1px solid var(--border-light);
}

.permission-function-state {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  color: var(--text-secondary);
}

.permission-function-recovery {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-2);
}

.permission-function-confirm {
  display: grid;
  gap: var(--spacing-2);
  margin: 0;
}

.permission-function-confirm > div {
  display: grid;
  grid-template-columns: 104px minmax(0, 1fr);
  gap: var(--spacing-2);
  padding: var(--spacing-2);
  background: var(--background-muted);
  border-radius: var(--radius-small);
}

.permission-function-confirm dt {
  color: var(--text-secondary);
}

.permission-function-confirm dd {
  display: flex;
  align-items: center;
  gap: var(--spacing-1);
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.permission-function-confirm__changes {
  max-height: 128px;
  padding: var(--spacing-2);
  margin-top: var(--spacing-2);
  overflow: auto;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-small);
}

.permission-function-confirm__changes p {
  margin: 0 0 var(--spacing-1);
  overflow-wrap: anywhere;
}

.permission-function-confirm__changes p:last-child {
  margin-bottom: 0;
}

@media (max-width: 1450px) {
  .permission-function-workspace__main {
    grid-template-columns: minmax(250px, 0.92fr) minmax(280px, 1fr);
  }
}
</style>
