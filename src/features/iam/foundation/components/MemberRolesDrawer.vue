<script setup lang="ts">
import { membersElements } from '../iam-resource.registry'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import ConfirmAction from '@shared/components/ConfirmAction.vue'
import DataTable from '@shared/components/DataTable.vue'
import FormDrawer from '@shared/components/FormDrawer.vue'
import RowActionGrid from '@shared/components/RowActionGrid.vue'
import StatusTag from '@shared/components/StatusTag.vue'
import { IAM_PERMISSIONS } from '@shared/constants/iamPermissions'
import { notification } from '@shared/services/notification'
import type { MembershipRecord } from '../types/foundation'
import type { MemberRoleRow, MemberRoleSnapshot } from '../types/memberRoles'

const props = defineProps<{
  modelValue: boolean
  member?: MembershipRecord | undefined
  loadRoles?: ((member: MembershipRecord) => Promise<MemberRoleSnapshot>) | undefined
  updateRoles?:
    | ((
        snapshot: MemberRoleSnapshot,
        roleIds: number[],
        operation: 'assign' | 'revoke',
      ) => Promise<void>)
    | undefined
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const snapshot = ref<MemberRoleSnapshot>()
const selected = ref<number[]>([])
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
let generation = 0
const candidates = computed(() => {
  const assigned = new Set(snapshot.value?.roles.map((role) => role.roleId))
  return snapshot.value?.candidates.filter((role) => !assigned.has(role.id)) ?? []
})
const columns = [
  { prop: 'roleName', label: '角色名称', minWidth: 160 },
  { prop: 'roleCode', label: '角色编码', minWidth: 160 },
  { label: '状态', slot: 'status', width: 100 },
  { label: '操作', slot: 'actions' },
]
const asRole = (value: Record<string, unknown>) => value as MemberRoleRow

async function load() {
  const run = ++generation
  snapshot.value = undefined
  error.value = ''
  loading.value = true
  try {
    if (!props.member || !props.loadRoles) throw new Error('此预览未连接角色服务')
    const result = await props.loadRoles(props.member)
    if (run === generation) snapshot.value = result
  } catch (cause) {
    if (run === generation) error.value = cause instanceof Error ? cause.message : '角色加载失败'
  } finally {
    if (run === generation) loading.value = false
  }
}

async function update(roleIds: number[], operation: 'assign' | 'revoke') {
  if (!snapshot.value || !props.updateRoles || submitting.value || !roleIds.length) return
  submitting.value = true
  error.value = ''
  try {
    await props.updateRoles(snapshot.value, roleIds, operation)
    selected.value = []
    notification.success(operation === 'assign' ? '角色已分配' : '角色已移除')
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '角色更新失败，请刷新后重试'
  } finally {
    submitting.value = false
  }
}

watch(
  () => [props.modelValue, props.member?.userId, props.member?.tenantId],
  () => {
    selected.value = []
    if (props.modelValue) void load()
    else {
      generation += 1
      snapshot.value = undefined
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  generation += 1
})
</script>

<template>
  <FormDrawer
    :resource_element="membersElements.roles"
    :model-value="modelValue"
    :title="`${member?.realName || '未设置姓名'} · 分配角色`"
    size="720"
    :dirty="selected.length > 0"
    :submitting="submitting"
    @update:model-value="emit('update:modelValue', $event)"
    @discard="selected = []"
  >
    <section class="member-roles-drawer">
      <p>{{ member?.tenantName }} · {{ member?.userName }}</p>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
      <el-button
        v-resource-element="membersElements.roles"
        :loading="loading"
        :disabled="submitting"
        @click="load"
        >刷新角色</el-button
      >
      <DataTable
        :resource_element="membersElements.roles"
        :columns="columns"
        :data="snapshot?.roles ?? []"
        :loading="loading"
      >
        <template #status="{ row }">
          <StatusTag
            :label="asRole(row).effective ? '有效' : '无效'"
            :tone="asRole(row).effective ? 'success' : 'warning'"
          />
        </template>
        <template #actions="{ row }">
          <RowActionGrid>
            <ConfirmAction
              :resource_element="membersElements.revokeRole"
              :title="`确认移除角色“${asRole(row).roleName}”？`"
              confirm-button-text="移除"
              @confirm="update([asRole(row).roleId], 'revoke')"
            >
              <el-button
                v-resource-element="membersElements.revokeRole"
                v-permission="IAM_PERMISSIONS.members.revokeRole"
                link
                type="danger"
                :disabled="submitting || loading || !snapshot?.effective || !asRole(row).removable"
                :title="asRole(row).reason"
                >移除</el-button
              >
            </ConfirmAction>
          </RowActionGrid>
        </template>
      </DataTable>
      <el-form
        v-resource-element="membersElements.assignRole"
        v-permission="IAM_PERMISSIONS.members.assignRole"
        label-position="top"
        @submit.prevent
      >
        <el-form-item label="待分配角色">
          <el-select
            v-model="selected"
            v-resource-element="membersElements.assignRole"
            multiple
            collapse-tags
            collapse-tags-tooltip
            filterable
            clearable
            aria-label="待分配角色"
            placeholder="请选择当前租户的角色"
            :disabled="loading || submitting || !snapshot?.effective"
          >
            <el-option
              v-for="role in candidates"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </section>
    <template #footer="{ requestClose }">
      <el-button
        v-resource-element="membersElements.local"
        :disabled="submitting"
        @click="requestClose"
        >关闭</el-button
      >
      <el-button
        v-resource-element="membersElements.assignRole"
        v-permission="IAM_PERMISSIONS.members.assignRole"
        type="primary"
        :loading="submitting"
        :disabled="loading || submitting || !snapshot?.effective || !selected.length"
        @click="update(selected, 'assign')"
        >确认分配</el-button
      >
    </template>
  </FormDrawer>
</template>

<style scoped>
.member-roles-drawer {
  display: grid;
  gap: var(--spacing-3);
}
.member-roles-drawer :deep(.el-select) {
  width: 100%;
}
</style>
