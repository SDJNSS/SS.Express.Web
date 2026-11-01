<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { EntityId } from '@shared/types/entityId'
import type {
  PagedEntityLoader,
  PagedEntityQuery,
  PagedEntityOption,
} from '@shared/types/pagedOptions'
import FormDrawer from '@shared/components/FormDrawer.vue'
import PagedEntitySelect from '@shared/components/PagedEntitySelect.vue'
import {
  emptySystemResourceForm,
  resourceParentTypes,
  systemResourceForm,
} from '../adapters/systemResourceForm'
import { catalogElements } from '../iam-resource.registry'
import {
  isUnknownPermissionGovernanceMutation,
  permissionGovernanceErrorMessage,
} from '../composables/permissionGovernanceFeedback'
import type {
  PermissionGovernanceApp,
  PermissionResourceType,
  SystemResourceFormValue,
  SystemResourceRecord,
} from '../types/permissionGovernance'

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  source?: SystemResourceRecord | undefined
  apps: PermissionGovernanceApp[]
  allowed: boolean
  loadParents?: (
    appId: EntityId,
    type: PermissionResourceType,
    excludedId: EntityId | undefined,
    query: PagedEntityQuery,
  ) => Promise<{ items: PagedEntityOption<EntityId>[]; total: number }>
  submitResource?:
    | ((
        value: SystemResourceFormValue,
        mode: 'create' | 'edit',
        source?: SystemResourceRecord,
        reusePendingRequestId?: boolean,
      ) => Promise<SystemResourceRecord>)
    | undefined
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [record?: SystemResourceRecord]
}>()
const formRef = ref<FormInstance>()
const form = reactive<SystemResourceFormValue>(emptySystemResourceForm())
const initial = ref('')
const submitting = ref(false)
const error = ref('')
const unknownResult = ref(false)
const parentType = ref<PermissionResourceType>('MODULE')
const parentTypes = computed(() => resourceParentTypes(form.resourceType))
const routed = computed(() => form.resourceType === 'MENU' || form.resourceType === 'BUTTON_PAGE')
const backend = computed(() => form.resourceType === 'FUNCTION')
const locked = computed(() => submitting.value || unknownResult.value || !props.allowed)
const dirty = computed(() => JSON.stringify(form) !== initial.value)
const rules: FormRules = {
  appId: [{ required: true, message: '请选择所属 App', trigger: 'change' }],
  resourceName: [
    { required: true, whitespace: true, message: '请填写资源名称', trigger: 'blur' },
    { max: 100, message: '资源名称不能超过 100 个字符', trigger: 'blur' },
  ],
  parentId: [
    {
      validator: (_rule, value, callback) =>
        callback(parentTypes.value.length && !value ? new Error('请选择父级资源') : undefined),
      trigger: 'change',
    },
  ],
  routePath: [
    {
      validator: (_rule, value: string, callback) =>
        callback(
          routed.value && !value.trim().startsWith('/')
            ? new Error('路由地址必须以 / 开头')
            : undefined,
        ),
      trigger: 'blur',
    },
  ],
  component: [
    {
      validator: (_rule, value: string, callback) =>
        callback(
          routed.value && !value.trim() ? new Error('请填写已实现的页面组件路径') : undefined,
        ),
      trigger: 'blur',
    },
  ],
  apiPath: [
    {
      validator: (_rule, value: string, callback) =>
        callback(
          backend.value && !value.trim().startsWith('/')
            ? new Error('接口路径必须以 / 开头')
            : undefined,
        ),
      trigger: 'blur',
    },
  ],
  httpMethod: [
    {
      validator: (_rule, value: string, callback) =>
        callback(
          backend.value && !/^[A-Za-z]+$/.test(value.trim())
            ? new Error('请填写单一 HTTP Method')
            : undefined,
        ),
      trigger: 'blur',
    },
  ],
}

