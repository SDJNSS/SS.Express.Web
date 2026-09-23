<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import ConfirmAction from '@shared/components/ConfirmAction.vue'
import DataTable, { type DataTableColumn } from '@shared/components/DataTable.vue'
import DetailPageTemplate from '@shared/components/page-templates/DetailPageTemplate.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'
import FunctionPermissionPanel from './FunctionPermissionPanel.vue'
import type {
  AccessControlPreviewState,
  AssignmentRecord,
  FunctionPermissionRole,
  FunctionPermissionSubject,
  MemberFunctionPermissionRecord,
  MemberPermissionTenantContext,
  ResourceNode,
  RoleRecord,
  SystemRecord,
} from '../types/accessControl'

const props = defineProps<{
  subject: FunctionPermissionSubject | undefined
  memberships: MemberPermissionTenantContext[]
  currentTenantId: number
  assignments: AssignmentRecord[]
  availableRoles: RoleRecord[]
  functionRoles: FunctionPermissionRole[]
  functions: MemberFunctionPermissionRecord[]
  functionSystems: SystemRecord[]
  functionResourcesBySystem: Record<number, ResourceNode[]>
  functionResourceIds: number[]
  state: AccessControlPreviewState
  initialTab?: 'roles' | 'functions'
  back: () => void
  changeTenant?: (tenantId: number) => Promise<void>
  submitAssign?: (roleIds: number[]) => Promise<void>
  submitRevoke?: (record: AssignmentRecord) => Promise<void>
}>()
const emit = defineEmits<{ retry: [] }>()
const activeTab = ref(props.initialTab ?? 'roles')
const assignVisible = ref(false)
const selectedRoleIds = ref<number[]>([])
const submitting = ref(false)

const roleColumns: DataTableColumn[] = [
  { prop: 'roleCode', label: '角色编码', minWidth: 180, fixed: 'left' },
  { prop: 'roleName', label: '角色名称', minWidth: 160 },
  { label: '角色类型', width: 118, slot: 'roleType' },
  { label: '分配关系', width: 118, slot: 'assignmentType' },
  { label: '当前有效性', minWidth: 210, slot: 'effective' },
  { label: '操作', width: 100, fixed: 'right', slot: 'actions' },
]

const currentMembership = computed(() =>
  props.memberships.find((membership) => membership.tenantId === props.currentTenantId),
)
const assignedRoleIds = computed(() => new Set(props.assignments.map((item) => item.roleId)))
const assignableRoles = computed(() =>
  props.availableRoles.filter(
    (role) =>
      role.roleType === 'CUSTOM' &&
      role.status === 'ACTIVE' &&
      role.isCurrentlyEffective &&
      role.canMaintain &&
      !role.isGroupControlled &&
      !assignedRoleIds.value.has(role.id),
  ),
)
const canManageRoles = computed(() => Boolean(currentMembership.value?.isCurrentlyEffective))

function asAssignment(row: Record<string, unknown>) {
  return row as unknown as AssignmentRecord
}

async function handleTenantChange(value: string | number | boolean | undefined) {
  const tenantId = Number(value)
  if (!Number.isInteger(tenantId) || tenantId <= 0 || tenantId === props.currentTenantId) return
  await props.changeTenant?.(tenantId)
}

function openAssign() {
  selectedRoleIds.value = []
  assignVisible.value = true
}

async function assignRoles() {
  if (!selectedRoleIds.value.length || submitting.value) return
  submitting.value = true
  try {
    await props.submitAssign?.([...selectedRoleIds.value])
    assignVisible.value = false
  } finally {
    submitting.value = false
  }
}

