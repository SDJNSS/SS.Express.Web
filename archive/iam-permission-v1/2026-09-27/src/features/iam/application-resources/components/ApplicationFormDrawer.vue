<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import FormDrawer from '@shared/components/FormDrawer.vue'
import type { ApplicationFormValue, ApplicationRecord } from '../types/applicationResources'

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  application?: ApplicationRecord | undefined
  submit?: (value: ApplicationFormValue) => Promise<void>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  action: [message: string]
}>()

const form = reactive<ApplicationFormValue>({
  appName: '',
  description: '',
  icon: '',
  routePrefix: '',
  status: 'active',
  remarks: '',
})
const submitting = ref(false)
const initialValue = ref('')
const submitError = ref('')

const title = computed(() =>
  props.mode === 'create' ? '新增 App' : `编辑 App · ${props.application?.appName ?? ''}`,
)
const currentValue = computed(() => JSON.stringify(form))
const dirty = computed(() => currentValue.value !== initialValue.value)
const valid = computed(
  () => form.appName.trim().length > 0 && form.routePrefix.trim().startsWith('/'),
)

function resetForm() {
  const application = props.application
  Object.assign(form, {
    appName: props.mode === 'edit' ? (application?.appName ?? '') : '',
    description: props.mode === 'edit' ? (application?.description ?? '') : '',
    icon: props.mode === 'edit' ? (application?.icon ?? '') : '',
    routePrefix: props.mode === 'edit' ? (application?.routePrefix ?? '') : '',
    status: props.mode === 'edit' ? (application?.status ?? 'active') : 'active',
    remarks: props.mode === 'edit' ? (application?.remarks ?? '') : '',
  })
  initialValue.value = JSON.stringify(form)
  submitError.value = ''
}

async function save() {
  if (!valid.value || !dirty.value || submitting.value) return
  submitting.value = true
  submitError.value = ''
  try {
    if (props.submit) await props.submit({ ...form })
    emit(
      'action',
      props.mode === 'create'
        ? `已提交新增 App 候选：${form.appName}`
        : `已提交 App 修改候选：${form.appName}`,
    )
    initialValue.value = JSON.stringify(form)
    emit('update:modelValue', false)
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'App 保存失败，请重试'
  } finally {
    submitting.value = false
  }
}

function discard() {
  resetForm()
}

watch(
  () => [props.modelValue, props.mode, props.application?.id] as const,
  ([visible]) => {
    if (visible) resetForm()
  },
)
</script>

<template>
  <FormDrawer
    :model-value="modelValue"
    :title="title"
    size="640"
    :submitting="submitting"
    :dirty="dirty"
    :confirm-disabled="!valid || !dirty"
    :confirm-button-text="mode === 'create' ? '创建 App' : '保存修改'"
    discard-title="放弃未保存的 App 信息？"
    discard-description="当前输入尚未保存，关闭后将无法恢复。"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="save"
    @discard="discard"
  >
    <el-alert
      v-if="mode === 'create'"
      title="App 编码由服务端生成；创建成功后会在同一事务中生成默认 Module。"
      type="info"
      :closable="false"
      show-icon
    />
    <el-alert
      v-else
      title="App 编码由系统维护且不可编辑；修改名称会同步默认 Module，修改路由前缀会影响应用入口。"
      type="warning"
      :closable="false"
      show-icon
    />

    <el-alert v-if="submitError" :title="submitError" type="error" :closable="false" show-icon />

    <el-form class="application-form" label-position="top" :model="form" novalidate>
      <div class="application-form__grid">
        <el-form-item v-if="mode === 'edit'" label="App 编码">
          <el-input :model-value="application?.appCode ?? ''" aria-label="App 编码" disabled />
        </el-form-item>
        <el-form-item label="App 名称" required>
          <el-input v-model="form.appName" aria-label="App 名称" placeholder="例如 运输管理" />
        </el-form-item>
        <el-form-item label="路由前缀" required>
          <el-input v-model="form.routePrefix" aria-label="路由前缀" placeholder="例如 /tms" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" aria-label="图标" placeholder="例如 mdi:routes" />
        </el-form-item>
      </div>
      <el-form-item v-if="mode === 'create'" label="初始状态" required>
        <el-radio-group v-model="form.status" aria-label="初始状态">
          <el-radio value="active">启用</el-radio>
          <el-radio value="disabled">停用</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-else label="当前状态">
        <el-input
          :model-value="application?.status === 'active' ? '启用' : '停用'"
          aria-label="当前状态"
          disabled
        />
      </el-form-item>
      <el-form-item label="说明">
        <el-input
          v-model="form.description"
          aria-label="说明"
          type="textarea"
          :rows="3"
          placeholder="说明 App 的业务职责"
        />
      </el-form-item>
      <el-form-item label="备注">
        <el-input
          v-model="form.remarks"
          aria-label="备注"
          type="textarea"
          :rows="3"
          placeholder="可选的维护备注"
        />
      </el-form-item>
      <p v-if="mode === 'edit'" class="application-form__meta">
        ID {{ application?.id }} · 版本 {{ application?.version }}。状态由独立启停操作维护。
      </p>
    </el-form>
  </FormDrawer>
</template>

<style scoped lang="scss">
.application-form {
  display: grid;
  gap: var(--spacing-4);
  margin-top: var(--spacing-5);
}

.application-form__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 var(--spacing-4);
}

.application-form__meta {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}
</style>
