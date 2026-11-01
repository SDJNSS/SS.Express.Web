<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import FormDrawer from '@shared/components/FormDrawer.vue'
import type {
  ApplicationRecord,
  PermissionResourceRecord,
  PermissionResourceType,
  ResourceFormValue,
} from '../types/applicationResources'

interface ResourceOption {
  id: number
  appId: number
  label: string
  type: PermissionResourceType
}

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  applications: ApplicationRecord[]
  applicationId: number
  parentResource?: PermissionResourceRecord | undefined
  resource?: PermissionResourceRecord | undefined
  submit?: (value: ResourceFormValue) => Promise<void>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  action: [message: string]
}>()

const form = reactive<ResourceFormValue>({
  appId: 0,
  parentId: 0,
  resourceName: '',
  resourceType: 'module',
  routePath: '',
  component: '',
  permissionCode: '',
  icon: '',
  httpMethod: '',
  apiPath: '',
  isVisible: false,
  sortOrder: 10,
  status: 'active',
  remarks: '',
})
const submitting = ref(false)
const initialValue = ref('')
const submitError = ref('')

function childTypes(parent?: PermissionResourceRecord): PermissionResourceType[] {
  if (!parent) return ['module']
  if (parent.resourceType === 'module') return ['menu']
  if (parent.resourceType === 'menu' || parent.resourceType === 'page') {
    return ['page', 'function']
  }
  return []
}

function canOwnChildren(type: PermissionResourceType, children: PermissionResourceRecord[]) {
  const allowed = childTypes({ resourceType: type } as PermissionResourceRecord)
  return children.every((child) => allowed.includes(child.resourceType))
}

function flatten(nodes: PermissionResourceRecord[], depth = 0): ResourceOption[] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      appId: node.appId,
      label: `${'—'.repeat(depth)}${node.resourceName} · ${node.resourceCode}`,
      type: node.resourceType,
    },
    ...flatten(node.children, depth + 1),
  ])
}

function descendantIds(node?: PermissionResourceRecord): Set<number> {
  const ids = new Set<number>()
  const visit = (nodes: PermissionResourceRecord[]) => {
    for (const child of nodes) {
      ids.add(child.id)
      visit(child.children)
    }
  }
  if (node) visit(node.children)
  return ids
}

const selectedApplication = computed(() =>
  props.applications.find((application) => application.id === form.appId),
)
const isDefaultModule = computed(() => {
  const record = props.resource
  const application = props.applications.find((item) => item.id === record?.appId)
  return Boolean(
    props.mode === 'edit' &&
    record &&
    application &&
    record.resourceType === 'module' &&
    record.parentId === 0 &&
    record.resourceCode === application.appCode &&
    record.resourceName === application.appName,
  )
})
const resourceTypeOptions = computed<PermissionResourceType[]>(() => {
  if (props.mode === 'create') return childTypes(props.parentResource)
  if (isDefaultModule.value) return ['module']
  const record = props.resource
  return (['module', 'menu', 'page', 'function'] as PermissionResourceType[]).filter((type) =>
    canOwnChildren(type, record?.children ?? []),
  )
})
const parentOptions = computed(() => {
  const application = selectedApplication.value
  if (!application || form.resourceType === 'module') return []
  const expectedTypes: PermissionResourceType[] =
    form.resourceType === 'menu'
      ? ['module']
      : form.resourceType === 'page' || form.resourceType === 'function'
        ? ['menu', 'page']
        : []
  const forbidden = descendantIds(props.resource)
  if (props.resource) forbidden.add(props.resource.id)
  return flatten(application.modules).filter(
    (option) => expectedTypes.includes(option.type) && !forbidden.has(option.id),
  )
})
const pageBindingValid = computed(() =>
  ['menu', 'page'].includes(form.resourceType)
    ? Boolean(form.routePath.trim() && form.component.trim() && form.permissionCode.trim())
    : true,
)
const functionBindingValid = computed(() =>
  form.resourceType === 'function'
    ? Boolean(form.permissionCode.trim() && form.httpMethod.trim() && form.apiPath.trim())
    : true,
)
const parentValid = computed(() =>
  form.resourceType === 'module'
    ? form.parentId === 0
    : parentOptions.value.some((option) => option.id === form.parentId),
)
const valid = computed(
  () =>
    form.appId > 0 &&
    form.resourceName.trim().length > 0 &&
    parentValid.value &&
    pageBindingValid.value &&
    functionBindingValid.value,
)
const dirty = computed(() => JSON.stringify(form) !== initialValue.value)
const structureChanged = computed(
  () =>
    props.mode === 'edit' &&
    props.resource &&
    (props.resource.appId !== form.appId ||
      props.resource.parentId !== form.parentId ||
      props.resource.resourceType !== form.resourceType),
)
const title = computed(() => {
  if (props.mode === 'edit') return `编辑资源 · ${props.resource?.resourceName ?? ''}`
  return `新增 ${resourceTypeLabel(form.resourceType)}`
})

