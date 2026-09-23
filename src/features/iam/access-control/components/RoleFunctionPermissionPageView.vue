<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'

import AppPage from '@shared/components/AppPage.vue'
import PageHeader from '@shared/components/PageHeader.vue'
import FunctionPermissionPanel from './FunctionPermissionPanel.vue'
import RoleContextBar from './RoleContextBar.vue'
import type {
  AccessControlPreviewState,
  ResourceNode,
  RoleRecord,
  SystemRecord,
} from '../types/accessControl'

const props = defineProps<{
  canEdit: boolean
  role: RoleRecord
  systems: SystemRecord[]
  resourcesBySystem: Record<number, ResourceNode[]>
  directResourceIds: number[]
  state: AccessControlPreviewState
  submit?: (directResourceIds: number[]) => Promise<void>
  back?: () => void
}>()
const emit = defineEmits<{ action: [message: string]; retry: [] }>()

const selectedDirectIds = ref<number[]>(normalizeIds(props.directResourceIds))
const confirmVisible = ref(false)
const submitting = ref(false)
const roleCanBeMaintained = computed(
  () =>
    props.role.status === 'ACTIVE' && props.role.roleType !== 'SYSTEM' && props.role.canMaintain,
)
const panelCanEdit = computed(() => props.canEdit && roleCanBeMaintained.value)
const dirty = computed(() => {
  const current = [...selectedDirectIds.value].sort((a, b) => a - b).join(',')
  const original = [...props.directResourceIds].sort((a, b) => a - b).join(',')
  return current !== original
})
const readOnlyMessage = computed(() => {
  if (!props.canEdit) return '当前账号缺少保存角色功能权限的 Function，只能查看。'
  if (props.role.status !== 'ACTIVE') return '角色已停用，当前配置仅供查看。'
  if (props.role.roleType === 'SYSTEM') return '系统角色不允许在此修改功能权限。'
  return '该角色当前不可维护。'
})

function normalizeIds(ids: Iterable<number>): number[] {
  return [...new Set(ids)].sort((left, right) => left - right)
}

function updateSelectedIds(ids: number[]) {
  if (!panelCanEdit.value) return
  selectedDirectIds.value = normalizeIds(ids)
}

function cancelChanges() {
  if (!panelCanEdit.value) return
  selectedDirectIds.value = normalizeIds(props.directResourceIds)
  emit('action', '已恢复服务端返回的直接选择集合')
}

async function savePermissions() {
  if (submitting.value || !panelCanEdit.value) return
  if (props.submit) {
    submitting.value = true
    try {
      await props.submit(normalizeIds(selectedDirectIds.value))
      confirmVisible.value = false
    } finally {
      submitting.value = false
    }
    return
  }
  confirmVisible.value = false
  emit('action', `功能权限候选已保存：完整直接选择集合共 ${selectedDirectIds.value.length} 项`)
}

watch(
  () => props.directResourceIds,
  (ids) => {
    selectedDirectIds.value = normalizeIds(ids)
  },
)
</script>

<template>
  <AppPage :scrollable="false" class="function-page">
    <PageHeader title="角色功能权限" description="按系统勾选需要授予该角色的资源">
      <template #actions>
        <el-button v-if="back" @click="back">
          <Icon icon="mdi:chevron-left" width="18" aria-hidden="true" />返回角色列表
        </el-button>
        <template v-if="canEdit">
          <el-button :disabled="!dirty || submitting || !roleCanBeMaintained" @click="cancelChanges"
            >取消更改</el-button
          >
          <el-button
            type="primary"
            :disabled="!dirty || !roleCanBeMaintained"
            :loading="submitting"
            @click="confirmVisible = true"
            >保存功能权限</el-button
          >
        </template>
      </template>
    </PageHeader>
    <RoleContextBar :role="role" :direct-count="selectedDirectIds.length" :dirty="dirty" />

    <FunctionPermissionPanel
      subject-type="role"
      :can-edit="panelCanEdit"
      :systems="systems"
      :resources-by-system="resourcesBySystem"
      :selected-resource-ids="selectedDirectIds"
      :state="state"
      :read-only-message="readOnlyMessage"
      @update:selected-resource-ids="updateSelectedIds"
      @action="emit('action', $event)"
      @retry="emit('retry')"
    />

    <el-dialog
      v-model="confirmVisible"
      title="保存功能权限"
      width="580"
      :close-on-click-modal="false"
    >
      <el-alert
        title="本次保存会以当前勾选结果替换旧配置；服务端不会根据父节点自动补充任何后代权限。"
        type="warning"
        :closable="false"
        show-icon
      />
      <div class="permission-confirm">
        <strong>{{ selectedDirectIds.length }}</strong
        ><span>项资源将提交</span>
        <p>
          权限变更从下一次受保护操作开始生效；若角色或资源版本已变化，整次保存失败并保留当前选择。
        </p>
      </div>
      <template #footer
        ><el-button @click="confirmVisible = false">继续检查</el-button
        ><el-button
          type="primary"
          :disabled="!panelCanEdit"
          :loading="submitting"
          @click="savePermissions"
          >确认保存权限</el-button
        ></template
      >
    </el-dialog>
  </AppPage>
</template>

<style scoped lang="scss">
.permission-confirm {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  gap: var(--spacing-2);
  margin-top: var(--spacing-5);
}
.permission-confirm strong {
  color: var(--color-primary);
  font-size: var(--font-size-metric);
}
.permission-confirm p {
  grid-column: 1 / -1;
  margin: var(--spacing-2) 0 0;
  color: var(--text-regular);
  line-height: 1.7;
}
</style>