async function revokeRole(record: AssignmentRecord) {
  if (submitting.value) return
  submitting.value = true
  try {
    await props.submitRevoke?.(record)
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.initialTab,
  (tab) => {
    if (tab) activeTab.value = tab
  },
)
</script>

<template>
  <AppPage class="member-permission-page">
    <DetailPageTemplate>
      <template #header>
        <PageHeader
          title="用户角色与权限"
          description="按 Tenant 管理用户角色，并查看该 Tenant 成员的只读 Function 权限"
        >
          <template #actions>
            <el-button @click="back">
              <Icon icon="mdi:chevron-left" width="18" aria-hidden="true" />返回用户列表
            </el-button>
            <el-button :loading="state === 'loading'" @click="emit('retry')">
              <Icon icon="mdi:refresh" width="18" aria-hidden="true" />刷新权限结果
            </el-button>
          </template>
        </PageHeader>
      </template>
      <template #summary>
        <div class="member-permission-summary">
          <section v-if="subject" class="member-permission-context">
            <span class="member-permission-context__icon">
              <Icon icon="mdi:shield-account-outline" width="24" aria-hidden="true" />
            </span>
            <div>
              <strong>{{ subject.subjectName }}</strong>
              <small>
                {{ currentMembership?.tenantUserCode || subject.subjectCode }} ·
                {{ currentMembership?.tenantName || '当前 Tenant' }}
              </small>
            </div>
            <StatusTag
              :label="subject.isCurrentlyEffective ? '成员当前有效' : '成员当前无效'"
              :tone="subject.isCurrentlyEffective ? 'success' : 'warning'"
            />
            <span v-if="subject.invalidReason" class="member-permission-context__reason">
              {{ subject.invalidReason }}
            </span>
            <label class="member-permission-tenant">
              <span>当前 Tenant</span>
              <el-select
                :model-value="currentTenantId"
                aria-label="当前 Tenant"
                :loading="state === 'loading'"
                @change="handleTenantChange"
              >
                <el-option
                  v-for="membership in memberships"
                  :key="membership.tenantId"
                  :label="`${membership.tenantName || membership.tenantCode}${membership.isCurrentlyEffective ? '' : '（已失效）'}`"
                  :value="membership.tenantId"
                />
              </el-select>
            </label>
          </section>
        </div>
      </template>

      <section class="member-permission-workspace">
        <el-tabs v-model="activeTab">
          <el-tab-pane :label="`角色（${assignments.length}）`" name="roles">
            <div class="member-role-toolbar">
              <div>
                <strong>{{ currentMembership?.tenantName || '当前 Tenant' }}</strong>
                <small>
                  {{ currentMembership?.tenantUserCode || '—' }}
                  <template v-if="currentMembership?.isTenantAdmin"> · Tenant 管理员</template>
                </small>
              </div>
              <el-button
                v-permission="IAM_PERMISSIONS.members.assignRole"
                type="primary"
                :disabled="!canManageRoles || assignableRoles.length === 0"
                @click="openAssign"
              >
                <Icon icon="mdi:plus" width="18" aria-hidden="true" />分配角色
              </el-button>
            </div>
            <DataTable
              class="member-role-table"
              :data="assignments"
              :columns="roleColumns"
              :loading="state === 'loading'"
              height="100%"
            >
              <template #roleType="{ row }">
                <StatusTag
                  :label="asAssignment(row).roleType === 'SYSTEM' ? '系统角色' : '自定义角色'"
                  tone="info"
                />
              </template>
              <template #assignmentType="{ row }">
                <StatusTag
                  :label="asAssignment(row).isTenantAdminIdentity ? '管理员身份' : '直接角色'"
                  :tone="asAssignment(row).isTenantAdminIdentity ? 'primary' : 'info'"
                />
              </template>
              <template #effective="{ row }">
                <StatusTag
                  :label="asAssignment(row).isCurrentlyEffective ? '当前有效' : '当前无效'"
                  :tone="asAssignment(row).isCurrentlyEffective ? 'success' : 'warning'"
                />
                <small v-if="asAssignment(row).invalidReason">
                  {{ asAssignment(row).invalidReason }}
                </small>
              </template>
              <template #actions="{ row }">
                <RowActionGrid
                  density="compact"
                  :aria-label="`${asAssignment(row).roleName} 的操作`"
                >
                  <ConfirmAction
                    :title="`确认移除角色“${asAssignment(row).roleName}”？`"
                    confirm-button-text="移除"
                    @confirm="revokeRole(asAssignment(row))"
                  >
                    <el-button
                      v-permission="IAM_PERMISSIONS.members.revokeRole"
                      link
                      type="danger"
                      :loading="submitting"
                      :disabled="
                        !canManageRoles ||
                        asAssignment(row).isTenantAdminIdentity ||
                        asAssignment(row).isGroupControlled ||
                        !asAssignment(row).canMaintain
                      "
                    >
                      移除
                    </el-button>
                  </ConfirmAction>
                </RowActionGrid>
              </template>
            </DataTable>
          </el-tab-pane>

          <el-tab-pane :label="`Function（${functions.length}）`" name="functions">
            <FunctionPermissionPanel
              subject-type="member"
              :can-edit="false"
              :systems="functionSystems"
              :resources-by-system="functionResourcesBySystem"
              :selected-resource-ids="functionResourceIds"
              :state="state === 'ready' && functions.length === 0 ? 'empty' : state"
              :read-only-message="`当前 Tenant 成员的功能权限由 ${functionRoles.length} 个有效角色聚合，只能查看；请通过角色页签调整角色归属。`"
              @retry="emit('retry')"
            />
          </el-tab-pane>
        </el-tabs>
        <el-result
          v-if="state === 'retryable-error' && activeTab === 'roles'"
          icon="error"
          title="用户权限加载失败"
          sub-title="未使用缓存结果推断当前权限"
        >
          <template #extra
            ><el-button type="primary" @click="emit('retry')">重新加载</el-button></template
          >
        </el-result>
      </section>
    </DetailPageTemplate>

    <FormDrawer
      v-model="assignVisible"
      title="分配角色"
      size="560"
      :submitting="submitting"
      :dirty="selectedRoleIds.length > 0"
      :confirm-disabled="selectedRoleIds.length === 0"
      confirm-button-text="确认分配"
      @confirm="assignRoles"
      @discard="selectedRoleIds = []"
    >
      <div class="member-role-form">
        <el-alert
          :title="`角色将分配给 ${subject?.subjectName || '当前用户'} 在 ${currentMembership?.tenantName || '当前 Tenant'} 的成员身份。`"
          type="info"
          :closable="false"
          show-icon
        />
        <el-form label-position="top">
          <el-form-item label="待分配角色" required>
            <el-select
              v-model="selectedRoleIds"
              multiple
              filterable
              clearable
              aria-label="待分配角色"
              placeholder="请选择一个或多个角色"
            >
              <el-option
                v-for="role in assignableRoles"
                :key="role.id"
                :label="`${role.roleName}（${role.roleCode}）`"
                :value="role.id"
              />
            </el-select>
          </el-form-item>
        </el-form>
      </div>
    </FormDrawer>
  </AppPage>
</template>

<style scoped>
.member-permission-page {
  gap: var(--spacing-4);
}

.member-permission-summary {
  display: grid;
  gap: var(--spacing-3);
}

.member-permission-context {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3) var(--spacing-4);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-large);
  background: var(--background-card);
}

