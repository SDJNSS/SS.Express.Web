<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import FormDialog from '@shared/components/FormDialog.vue'
import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { membersElements, resourceRegistry } from '../iam-resource.registry'
import { memberEffective } from '../adapters/memberRelationPolicy'
import type { MembershipRecord } from '../types/foundation'
import type { MemberAdminChangeValue } from '../types/memberMaintenance'

const props = defineProps<{
  modelValue: boolean
  member: MembershipRecord
  queryMember?: ((member: MembershipRecord) => Promise<MembershipRecord>) | undefined
  changeAdmin?: ((value: MemberAdminChangeValue) => Promise<void>) | undefined
  createRequestId?: (() => string) | undefined
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>()
const snapshot = ref<MembershipRecord>()
const intent = ref<MemberAdminChangeValue>()
const loading = ref(false)
const submitting = ref(false)
const error = ref('')
const refreshRequired = ref(false)
let generation = 0
const appoint = computed(() => intent.value?.appoint ?? !props.member.isTenantAdmin)
const permission = computed(() =>
  appoint.value
    ? resourceRegistry.members.buttons.appointAdmin.resource_code
    : resourceRegistry.members.buttons.cancelAdmin.resource_code,
)
const { hasFunctionPermission } = useEffectivePermissions()
const unavailable = computed(() =>
  snapshot.value && !memberEffective(snapshot.value) ? '仅可任命或取消当前租户的有效成员' : '',
)

async function load() {
  const run = ++generation
  loading.value = true
  refreshRequired.value = true
  error.value = ''
  intent.value = undefined
  try {
    const fresh = props.queryMember ? await props.queryMember(props.member) : props.member
    if (run !== generation || !props.modelValue) return
    snapshot.value = fresh
    intent.value = {
      tenantId: fresh.tenantId,
      userId: fresh.userId,
      memberVersion: fresh.version,
      requestId: props.createRequestId?.() ?? `preview-admin-${run}`,
      appoint: !props.member.isTenantAdmin,
    }
    refreshRequired.value = false
  } catch (cause) {
    if (run === generation)
      error.value = cause instanceof Error ? cause.message : '成员状态加载失败'
  } finally {
    if (run === generation) loading.value = false
  }
}

async function submit() {
  if (
    !intent.value ||
    submitting.value ||
    loading.value ||
    refreshRequired.value ||
    unavailable.value ||
    !hasFunctionPermission(permission.value)
  )
    return
  submitting.value = true
  error.value = ''
  const run = generation
  try {
    if (props.changeAdmin) await props.changeAdmin({ ...intent.value })
    if (run !== generation || !props.modelValue) return
    emit('saved')
    emit('update:modelValue', false)
  } catch (cause) {
    if (run !== generation) return
    error.value = cause instanceof Error ? cause.message : '管理员身份更新失败'
    // Uncertain transport outcomes may be retried with exactly the same key/payload.
    // A domain/version denial instead requires an explicit fresh snapshot and new intent.
    const failure =
      cause instanceof Error
        ? (cause as Error & { category?: string; reasonCode?: string })
        : undefined
    refreshRequired.value = !(failure?.category === 'network' || failure?.category === 'system')
    if (failure?.reasonCode === 'IAM_LAST_EFFECTIVE_TENANT_ADMIN') {
      error.value = '不能取消最后一名有效管理员，请先任命其他有效成员。'
    }
  } finally {
    if (run === generation) submitting.value = false
  }
}

watch(
  () => [props.modelValue, props.member.userId, props.member.tenantId],
  () => {
    generation += 1
    snapshot.value = undefined
    intent.value = undefined
    submitting.value = false
    if (props.modelValue) void load()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  generation += 1
})
</script>

<template>
  <FormDialog
    :model-value="modelValue"
    :resource_element="appoint ? membersElements.appointAdmin : membersElements.cancelAdmin"
    :title="appoint ? '任命管理员' : '取消管理员'"
    :submitting="submitting"
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
    :confirm-disabled="
      loading || refreshRequired || Boolean(unavailable) || !hasFunctionPermission(permission)
    "
    :confirm-button-text="appoint ? '确认任命' : '确认取消管理员'"
    :confirm-type="appoint ? 'primary' : 'danger'"
    @update:model-value="!submitting && emit('update:modelValue', $event)"
    @confirm="submit"
  >
    <p>{{ member.realName || '未设置姓名' }} · {{ member.tenantName }}</p>
    <p>当前身份：{{ (snapshot ?? member).isTenantAdmin ? '租户管理员' : '普通成员' }}</p>
    <p>
      {{
        appoint
          ? '仅赋予当前租户管理员身份，不调整 SA 或其他角色，也不修改其他租户关系。'
          : '仅取消当前租户管理员身份，保留成员关系及既有角色；必须保留至少一名有效管理员。'
      }}
    </p>
    <p>若操作本人，成功后将重新加载当前会话的菜单与按钮权限。</p>
    <el-alert v-if="unavailable" :title="unavailable" type="warning" :closable="false" show-icon />
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-button
      v-resource-element="appoint ? membersElements.appointAdmin : membersElements.cancelAdmin"
      :loading="loading"
      :disabled="submitting"
      @click="load"
      >重新加载成员状态</el-button
    >
    <p v-if="error && !refreshRequired">
      请求结果可能未确认。再次确认将使用原请求号与版本安全重试；重新加载则建立新的操作。
    </p>
  </FormDialog>
</template>
