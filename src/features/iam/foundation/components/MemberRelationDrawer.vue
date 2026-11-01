<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { FormInstance } from 'element-plus'

import FormDrawer from '@shared/components/FormDrawer.vue'
import PagedEntitySelect from '@shared/components/PagedEntitySelect.vue'
import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import type { PagedEntityLoader } from '@shared/types/pagedOptions'
import { membersElements, resourceRegistry } from '../iam-resource.registry'
import { relationUnavailable, tenantNow, tenantWallTime } from '../adapters/memberRelationPolicy'
import type {
  MemberRelationRecord,
  MemberRelationValue,
  MembershipRecord,
} from '../types/foundation'
import type { MemberRelationEndValue, MemberRelationKind } from '../types/memberMaintenance'

const props = defineProps<{
  modelValue: boolean
  member: MembershipRecord
  kind: MemberRelationKind
  relation?: MemberRelationRecord | undefined
  ending?: boolean
  loadOptions: PagedEntityLoader
  queryMember?: ((member: MembershipRecord) => Promise<MembershipRecord>) | undefined
  save?:
    | ((
        kind: MemberRelationKind,
        member: MembershipRecord,
        value: MemberRelationValue,
      ) => Promise<void>)
    | undefined
  end?:
    | ((
        kind: MemberRelationKind,
        member: MembershipRecord,
        value: MemberRelationEndValue,
      ) => Promise<void>)
    | undefined
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>()
const formRef = ref<FormInstance>()
const form = reactive<MemberRelationValue>({
  targetId: undefined,
  primary: false,
  effectiveStart: '',
  effectiveEnd: '',
  remarks: '',
})
const snapshot = ref<MembershipRecord>()
const original = ref<MemberRelationRecord>()
const error = ref('')
const submitting = ref(false)
const loading = ref(false)
const refreshRequired = ref(false)
let generation = 0
const name = computed(() => (props.kind === 'organization' ? '组织' : '岗位'))
const zone = computed(() => (snapshot.value ?? props.member).tenantTimezone || 'Asia/Shanghai')
const title = computed(
  () => `${props.ending ? '结束' : props.relation ? '编辑' : '新增'}${name.value}归属`,
)
const resourceKey = computed(() =>
  props.ending ? (props.kind === 'organization' ? 'endOrganization' : 'endPosition') : props.kind,
)
const permission = computed(() => resourceRegistry.members.buttons[resourceKey.value].resource_code)
const { hasFunctionPermission } = useEffectivePermissions()
const unavailable = computed(() =>
  relationUnavailable(snapshot.value ?? props.member, original.value),
)
const selectedLabel = computed(() =>
  original.value?.targetId === form.targetId ? original.value?.name : undefined,
)
const rules = {
  targetId: [{ required: true, message: '请选择目标归属', trigger: 'change' }],
  effectiveStart: [{ required: true, message: '请选择有效开始时间', trigger: 'change' }],
}

function fill(member: MembershipRecord) {
  snapshot.value = member
  original.value = props.relation
    ? member[props.kind === 'organization' ? 'organizations' : 'positions'].find(
        (item) => item.id === props.relation?.id,
      )
    : undefined
  if (props.relation && !original.value) throw new Error('归属已不存在，请关闭后重新查看')
  const row = original.value
  Object.assign(form, {
    id: row?.id,
    version: row?.version,
    targetId: row?.targetId,
    primary: row?.isPrimary ?? false,
    effectiveStart: row ? tenantWallTime(row.effectiveStart, zone.value) : '',
    effectiveEnd: row && !props.ending ? tenantWallTime(row.effectiveEnd, zone.value) : '',
    remarks: row?.remarks ?? '',
  })
}

async function reload() {
  const run = ++generation
  loading.value = true
  refreshRequired.value = true
  error.value = ''
  try {
    const fresh = props.queryMember ? await props.queryMember(props.member) : props.member
    if (run !== generation || !props.modelValue) return
    fill(fresh)
    refreshRequired.value = false
  } catch (cause) {
    if (run === generation) error.value = cause instanceof Error ? cause.message : '归属加载失败'
  } finally {
    if (run === generation) loading.value = false
  }
}

function validatePeriod(): string {
  const now = tenantNow(zone.value)
  const end = form.effectiveEnd || (props.ending ? now : '')
  if (end && end <= form.effectiveStart) return '有效结束时间必须晚于开始时间'
  if (props.ending) {
    const oldEnd = tenantWallTime(original.value?.effectiveEnd ?? '', zone.value)
    return oldEnd && end > oldEnd ? '结束操作不能延长原结束时间' : ''
  }
  if (form.primary && (form.effectiveStart > now || (end && end <= now)))
    return '仅当前有效归属可设为主要归属'
  const rows = (snapshot.value ?? props.member)[
    props.kind === 'organization' ? 'organizations' : 'positions'
  ]
  return rows.some(
    (row) =>
      row.id !== form.id &&
      row.targetId === form.targetId &&
      row.status === 'ACTIVE' &&
      (!end || tenantWallTime(row.effectiveStart, zone.value) < end) &&
      (!row.effectiveEnd || tenantWallTime(row.effectiveEnd, zone.value) > form.effectiveStart),
  )
    ? '同一目标的归属有效期不能重叠，请调整时间'
    : ''
}

async function submit() {
  if (
    submitting.value ||
    loading.value ||
    refreshRequired.value ||
    unavailable.value ||
    !hasFunctionPermission(permission.value)
  )
    return
  if (!props.ending && !(await formRef.value?.validate().catch(() => false))) return
  error.value = validatePeriod()
  if (error.value) return
  submitting.value = true
  const run = generation
  try {
    const member = snapshot.value ?? props.member
    if (props.ending && original.value) {
      await props.end?.(props.kind, member, {
        id: original.value.id,
        version: original.value.version,
        effectiveEnd: form.effectiveEnd || null,
      })
    } else await props.save?.(props.kind, member, { ...form })
    if (run !== generation || !props.modelValue) return
    emit('saved')
    emit('update:modelValue', false)
  } catch (cause) {
    if (run !== generation) return
    error.value = `${cause instanceof Error ? cause.message : '归属保存失败'}。请重新加载，核对最新状态后再修改。`
    // Never blindly replay a relationship mutation after a version or uncertain network failure.
    refreshRequired.value = true
  } finally {
    if (run === generation) submitting.value = false
  }
}

watch(
  () => [
    props.modelValue,
    props.member.userId,
    props.member.tenantId,
    props.kind,
    props.relation?.id,
    props.ending,
  ],
  () => {
    generation += 1
    error.value = ''
    refreshRequired.value = false
    submitting.value = false
    if (props.modelValue) {
      fill(props.member)
      // Edit/End must re-read relation versions, not just reuse the list's opening snapshot.
      if (props.relation) void reload()
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
    :model-value="modelValue"
    :resource_element="
      ending
        ? kind === 'organization'
          ? membersElements.endOrganization
          : membersElements.endPosition
        : relation
          ? kind === 'organization'
            ? membersElements.editOrganization
            : membersElements.editPosition
          : kind === 'organization'
            ? membersElements.organization
            : membersElements.position
    "
    :title="title"
    size="min(760px, 86%)"
    :submitting="submitting"
    :confirm-disabled="
      loading || refreshRequired || Boolean(unavailable) || !hasFunctionPermission(permission)
    "
    :confirm-button-text="ending ? `确认结束${name}归属` : `保存${name}归属`"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="submit"
  >
    <p>{{ member.realName || member.userName }} · {{ member.tenantName }} · 时区 {{ zone }}</p>
    <el-alert
      v-if="ending"
      title="归属结束后保留历史，不自动选择新的主要归属。岗位归属不影响角色或权限。"
      type="warning"
      :closable="false"
      show-icon
    />
    <el-alert
      v-else
      title="仅维护当前租户归属；设为主要时原主要归属自动降级。岗位归属不影响角色或权限。"
      type="info"
      :closable="false"
      show-icon
    />
    <el-alert v-if="unavailable" :title="unavailable" type="warning" :closable="false" show-icon />
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-button
      v-if="refreshRequired || error"
      v-resource-element="
        ending
          ? kind === 'organization'
            ? membersElements.endOrganization
            : membersElements.endPosition
          : relation
            ? kind === 'organization'
              ? membersElements.editOrganization
              : membersElements.editPosition
            : kind === 'organization'
              ? membersElements.organization
              : membersElements.position
      "
      :loading="loading"
      :disabled="submitting"
      @click="reload"
      >重新加载归属</el-button
    >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="submitting || loading || Boolean(unavailable) || refreshRequired"
      label-position="top"
      scroll-to-error
      class="member-relation-form"
      @submit.prevent
    >
      <el-form-item v-if="!ending" :label="`目标${name}`" prop="targetId">
        <PagedEntitySelect
          v-model="form.targetId"
          :resource_element="
            kind === 'organization'
              ? membersElements.organizationOptions
              : membersElements.positionOptions
          "
          :label="`目标${name}`"
          :selected-label="selectedLabel"
          :scope-key="`${member.tenantId}:${member.userId}:${kind}:${relation?.id ?? 'new'}`"
          :active="modelValue && !loading"
          :disabled="submitting || loading || Boolean(unavailable) || refreshRequired"
          :load-options="loadOptions"
          :placeholder="`选择启用${name}`"
        />
      </el-form-item>
      <p v-else>{{ name }}：{{ original?.name }}</p>
      <el-form-item v-if="!ending" label="归属类型">
        <el-switch v-model="form.primary" active-text="主要" inactive-text="辅助 / 兼职" />
      </el-form-item>
      <el-form-item v-if="!ending" :label="`有效开始时间（${zone}）`" prop="effectiveStart">
        <el-date-picker
          v-model="form.effectiveStart"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="请选择有效开始时间"
        />
      </el-form-item>
      <el-form-item :label="`${ending ? '结束' : '有效结束'}时间（${zone}）`">
        <el-date-picker
          v-model="form.effectiveEnd"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          :placeholder="ending ? '留空表示立即结束' : '留空表示长期有效'"
        />
      </el-form-item>
      <el-form-item v-if="!ending" label="备注">
        <el-input v-model="form.remarks" type="textarea" :rows="4" resize="none" />
      </el-form-item>
    </el-form>
  </FormDrawer>
</template>

<style scoped>
.member-relation-form {
  display: grid;
  gap: var(--spacing-2);
  margin-top: var(--spacing-3);
}
.member-relation-form :deep(.el-date-editor) {
  width: 100%;
}
</style>