function resourceTypeLabel(type: PermissionResourceType) {
  return { module: 'Module', menu: 'Menu', page: 'Page', function: 'Function' }[type]
}

function resetForm() {
  const record = props.resource
  const resourceType =
    props.mode === 'edit' && record
      ? record.resourceType
      : (childTypes(props.parentResource)[0] ?? 'module')
  Object.assign(form, {
    appId: props.mode === 'edit' && record ? record.appId : props.applicationId,
    parentId:
      props.mode === 'edit' && record
        ? record.parentId
        : resourceType === 'module'
          ? 0
          : (props.parentResource?.id ?? 0),
    resourceName: props.mode === 'edit' && record ? record.resourceName : '',
    resourceType,
    routePath: props.mode === 'edit' && record ? record.routePath : '',
    component: props.mode === 'edit' && record ? record.component : '',
    permissionCode: props.mode === 'edit' && record ? record.permissionCode : '',
    icon: props.mode === 'edit' && record ? record.icon : '',
    httpMethod: props.mode === 'edit' && record ? record.httpMethod : '',
    apiPath: props.mode === 'edit' && record ? record.apiPath : '',
    isVisible: props.mode === 'edit' && record ? record.isVisible : resourceType === 'menu',
    sortOrder: props.mode === 'edit' && record ? record.sortOrder : 10,
    status: props.mode === 'edit' && record ? record.status : 'active',
    remarks: props.mode === 'edit' && record ? record.remarks : '',
  })
  initialValue.value = JSON.stringify(form)
  submitError.value = ''
}

function normalizeTypeFields() {
  if (form.resourceType === 'module') {
    form.parentId = 0
    form.routePath = ''
    form.component = ''
    form.permissionCode = ''
    form.httpMethod = ''
    form.apiPath = ''
    form.isVisible = false
    return
  }
  if (!parentOptions.value.some((option) => option.id === form.parentId)) {
    form.parentId = parentOptions.value[0]?.id ?? 0
  }
  if (form.resourceType === 'menu' || form.resourceType === 'page') {
    form.httpMethod = ''
    form.apiPath = ''
    form.isVisible =
      form.resourceType === 'menu'
        ? props.mode === 'edit' && props.resource?.resourceType === 'menu'
          ? props.resource.isVisible
          : true
        : false
    return
  }
  form.routePath = ''
  form.component = ''
  form.isVisible = false
}

async function save() {
  if (!valid.value || !dirty.value || submitting.value) return
  submitting.value = true
  submitError.value = ''
  try {
    if (props.submit) await props.submit({ ...form })
    emit(
      'action',
      `${props.mode === 'create' ? '新增' : '编辑'} ${resourceTypeLabel(form.resourceType)} 候选已提交：${form.resourceName}`,
    )
    initialValue.value = JSON.stringify(form)
    emit('update:modelValue', false)
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : '资源保存失败，请重试'
  } finally {
    submitting.value = false
  }
}

function discard() {
  resetForm()
}

watch(
  () =>
    [
      props.modelValue,
      props.mode,
      props.applicationId,
      props.resource?.id,
      props.parentResource?.id,
    ] as const,
  ([visible]) => {
    if (visible) resetForm()
  },
)
watch(
  () => [form.resourceType, form.appId] as const,
  () => {
    if (props.modelValue) normalizeTypeFields()
  },
)
</script>

