<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import FormDialog from '@shared/components/FormDialog.vue'
import type { CatalogDeleteImpact, CatalogTarget } from '../types/applicationResources'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    mode: 'status' | 'delete'
    target?: CatalogTarget | undefined
    impact: CatalogDeleteImpact
    authoritativeImpactReady?: boolean
    allowStructuralDelete?: boolean
    errorMessage?: string
    submitting?: boolean
  }>(),
  {
    target: undefined,
    authoritativeImpactReady: false,
    allowStructuralDelete: false,
    errorMessage: '',
    submitting: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const confirmationCode = ref('')
const isDisabling = computed(() => props.mode === 'status' && props.target?.status === 'active')
const targetLabel = computed(() =>
  props.target?.targetType === 'application'
    ? 'App'
    : ({ module: 'Module', menu: 'Menu', page: 'Page', function: 'Function' } as const)[
        props.target?.resourceType ?? 'function'
      ],
)
const title = computed(() => {
  if (props.mode === 'delete') return `删除 ${targetLabel.value}`
  return `${isDisabling.value ? '停用' : '启用'} ${targetLabel.value}`
})
const codeMatches = computed(() => confirmationCode.value === props.target?.code)
const deleteDisabled = computed(
  () =>
    !codeMatches.value ||
    (!props.authoritativeImpactReady && !props.allowStructuralDelete) ||
    Boolean(props.impact.isLastModule) ||
    props.submitting,
)
const confirmDisabled = computed(() =>
  props.mode === 'delete' ? deleteDisabled.value : props.submitting,
)

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) confirmationCode.value = ''
  },
)
</script>

<template>
  <FormDialog
    :model-value="modelValue"
    :title="title"
    width="600"
    :submitting="submitting"
    :confirm-disabled="confirmDisabled"
    :confirm-type="mode === 'delete' || isDisabling ? 'danger' : 'success'"
    :confirm-button-text="
      mode === 'delete' ? `确认删除 ${targetLabel}` : isDisabling ? '确认停用' : '确认启用'
    "
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="emit('confirm')"
  >
    <div class="impact-dialog">
      <div class="impact-dialog__target">
        <div>
          <span>操作对象</span>
          <strong>{{ target?.name }}</strong>
        </div>
        <code>{{ target?.code }}</code>
      </div>

      <div class="impact-dialog__metrics" aria-label="结构影响">
        <div>
          <span>Module</span><strong>{{ impact.moduleCount }}</strong>
        </div>
        <div>
          <span>Menu</span><strong>{{ impact.menuCount }}</strong>
        </div>
        <div>
          <span>Page</span><strong>{{ impact.pageCount }}</strong>
        </div>
        <div>
          <span>Function</span><strong>{{ impact.functionCount }}</strong>
        </div>
        <div>
          <span>角色直接授权</span>
          <strong>{{
            impact.roleGrantCount ?? (allowStructuralDelete ? '提交后返回' : '待查询')
          }}</strong>
        </div>
      </div>

      <template v-if="mode === 'status'">
        <el-alert
          v-if="isDisabling"
          :title="
            target?.targetType === 'application'
              ? '停用 App 后全部资源当前无效，但不会改变资源自身状态或角色授权。'
              : '停用父资源后全部后代当前无效，但不会改变后代自身状态或角色授权。'
          "
          type="warning"
          :closable="false"
          show-icon
        />
        <el-alert
          v-else
          title="重新启用不会自动启用自身状态为停用的后代；结果以刷新后的完整目录为准。"
          type="info"
          :closable="false"
          show-icon
        />
      </template>

      <template v-else>
        <el-alert
          v-if="impact.isLastModule"
          title="该 App 只剩这一个 Module。每个 App 至少保留一个未删除 Module，当前不可删除。"
          type="error"
          :closable="false"
          show-icon
        />
        <el-alert
          v-else-if="!authoritativeImpactReady"
          :title="
            allowStructuralDelete
              ? '当前结构影响来自最新完整目录；角色授权撤销数量由服务端完成删除后返回。'
              : '后端尚未提供删除前角色授权影响接口。为避免无影响信息删除，正式确认保持禁用。'
          "
          type="warning"
          :closable="false"
          show-icon
        />
        <el-alert
          v-else
          title="删除采用软删除，并会整体处理目标分支和相关角色直接授权；本页面不提供恢复。"
          type="error"
          :closable="false"
          show-icon
        />
        <el-form label-position="top" novalidate>
          <el-form-item :label="`请输入 ${target?.code} 确认删除`">
            <el-input
              v-model="confirmationCode"
              :aria-label="`请输入 ${target?.code} 确认删除`"
              autocomplete="off"
            />
          </el-form-item>
        </el-form>
        <p
          v-if="codeMatches && !authoritativeImpactReady && !allowStructuralDelete"
          class="impact-dialog__hint"
        >
          编码已匹配；还需等待权威影响查询完成。
        </p>
      </template>

      <el-alert
        v-if="errorMessage"
        :title="errorMessage"
        type="error"
        :closable="false"
        show-icon
      />

      <p class="impact-dialog__version">
        提交将携带当前版本 {{ target?.version }}，并以服务端成功后的完整目录为准。
      </p>
    </div>
  </FormDialog>
</template>

<style scoped lang="scss">
.impact-dialog {
  display: grid;
  gap: var(--spacing-4);
}

.impact-dialog__target {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-4);
  padding: var(--spacing-4);
  background: var(--background-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-default);
}

.impact-dialog__target span,
.impact-dialog__target strong {
  display: block;
}

.impact-dialog__target span,
.impact-dialog__version,
.impact-dialog__hint {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.impact-dialog__target strong {
  margin-top: var(--spacing-1);
  color: var(--text-primary);
}

.impact-dialog__target code {
  color: var(--color-primary);
  font-family: var(--font-family);
}

.impact-dialog__metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--spacing-2);
}

.impact-dialog__metrics div {
  padding: var(--spacing-3);
  text-align: center;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-default);
}

.impact-dialog__metrics span,
.impact-dialog__metrics strong {
  display: block;
}

.impact-dialog__metrics span {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}

.impact-dialog__metrics strong {
  margin-top: var(--spacing-1);
  color: var(--text-primary);
  font-size: var(--font-size-lg);
}

.impact-dialog__version,
.impact-dialog__hint {
  margin: 0;
  line-height: 1.6;
}
</style>