.member-permission-context__icon {
  display: grid;
  width: var(--spacing-10);
  height: var(--spacing-10);
  place-items: center;
  border-radius: var(--radius-default);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.member-permission-context div {
  display: grid;
  gap: var(--spacing-1);
  margin-right: auto;
}

.member-permission-context strong {
  color: var(--text-primary);
  font-size: var(--font-size-md);
}

.member-permission-context small,
.member-permission-context__reason,
.member-permission-workspace small {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.member-permission-tenant {
  display: grid;
  flex: 0 0 min(360px, 32vw);
  gap: var(--spacing-1);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.member-permission-tenant :deep(.el-select) {
  width: 100%;
}

.member-role-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  min-height: calc(var(--spacing-12) + var(--spacing-2));
  padding: var(--spacing-2) 0 var(--spacing-3);
  border-bottom: 1px solid var(--border-light);
}

.member-role-toolbar > div,
.member-role-form {
  display: grid;
  gap: var(--spacing-2);
}

.member-role-toolbar strong {
  color: var(--text-primary);
}

.member-permission-workspace {
  flex: 1;
  min-height: calc(var(--spacing-12) * 10);
  padding: 0 var(--spacing-4) var(--spacing-4);
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-large);
  background: var(--background-card);
}

.member-permission-workspace :deep(.el-tabs),
.member-permission-workspace :deep(.el-tab-pane) {
  height: 100%;
}

.member-permission-workspace :deep(.el-tabs__content) {
  height: calc(100% - 56px);
  overflow: hidden;
}

.member-permission-workspace :deep(.el-tab-pane) {
  min-height: 0;
}

.member-permission-workspace :deep(.el-tab-pane) {
  display: flex;
  flex-direction: column;
}

.member-role-table {
  min-height: 0;
  flex: 1;
}

.member-permission-workspace small {
  display: block;
  margin-top: var(--spacing-1);
}

.member-role-form :deep(.el-select) {
  width: 100%;
}
</style>