const loadOptions: PagedEntityLoader<EntityId> = async (query) => {
  if (!form.appId || !props.loadParents) return { items: [], total: 0 }
  return props.loadParents(form.appId, parentType.value, props.source?.resourceId, query)
}

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible) return
    Object.assign(form, props.source ? systemResourceForm(props.source) : emptySystemResourceForm())
    parentType.value =
      props.source?.parentResourceType ?? resourceParentTypes(form.resourceType)[0] ?? 'MODULE'
    initial.value = JSON.stringify(form)
    error.value = ''
    unknownResult.value = false
    await nextTick()
    formRef.value?.clearValidate()
  },
  { immediate: true },
)

function changeType() {
  form.parentId = undefined
  form.routePath = ''
  form.component = ''
  form.apiPath = ''
  parentType.value = parentTypes.value[0] ?? 'MODULE'
  formRef.value?.clearValidate()
}

async function save(retry = false) {
  if (submitting.value || !props.allowed || (unknownResult.value && !retry)) return
  if (!retry && !(await formRef.value?.validate().catch(() => false))) {
    error.value = '请检查标出的必填项。'
    await nextTick()
    formRef.value?.$el.querySelector('.is-error input')?.focus()
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const record = props.submitResource
      ? await props.submitResource({ ...form }, props.mode, props.source, retry)
      : undefined
    emit('update:modelValue', false)
    emit('saved', record)
  } catch (cause) {
    unknownResult.value = isUnknownPermissionGovernanceMutation(cause)
    error.value = unknownResult.value
      ? '提交结果未知。填写内容已保留；可用同一请求标识重试，或取消后刷新核对。'
      : permissionGovernanceErrorMessage(cause, '资源提交失败，填写内容已保留')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <FormDrawer
    :model-value="modelValue"
    :resource_element="mode === 'create' ? catalogElements.createForm : catalogElements.editForm"
    :title="mode === 'create' ? '新增资源' : '编辑资源'"
    size="680"
    :submitting="submitting"
    :confirm-disabled="locked"
    :confirm-button-text="mode === 'create' ? '创建资源' : '保存修改'"
    :dirty="dirty"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="save()"
  >
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-alert
      v-if="!allowed"
      title="当前账号已无权维护资源，填写内容已保留。"
      type="warning"
      :closable="false"
    />
    <el-button
      v-if="unknownResult"
      v-resource-element="mode === 'create' ? catalogElements.createForm : catalogElements.editForm"
      type="primary"
      :loading="submitting"
      :disabled="!allowed"
      @click="save(true)"
      >使用原请求重试</el-button
    >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="locked"
      label-position="top"
      novalidate
      class="resource-form"
      @submit.prevent="save()"
    >
      <el-form-item label="所属 App" prop="appId">
        <el-select v-model="form.appId" :disabled="mode === 'edit'" placeholder="请选择 App">
          <el-option v-for="app in apps" :key="app.id" :label="app.appName" :value="app.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="资源类型">
        <el-select v-model="form.resourceType" :disabled="mode === 'edit'" @change="changeType">
          <el-option
            v-for="type in ['MODULE', 'MENU', 'BUTTON', 'BUTTON_PAGE', 'FUNCTION']"
            :key="type"
            :label="type === 'BUTTON_PAGE' ? 'ButtonPage' : type"
            :value="type"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="资源编码" class="resource-form__wide">
        <span>{{ source?.resourceCode || '创建后由系统自动生成' }}</span>
      </el-form-item>
      <el-form-item label="资源名称" prop="resourceName" class="resource-form__wide">
        <el-input v-model="form.resourceName" maxlength="100" placeholder="请输入资源名称" />
      </el-form-item>
      <el-form-item v-if="parentTypes.length > 1" label="父级类型">
        <el-select v-model="parentType"
          ><el-option
            v-for="type in parentTypes"
            :key="type"
            :label="type === 'BUTTON_PAGE' ? 'ButtonPage' : 'Menu'"
            :value="type"
        /></el-select>
      </el-form-item>
      <el-form-item
        v-if="parentTypes.length"
        label="父级资源"
        prop="parentId"
        :class="{ 'resource-form__wide': parentTypes.length === 1 }"
      >
        <PagedEntitySelect
          v-model="form.parentId"
          :resource_element="
            mode === 'create' ? catalogElements.createForm : catalogElements.editForm
          "
          :selected-label="source?.parentResourceName"
          :scope-key="`${form.appId}:${parentType}`"
          :active="modelValue && !!form.appId"
          :disabled="locked || !form.appId"
          :load-options="loadOptions"
          label="父级资源"
          placeholder="搜索并选择父级资源"
        />
      </el-form-item>
      <el-form-item v-if="routed" label="路由地址" prop="routePath" class="resource-form__wide"
        ><el-input v-model="form.routePath" maxlength="2000" placeholder="以 / 开头的已实现路由"
      /></el-form-item>
      <el-form-item v-if="routed" label="页面组件" prop="component" class="resource-form__wide"
        ><el-input v-model="form.component" maxlength="2000" placeholder="已实现的页面组件路径"
      /></el-form-item>
      <el-form-item v-if="backend" label="HTTP Method" prop="httpMethod"
        ><el-input v-model="form.httpMethod" maxlength="20" placeholder="如 POST"
      /></el-form-item>
      <el-form-item v-if="backend" label="访问语义"
        ><el-select v-model="form.functionAccessMode"
          ><el-option label="读取 read" value="read" /><el-option
            label="写入 write"
            value="write" /></el-select
      ></el-form-item>
      <el-form-item v-if="backend" label="API Path" prop="apiPath" class="resource-form__wide"
        ><el-input
          v-model="form.apiPath"
          maxlength="2000"
          placeholder="以 / 开头的完整服务接口路径"
      /></el-form-item>
      <el-form-item v-if="backend" label="鉴权类别"
        ><el-select v-model="form.authorizationCategory"
          ><el-option
            v-for="category in [
              'business',
              'public',
              'session_self_service',
              'restricted_automation',
              'internal',
              'webhook',
            ]"
            :key="category"
            :value="category"
            :label="category" /></el-select
      ></el-form-item>
      <el-form-item v-if="backend" label="允许组合进权限"
        ><el-switch
          v-model="form.isComposable"
          :disabled="form.authorizationCategory !== 'business'"
      /></el-form-item>
      <el-form-item label="图标"
        ><el-input v-model="form.icon" maxlength="500" placeholder="可选图标标识"
      /></el-form-item>
      <el-form-item label="排序"
        ><el-input-number
          v-model="form.sortOrder"
          :precision="0"
          :min="-2147483648"
          :max="2147483647"
      /></el-form-item>
      <el-form-item label="生命周期"
        ><el-select v-model="form.lifecycle"
          ><el-option label="有效 active" value="active" /><el-option
            label="弃用 deprecated"
            value="deprecated" /><el-option label="退役 retired" value="retired" /></el-select
      ></el-form-item>
      <el-form-item label="导航显示"
        ><span
          >{{ form.resourceType === 'MENU' ? '显示' : '隐藏' }}（由资源类型确定）</span
        ></el-form-item
      >
      <el-form-item label="备注" class="resource-form__wide"
        ><el-input v-model="form.remarks" type="textarea" :rows="3" resize="none"
      /></el-form-item>
      <p class="resource-form__wide resource-form__note">
        仅维护资源事实，不创建页面代码、不分配权限包或角色授权。编辑时所属 App、资源类型和编码不变。
      </p>
    </el-form>
  </FormDrawer>
</template>

<style scoped lang="scss">
.resource-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--spacing-2) var(--spacing-3);
  margin-top: var(--spacing-3);
}
.resource-form :deep(.el-form-item) {
  min-width: 0;
  margin-bottom: 0;
}
.resource-form :deep(.el-select),
.resource-form :deep(.el-input-number) {
  width: 100%;
}
.resource-form__wide {
  grid-column: 1 / -1;
}
.resource-form__note {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}
</style>
