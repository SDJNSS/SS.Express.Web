<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import ListPageTemplate from '@shared/components/page-templates/ListPageTemplate.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import SearchPanel from '@shared/components/SearchPanel.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import TableToolbar from '@shared/components/TableToolbar.vue'
import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'
import RoleContextBar from './RoleContextBar.vue'
import type {
  AccessControlPreviewState,
  DataDomainRecord,
  DataScopeMode,
  InvalidDataPermissionResourceRecord,
  RoleDataPermissionRecord,
  RoleRecord,
  SystemRecord,
  TenantOption,
} from '../types/accessControl'

const props = defineProps<{
  role: RoleRecord
  systems: SystemRecord[]
  domains: DataDomainRecord[]
  invalidResources?: InvalidDataPermissionResourceRecord[]
  permissions: RoleDataPermissionRecord[]
  tenants: TenantOption[]
  state: AccessControlPreviewState
  back?: () => void
  submit?: (
    record: RoleDataPermissionRecord,
    scopeMode: DataScopeMode | undefined,
    targetTenantIds: number[],
    clear: boolean,
  ) => Promise<void>
}>()
const emit = defineEmits<{ action: [message: string]; retry: [] }>()

const activeTab = ref<'role' | 'catalog'>('role')
const query = reactive({ appId: undefined as number | undefined, domainCode: '' })
const committed = reactive({ ...query })
const drawerVisible = ref(false)
const clearVisible = ref(false)
const selected = ref<RoleDataPermissionRecord | undefined>(props.permissions[0])
const scopeMode = ref<DataScopeMode | undefined>(props.permissions[0]?.scopeMode)
const targetTenantIds = ref<number[]>([...(props.permissions[0]?.targetTenantIds ?? [])])
const submitting = ref(false)
const permissionDirty = computed(() => {
  const record = selected.value
  if (!record) return false
  if (scopeMode.value !== record.scopeMode) return true
  const original = [...record.targetTenantIds].sort((left, right) => left - right)
  const current = [...targetTenantIds.value].sort((left, right) => left - right)
  return JSON.stringify(original) !== JSON.stringify(current)
})

const permissionColumns: DataTableColumn[] = [
  { prop: 'domainCode', label: '数据域编码', minWidth: 160, fixed: 'left' },
  { prop: 'domainName', label: '数据域名称', minWidth: 150 },
  { label: '配置状态', width: 150, slot: 'configured' },
  { label: '数据范围', minWidth: 170, slot: 'scope' },
  { label: '指定 Tenant', minWidth: 210, slot: 'targets' },
  { label: '当前有效性', width: 122, slot: 'effective' },
  { label: '操作', width: 150, fixed: 'right', slot: 'actions' },
]
const domainColumns: DataTableColumn[] = [
  { prop: 'domainCode', label: '数据域编码', minWidth: 160, fixed: 'left' },
  { prop: 'domainName', label: '数据域名称', minWidth: 150 },
  { prop: 'appCode', label: '所属系统', width: 110 },
  { label: '支持范围', minWidth: 330, slot: 'scopes' },
  { prop: 'selfDefinition', label: 'SELF 业务解释', minWidth: 260 },
  { label: '关联资源', minWidth: 220, slot: 'resources' },
  { label: '配置状态', width: 120, slot: 'domainStatus' },
]
const scopeLabels: Record<DataScopeMode, string> = {
  SELF: '本人',
  ORG: '本人组织',
  ORG_AND_CHILDREN: '本人组织及下级',
  TENANT: '当前 Tenant',
  GROUP: '集团',
  CUSTOM: '指定 Tenant',
}

const visiblePermissions = computed(() => {
  if (props.state !== 'ready') return []
  const keyword = committed.domainCode.trim().toLocaleLowerCase('zh-CN')
  return props.permissions.filter(
    (item) =>
      !keyword ||
      [item.domainCode, item.domainName].some((value) =>
        value.toLocaleLowerCase('zh-CN').includes(keyword),
      ),
  )
})
const visibleDomains = computed(() => {
  if (props.state !== 'ready') return []
  const keyword = committed.domainCode.trim().toLocaleLowerCase('zh-CN')
  return props.domains.filter(
    (item) =>
      (!committed.appId || item.appId === committed.appId) &&
      (!keyword ||
        [item.domainCode, item.domainName].some((value) =>
          value.toLocaleLowerCase('zh-CN').includes(keyword),
        )),
  )
})
const allowedScopes = computed<DataScopeMode[]>(() => {
  const domain = props.domains.find((item) => item.domainCode === selected.value?.domainCode)
  return domain?.supportedScopes ?? ['SELF', 'ORG', 'ORG_AND_CHILDREN', 'TENANT']
})