<template>
  <FormDrawer
    :model-value="modelValue"
    :title="title"
    size="720"
    :submitting="submitting"
    :dirty="dirty"
    :confirm-disabled="!valid || !dirty"
    :confirm-button-text="mode === 'create' ? '创建资源' : '保存修改'"
    discard-title="放弃未保存的资源信息？"
    discard-description="当前输入和尚未确认的结构调整将被清除。"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="save"
    @discard="discard"
  >
    <el-alert
      v-if="isDefaultModule"
      title="这是默认 Module。编码由系统维护，名称必须通过编辑 App 同步修改。"
      type="info"
      :closable="false"
      show-icon
    />
    <el-alert
      v-else-if="structureChanged"
      title="所属 App、资源类型或父节点已变化；正式保存前必须确认完整分支仍符合资源层级规则。"
      type="warning"
      :closable="false"
      show-icon
    />
    <el-alert
      v-else-if="mode === 'create'"
      title="资源编码由服务端生成；新资源不会自动新增角色直接授权。"
      type="info"
      :closable="false"
      show-icon
    />

    <el-alert v-if="submitError" :title="submitError" type="error" :closable="false" show-icon />

    <el-form class="resource-form" label-position="top" :model="form" novalidate>
      <div class="resource-form__grid">
        <el-form-item label="所属 App" required>
          <el-select
            v-model="form.appId"
            aria-label="所属 App"
            :disabled="mode === 'create' || isDefaultModule"
          >
            <el-option
              v-for="application in applications"
              :key="application.id"
              :label="`${application.appName} · ${application.appCode}`"
              :value="application.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="资源类型" required>
          <el-select
            v-model="form.resourceType"
            aria-label="资源类型"
            :disabled="isDefaultModule || resourceTypeOptions.length <= 1"
          >
            <el-option
              v-for="type in resourceTypeOptions"
              :key="type"
              :label="resourceTypeLabel(type)"
              :value="type"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="父节点" required>
          <el-input
            v-if="form.resourceType === 'module'"
            model-value="App 根节点 · parent_id = 0"
            aria-label="父节点"
            disabled
          />
          <el-select v-else v-model="form.parentId" aria-label="父节点" filterable>
            <el-option
              v-for="option in parentOptions"
              :key="option.id"
              :label="option.label"
              :value="option.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="展示排序" required>
          <el-input-number
            v-model="form.sortOrder"
            aria-label="展示排序"
            :min="0"
            :max="9999"
            controls-position="right"
          />
        </el-form-item>
        <el-form-item v-if="mode === 'edit'" label="资源编码">
          <el-input :model-value="resource?.resourceCode ?? ''" aria-label="资源编码" disabled />
        </el-form-item>
        <el-form-item label="资源名称" required>
          <el-input v-model="form.resourceName" aria-label="资源名称" :disabled="isDefaultModule" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" aria-label="图标" placeholder="例如 mdi:routes" />
        </el-form-item>
        <el-form-item v-if="mode === 'create'" label="初始状态" required>
          <el-select v-model="form.status" aria-label="初始状态">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="当前状态">
          <el-input
            :model-value="resource?.status === 'active' ? '启用' : '停用'"
            aria-label="当前状态"
            disabled
          />
        </el-form-item>
      </div>

      <div
        v-if="form.resourceType === 'menu' || form.resourceType === 'page'"
        class="resource-form__section"
      >
        <h3>{{ resourceTypeLabel(form.resourceType) }} 页面绑定</h3>
        <div class="resource-form__grid">
          <el-form-item label="路由地址" required>
            <el-input
              v-model="form.routePath"
              aria-label="路由地址"
              placeholder="例如 /tms/orders"
            />
          </el-form-item>
          <el-form-item label="页面组件" required>
            <el-input
              v-model="form.component"
              aria-label="页面组件"
              placeholder="例如 tms/orders/pages/OrderListPage"
            />
          </el-form-item>
          <el-form-item
            :label="form.resourceType === 'menu' ? '导航权限编码' : '页面权限编码'"
            required
          >
            <el-input
              v-model="form.permissionCode"
              :aria-label="form.resourceType === 'menu' ? '导航权限编码' : '页面权限编码'"
            />
          </el-form-item>
          <el-form-item v-if="form.resourceType === 'menu'" label="导航显示">
            <el-switch
              v-model="form.isVisible"
              aria-label="导航显示"
              active-text="显示"
              inactive-text="隐藏"
            />
          </el-form-item>
        </div>
      </div>

      <div v-if="form.resourceType === 'function'" class="resource-form__section">
        <h3>Function 权限与接口绑定</h3>
        <div class="resource-form__grid">
          <el-form-item label="功能权限编码" required>
            <el-input v-model="form.permissionCode" aria-label="功能权限编码" />
          </el-form-item>
          <el-form-item label="请求方式" required>
            <el-select v-model="form.httpMethod" aria-label="请求方式">
              <el-option label="GET" value="GET" />
              <el-option label="POST" value="POST" />
              <el-option label="PUT" value="PUT" />
              <el-option label="PATCH" value="PATCH" />
              <el-option label="DELETE" value="DELETE" />
            </el-select>
          </el-form-item>
          <el-form-item label="接口路径" required>
            <el-input
              v-model="form.apiPath"
              aria-label="接口路径"
              placeholder="例如 /tms-admin/Order/Query"
            />
          </el-form-item>
        </div>
      </div>

      <el-form-item label="备注">
        <el-input
          v-model="form.remarks"
          aria-label="备注"
          type="textarea"
          :rows="3"
          resize="none"
        />
      </el-form-item>
      <p v-if="mode === 'edit'" class="resource-form__meta">
        ID {{ resource?.id }} · 版本 {{ resource?.version }}。状态由独立启停操作维护。
      </p>
    </el-form>
  </FormDrawer>
</template>

<style scoped lang="scss">
.resource-form {
  display: grid;
  gap: var(--spacing-4);
  margin-top: var(--spacing-5);
}

.resource-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--spacing-4);
}

.resource-form__section {
  padding: var(--spacing-4);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-default);
}

.resource-form__section h3 {
  margin: 0 0 var(--spacing-4);
  color: var(--text-primary);
  font-size: var(--font-size-base);
}

.resource-form__meta {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}
</style>
