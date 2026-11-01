<script setup lang="ts">
import { resourceElementAttributes, type ResourceElement } from '@shared/services/resourceElement'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import FormDialog from './FormDialog.vue'
import { setFormUnsaved } from '@shared/services/unsavedNavigation'

const props = withDefaults(
  defineProps<{
    resource_element?: ResourceElement | undefined

    modelValue: boolean
    title: string
    size?: string | number
    submitting?: boolean
    confirmDisabled?: boolean
    confirmButtonText?: string
    cancelButtonText?: string
    dirty?: boolean | null
    discardTitle?: string
    discardDescription?: string
    discardButtonText?: string
    keepEditingButtonText?: string
  }>(),
  {
    resource_element: undefined,
    size: 560,
    submitting: false,
    confirmDisabled: false,
    confirmButtonText: '保存',
    cancelButtonText: '取消',
    dirty: null,
    discardTitle: '放弃未保存的修改？',
    discardDescription: '关闭后，当前未保存的填写内容将丢失。',
    discardButtonText: '放弃修改',
    keepEditingButtonText: '继续编辑',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  discard: []
}>()

type CloseDrawer = () => void

const interactionDirty = ref(false)
const discardVisible = ref(false)
const pendingClose = ref<CloseDrawer>()
let portalListenerActive = false

const hasUnsavedChanges = computed(() => props.dirty ?? interactionDirty.value)
const navigationOwner = Symbol('form-drawer')
watch(
  () => props.modelValue && hasUnsavedChanges.value,
  (dirty) => setFormUnsaved(navigationOwner, dirty),
  { immediate: true },
)

function markInteractionDirty(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLElement) || target.closest('[disabled], [aria-disabled="true"]'))
    return
  interactionDirty.value = true
}

function markControlClickDirty(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const control = target.closest('[data-form-dirty-action]')
  if (!control || control.matches('[disabled], [aria-disabled="true"], .is-disabled')) return
  interactionDirty.value = true
}

function markPortalledControlDirty(event: Event) {
  if (!props.modelValue) return
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  const option = target.closest(
    '[role="option"], .el-cascader-node, .el-date-table td.available, .el-month-table td, .el-year-table td, .el-time-spinner__item',
  )
  if (!option || option.matches('[aria-disabled="true"], .is-disabled, .disabled')) return
  interactionDirty.value = true
}

function setPortalListener(active: boolean) {
  if (active === portalListenerActive) return
  if (typeof document === 'undefined') return
  if (active) document.addEventListener('click', markPortalledControlDirty, true)
  else document.removeEventListener('click', markPortalledControlDirty, true)
  portalListenerActive = active
}

function requestClose(done: CloseDrawer) {
  if (props.submitting) return
  if (!hasUnsavedChanges.value) {
    done()
    return
  }
  pendingClose.value = done
  discardVisible.value = true
}

function requestCancel() {
  requestClose(() => emit('update:modelValue', false))
}

function handleDiscardDialog(value: boolean) {
  discardVisible.value = value
  if (!value) pendingClose.value = undefined
}

function discardChanges() {
  const close = pendingClose.value
  pendingClose.value = undefined
  discardVisible.value = false
  interactionDirty.value = false
  emit('discard')
  close?.()
}

watch(
  () => props.modelValue,
  (visible) => {
    setPortalListener(visible)
    if (visible) {
      interactionDirty.value = false
      discardVisible.value = false
      pendingClose.value = undefined
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  setPortalListener(false)
  setFormUnsaved(navigationOwner, false)
})
</script>

<template>
  <el-drawer
    v-bind="resourceElementAttributes(resource_element)"
    :model-value="modelValue"
    :title="title"
    :size="size"
    destroy-on-close
    :before-close="requestClose"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div
      class="form-drawer__body"
      @click.capture="markControlClickDirty"
      @input.capture="markInteractionDirty"
      @change.capture="markInteractionDirty"
    >
      <slot />
    </div>
    <template #footer>
      <slot name="footer" :request-close="requestCancel">
        <el-button
          v-resource-element="resource_element"
          :disabled="submitting"
          @click="requestCancel"
          >{{ cancelButtonText }}</el-button
        >
        <el-button
          v-resource-element="resource_element"
          type="primary"
          :disabled="confirmDisabled || submitting"
          :loading="submitting"
          @click="emit('confirm')"
        >
          {{ confirmButtonText }}
        </el-button>
      </slot>
    </template>
  </el-drawer>

  <FormDialog
    :resource_element="resource_element"
    :model-value="discardVisible"
    :title="discardTitle"
    width="480"
    :cancel-button-text="keepEditingButtonText"
    :confirm-button-text="discardButtonText"
    confirm-type="danger"
    @update:model-value="handleDiscardDialog"
    @confirm="discardChanges"
  >
    {{ discardDescription }}
  </FormDialog>
</template>

<style scoped lang="scss">
.form-drawer__body {
  padding-right: var(--spacing-2);
}
</style>