function asPermission(row: Record<string, unknown>) {
  return row as unknown as RoleDataPermissionRecord
}
function asDomain(row: Record<string, unknown>) {
  return row as unknown as DataDomainRecord
}
function search() {
  Object.assign(committed, query)
  emit('action', '数据域查询条件已生效')
}
function reset() {
  Object.assign(query, { appId: undefined, domainCode: '' })
  Object.assign(committed, query)
  emit('action', '数据域查询条件已重置')
}
function openConfig(record: RoleDataPermissionRecord) {
  selected.value = record
  scopeMode.value = record.scopeMode
  targetTenantIds.value = [...record.targetTenantIds]
  drawerVisible.value = true
}
function openClear(record: RoleDataPermissionRecord) {
  selected.value = record
  clearVisible.value = true
}
async function savePermission() {
  if (!selected.value || submitting.value) return
  if (props.submit) {
    submitting.value = true
    try {
      await props.submit(selected.value, scopeMode.value, [...targetTenantIds.value], false)
      drawerVisible.value = false
    } finally {
      submitting.value = false
    }
    return
  }
  drawerVisible.value = false
  emit('action', `数据域 ${selected.value?.domainName ?? '当前数据域'} 的范围候选已保存`)
}
async function clearPermission() {
  if (!selected.value || submitting.value) return
  if (props.submit) {
    submitting.value = true
    try {
      await props.submit(selected.value, undefined, [], true)
      clearVisible.value = false
      drawerVisible.value = false
    } finally {
      submitting.value = false
    }
    return
  }
  clearVisible.value = false
  drawerVisible.value = false
  emit('action', `${selected.value?.domainName ?? '当前数据域'} 已清除候选配置；结果为无数据访问权`)
}

watch(
  () => props.permissions,
  (permissions) => {
    selected.value =
      permissions.find((item) => item.domainCode === selected.value?.domainCode) ?? permissions[0]
  },
)
</script>

