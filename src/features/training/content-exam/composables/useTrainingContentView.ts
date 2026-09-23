import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { ContentRuntime, ContentSearch } from '../types/trainingContentRuntime'

/** Canonical view behavior shared by the four screens; has no API, router or auth dependency. */
export function useTrainingContentView<R, F>(
  getRuntime: () => ContentRuntime<R, F> | undefined,
  query: Record<string, string>,
  page: Ref<number>,
  pageSize: Ref<number>,
  form: F,
  formVisible: Ref<boolean>,
  submitting: Ref<boolean>,
) {
  const actionError = ref('')
  const discardVisible = ref(false)
  let baseline = ''
  let disposed = false
  let settleLeave: ((value: boolean) => void) | undefined
  watch(
    formVisible,
    (visible) => {
      if (visible) baseline = JSON.stringify(form)
    },
    { flush: 'sync' },
  )
  watch(
    () => getRuntime()?.query,
    (value) => {
      if (!value) return
      for (const key of Object.keys(query)) query[key] = String(value[key] ?? '')
      page.value = Number(value.page ?? 1)
      pageSize.value = Number(value.pageSize ?? 10)
    },
    { immediate: true },
  )

  async function mayLeave() {
    if (submitting.value) return false
    if (!getRuntime() || !formVisible.value || JSON.stringify(form) === baseline) return true
    if (settleLeave) return false
    discardVisible.value = true
    return new Promise<boolean>((resolve) => {
      settleLeave = resolve
    })
  }
  const formDirty = computed(() => formVisible.value && JSON.stringify(form) !== baseline)
  function confirmDiscard() {
    settleLeave?.(true)
    settleLeave = undefined
    discardVisible.value = false
  }
  watch(discardVisible, (visible) => {
    if (!visible) {
      settleLeave?.(false)
      settleLeave = undefined
    }
  })
  getRuntime()?.setLeaveGuard?.(mayLeave)
  function lockedModel(value: Ref<boolean>) {
    return computed({
      get: () => value.value,
      set: (next) => {
        if (!submitting.value) value.value = next
      },
    })
  }
  const beforeUnload = (event: BeforeUnloadEvent) => {
    if (
      getRuntime() &&
      (submitting.value || (formVisible.value && JSON.stringify(form) !== baseline))
    ) {
      event.preventDefault()
      event.returnValue = ''
    }
  }
  window.addEventListener('beforeunload', beforeUnload)
  onBeforeUnmount(() => {
    disposed = true
    settleLeave?.(false)
    window.removeEventListener('beforeunload', beforeUnload)
  })

  async function run(operation: () => Promise<void>) {
    if (submitting.value) return
    actionError.value = ''
    submitting.value = true
    try {
      await operation()
    } catch (error) {
      if (!disposed) actionError.value = error instanceof Error ? error.message : '操作失败，请重试'
    } finally {
      if (!disposed) submitting.value = false
    }
  }
  function load(value: ContentSearch = { ...query, page: page.value, pageSize: pageSize.value }) {
    void getRuntime()?.load(value)
  }
  return { actionError, discardVisible, confirmDiscard, formDirty, lockedModel, run, load }
}