<template>
  <AppPage class="data-permission-page">
    <ListPageTemplate>
      <template #header>
        <PageHeader
          title="角色数据权限"
          description="数据范围只限定已获得的功能资源；未配置不会回退到当前 Tenant"
        >
          <template #actions
            ><el-button v-if="back" @click="back"
              ><Icon icon="mdi:chevron-left" width="18" aria-hidden="true" />返回角色列表</el-button
            ><el-button :loading="state === 'loading'" @click="emit('retry')"
              ><Icon icon="mdi:refresh" width="18" aria-hidden="true" />刷新权限结果</el-button
            ></template
          >
        </PageHeader>
        <RoleContextBar :role="role" />
      </template>
      <template #search>
        <SearchPanel :loading="state === 'loading'" @search="search" @reset="reset">
          <el-form-item label="所属系统"
            ><el-select v-model="query.appId" clearable placeholder="全部系统"
              ><el-option
                v-for="system in systems"
                :key="system.id"
                :label="`${system.appName} · ${system.appCode}`"
                :value="system.id" /></el-select
          ></el-form-item>
          <el-form-item label="数据域"
            ><el-input
              v-model="query.domainCode"
              clearable
              placeholder="域编码或名称"
              @keyup.enter="search"
          /></el-form-item>
          <el-form-item label="当前 Tenant"
            ><el-input :model-value="role.tenantCode" disabled
          /></el-form-item>
        </SearchPanel>
      </template>
      <template #toolbar>
        <div class="data-permission-toolbar">
          <el-tabs v-model="activeTab" aria-label="数据权限视图"
            ><el-tab-pane label="角色数据权限" name="role" /><el-tab-pane
              label="数据域目录"
              name="catalog"
          /></el-tabs>
          <TableToolbar
            :title="activeTab === 'role' ? '角色数据域' : '预注册数据域'"
            :total="activeTab === 'role' ? visiblePermissions.length : visibleDomains.length"
            :refreshing="state === 'loading'"
            @refresh="emit('retry')"
          />
        </div>
      </template>

      <el-alert
        v-if="state === 'retryable-error'"
        class="data-permission-page__alert"
        title="数据权限加载失败，未使用缓存推断访问范围"
        type="error"
        :closable="false"
        show-icon
        ><template #default
          ><el-button link type="primary" @click="emit('retry')">重新加载</el-button></template
        ></el-alert
      >
      <DataTable
        v-if="activeTab === 'role'"
        :data="visiblePermissions"
        :columns="permissionColumns"
        :loading="state === 'loading'"
      >
        <template #configured="{ row }"
          ><StatusTag
            :label="asPermission(row).isConfigured ? '已配置' : '未配置：无数据访问权'"
            :tone="asPermission(row).isConfigured ? 'success' : 'danger'"
        /></template>
        <template #scope="{ row }"
          ><strong v-if="asPermission(row).scopeMode">{{
            scopeLabels[asPermission(row).scopeMode!]
          }}</strong
          ><span v-else>—</span></template
        >
        <template #targets="{ row }"
          ><span>{{ asPermission(row).targetTenantNames.join('、') || '—' }}</span></template
        >
        <template #effective="{ row }"
          ><StatusTag
            :label="asPermission(row).isCurrentlyEffective ? '当前有效' : '当前无效'"
            :tone="asPermission(row).isCurrentlyEffective ? 'success' : 'warning'"
          /><small v-if="asPermission(row).invalidReason" class="data-permission-page__reason">{{
            asPermission(row).invalidReason
          }}</small></template
        >
        <template #actions="{ row }">
          <RowActionGrid :aria-label="`${asPermission(row).domainName} 的数据权限操作`">
            <el-button
              v-permission="IAM_PERMISSIONS.roles.saveDataPermissions"
              link
              type="primary"
              :disabled="!role.canMaintain || role.status !== 'ACTIVE'"
              @click="openConfig(asPermission(row))"
              >配置</el-button
            >
            <el-button
              v-if="asPermission(row).isConfigured"
              v-permission="IAM_PERMISSIONS.roles.saveDataPermissions"
              link
              type="danger"
              :disabled="!role.canMaintain"
              @click="openClear(asPermission(row))"
              >清除</el-button
            >
          </RowActionGrid>
        </template>
      </DataTable>
      <DataTable
        v-else
        :data="visibleDomains"
        :columns="domainColumns"
        :loading="state === 'loading'"
      >
        <template #scopes="{ row }"
          ><div class="data-permission-page__tags">
            <StatusTag
              v-for="scope in asDomain(row).supportedScopes"
              :key="scope"
              :label="scopeLabels[scope]"
              tone="info"
            /></div
        ></template>
        <template #resources="{ row }"
          ><span>{{
            asDomain(row)
              .linkedResourceIds.map((id) => `#${id}`)
              .join('、') || '无有效关联资源'
          }}</span></template
        >
        <template #domainStatus="{ row }"
          ><StatusTag
            :label="asDomain(row).isConfigurationValid ? '配置有效' : '配置异常'"
            :tone="asDomain(row).isConfigurationValid ? 'success' : 'danger'"
          /><small v-if="asDomain(row).invalidReason" class="data-permission-page__reason">{{
            asDomain(row).invalidReason
          }}</small></template
        >
      </DataTable>
      <el-alert
        v-if="activeTab === 'catalog' && invalidResources?.length"
        class="data-permission-page__alert"
        :title="`${invalidResources.length} 个资源的数据权限域配置无效`"
        :description="
          invalidResources.map((item) => `${item.resourceName}：${item.invalidReason}`).join('；')
        "
        type="warning"
        :closable="false"
        show-icon
      />
    </ListPageTemplate>

    <FormDrawer
      v-model="drawerVisible"
      :title="`配置 ${selected?.domainName ?? ''} 数据范围`"
      confirm-button-text="保存数据范围"
      :submitting="submitting"
      :dirty="permissionDirty"
      @confirm="savePermission"
    >
      <el-alert
        title="未配置等于无数据访问权；数据权限不会单独产生页面或按钮访问资格。"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-form class="data-permission-form" label-position="top" novalidate>
        <el-form-item label="角色"
          ><el-input :model-value="`${role.roleName} · ${role.roleCode}`" disabled
        /></el-form-item>
        <el-form-item label="数据域"
          ><el-input :model-value="`${selected?.domainName} · ${selected?.domainCode}`" disabled
        /></el-form-item>
        <el-form-item label="选择数据范围">
          <el-radio-group v-model="scopeMode" class="data-permission-form__scopes">
            <el-radio v-for="scope in allowedScopes" :key="scope" :value="scope"
              ><strong>{{ scopeLabels[scope] }}</strong
              ><small v-if="scope === 'SELF'">按数据域定义的本人负责或经办数据</small
              ><small v-else-if="scope === 'ORG'">本人当前全部有效组织的并集</small
              ><small v-else-if="scope === 'ORG_AND_CHILDREN'">本人有效组织及其全部有效下级</small
              ><small v-else-if="scope === 'TENANT'">仅当前 Tenant</small
              ><small v-else-if="scope === 'GROUP'">当前集团全部有效 Tenant</small
              ><small v-else>仅明确选择的同集团有效 Tenant</small></el-radio
            >
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="scopeMode === 'CUSTOM'" label="指定 Tenant"
          ><el-select
            v-model="targetTenantIds"
            multiple
            collapse-tags
            :max-collapse-tags="2"
            placeholder="至少选择一个有效 Tenant"
            ><el-option
              v-for="tenant in tenants"
              :key="tenant.id"
              :label="`${tenant.name} · ${tenant.code}`"
              :value="tenant.id" /></el-select
        ></el-form-item>
      </el-form>
      <template #footer="{ requestClose }"
        ><el-button
          v-if="selected?.isConfigured"
          v-permission="IAM_PERMISSIONS.roles.saveDataPermissions"
          type="danger"
          plain
          :disabled="submitting"
          @click="clearVisible = true"
          >清除该域配置</el-button
        ><span class="data-permission-form__spacer" /><el-button
          :disabled="submitting"
          @click="requestClose"
          >取消</el-button
        ><el-button
          v-permission="IAM_PERMISSIONS.roles.saveDataPermissions"
          type="primary"
          :disabled="
            submitting || !scopeMode || (scopeMode === 'CUSTOM' && targetTenantIds.length === 0)
          "
          :loading="submitting"
          @click="savePermission"
          >保存数据范围</el-button
        ></template
      >
    </FormDrawer>

    <el-dialog
      v-model="clearVisible"
      title="清除数据权限配置"
      width="560"
      :close-on-click-modal="false"
    >
      <el-alert
        title="清除后，该角色在此数据域将没有数据访问权，不会回退到当前 Tenant。"
        type="error"
        :closable="false"
        show-icon
      />
      <p class="data-permission-confirm">
        目标数据域：{{ selected?.domainName }}（{{ selected?.domainCode }}）
      </p>
      <template #footer
        ><el-button :disabled="submitting" @click="clearVisible = false">保留配置</el-button
        ><el-button
          v-permission="IAM_PERMISSIONS.roles.saveDataPermissions"
          type="danger"
          :loading="submitting"
          @click="clearPermission"
          >确认清除配置</el-button
        ></template
      >
    </el-dialog>
  </AppPage>
</template>

<style scoped lang="scss">
.data-permission-toolbar {
  display: grid;
  grid-template-columns: 1fr;
}
.data-permission-toolbar :deep(.el-tabs) {
  padding: 0 var(--spacing-4);
  border-bottom: 1px solid var(--border-light);
}
.data-permission-toolbar :deep(.el-tabs__header) {
  margin: 0;
}
.data-permission-toolbar :deep(.table-toolbar) {
  border-bottom: 1px solid var(--border-light);
}
.data-permission-page__alert {
  margin: var(--spacing-3) var(--spacing-4);
}
.data-permission-page__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-1);
}
.data-permission-page__reason {
  display: block;
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
}
.data-permission-form {
  display: grid;
  gap: var(--spacing-2);
  margin-top: var(--spacing-4);
}
.data-permission-form__scopes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-2);
  width: 100%;
}
.data-permission-form__scopes :deep(.el-radio) {
  align-items: flex-start;
  height: auto;
  min-height: var(--spacing-12);
  padding: var(--spacing-3);
  margin: 0;
  white-space: normal;
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-default);
}
.data-permission-form__scopes strong,
.data-permission-form__scopes small {
  display: block;
}
.data-permission-form__scopes small {
  margin-top: var(--spacing-1);
  color: var(--text-secondary);
  line-height: 1.5;
}
.data-permission-form__spacer {
  flex: 1;
}
.data-permission-confirm {
  margin: var(--spacing-4) 0 0;
  color: var(--text-regular);
}
</style>
