import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  shallowRef,
  shallowReactive,
  watch,
} from 'vue'
import {
  descriptionText,
  emptyItem,
  itemPayload,
  requiredName,
  validCode,
  validateInitialItems,
} from '../adapters/dictionaryForms'
import type { ItemForm } from '../adapters/dictionaryForms'
import { DictionaryError } from '../types/dictionary'
import type {
  Dictionary,
  DictionaryAction,
  DictionaryItem,
  DictionaryPort,
  ItemInput,
} from '../types/dictionary'

export function useDictionaryManagement(port: DictionaryPort) {
  const allowed = (action: DictionaryAction) => port.can(action)
  const initial = port.initialQuery
  const filters = reactive({
    code: initial?.dict_type_code ?? '',
    keyword: initial?.keyword ?? '',
    status: (initial?.status ?? '') as '' | 'active' | 'disabled',
  })
  let committed = { ...filters }
  const page = ref(initial?.page_index ?? 1),
    pageSize = ref(initial?.page_size ?? 20),
    total = ref(0),
    rows = shallowRef<Dictionary[]>([])
  const loading = ref(false),
    error = ref(''),
    notice = ref('')
  const selected = shallowRef<Dictionary>(),
    valuesVisible = ref(false),
    valuesLoading = ref(false),
    valuesError = ref('')
  const itemFilters = reactive({ keyword: '', status: '' as '' | 'active' | 'disabled' })
  let itemCommitted = { ...itemFilters }
  const itemPage = ref(1),
    itemPageSize = ref(20),
    itemTotal = ref(0),
    items = shallowRef<DictionaryItem[]>([])
  let listEpoch = 0,
    itemEpoch = 0,
    alive = true
  const failure = (cause: unknown) =>
    cause instanceof Error ? cause.message : '操作失败，请稍后重试'
  function assert(action: DictionaryAction) {
    if (!allowed(action))
      throw new DictionaryError('AUTH_PERMISSION_DENIED', '当前会话缺少此操作的资源权限')
  }
  async function load() {
    const epoch = ++listEpoch
    if (!allowed('read')) return
    loading.value = true
    error.value = ''
    try {
      const result = await port.query({
        page_index: page.value,
        page_size: pageSize.value,
        keyword: committed.keyword.trim(),
        dict_type_code: committed.code.trim() || null,
        status: committed.status || null,
      })
      if (!alive || epoch !== listEpoch) return
      rows.value = result.items
      total.value = result.total
      if (page.value > 1 && !result.items.length && result.total) {
        page.value = Math.ceil(result.total / pageSize.value)
        await load()
      }
    } catch (cause) {
      if (alive && epoch === listEpoch) {
        rows.value = []
        error.value = failure(cause)
      }
    } finally {
      if (alive && epoch === listEpoch) loading.value = false
    }
  }
  function search() {
    committed = {
      code: filters.code.trim(),
      keyword: filters.keyword.trim(),
      status: filters.status,
    }
    Object.assign(filters, committed)
    page.value = 1
    void load()
  }
  function reset() {
    Object.assign(filters, { code: '', keyword: '', status: '' })
    search()
  }
  async function loadItems() {
    const dictionary = selected.value,
      epoch = ++itemEpoch
    if (!dictionary || !valuesVisible.value || !allowed('read')) return
    valuesLoading.value = true
    valuesError.value = ''
    try {
      const result = await port.queryItems({
        dict_type_id: dictionary.id,
        page_index: itemPage.value,
        page_size: itemPageSize.value,
        keyword: itemCommitted.keyword.trim(),
        status: itemCommitted.status || null,
      })
      if (
        !alive ||
        epoch !== itemEpoch ||
        selected.value?.id !== dictionary.id ||
        !valuesVisible.value
      )
        return
      selected.value = result.dictionary
      items.value = result.items
      itemTotal.value = result.total
      if (itemPage.value > 1 && !result.items.length) {
        itemPage.value = Math.max(1, Math.ceil(result.total / itemPageSize.value))
        await loadItems()
      }
    } catch (cause) {
      if (alive && epoch === itemEpoch) {
        valuesError.value = failure(cause)
        items.value = []
        if (cause instanceof DictionaryError && cause.reason === 'DICT_TYPE_NOT_FOUND')
          selected.value = undefined
      }
    } finally {
      if (alive && epoch === itemEpoch) valuesLoading.value = false
    }
  }
  function openValues(row: Dictionary) {
    if (!allowed('read')) return
    ++itemEpoch
    selected.value = row
    items.value = []
    itemTotal.value = 0
    itemPage.value = 1
    Object.assign(itemFilters, { keyword: '', status: '' })
    itemCommitted = { ...itemFilters }
    valuesVisible.value = true
    void loadItems()
  }
  function searchItems() {
    itemCommitted = { ...itemFilters }
    itemPage.value = 1
    void loadItems()
  }
  function resetItems() {
    Object.assign(itemFilters, { keyword: '', status: '' })
    searchItems()
  }
  function closeValues(value: boolean) {
    if (!value) {
      ++itemEpoch
      valuesLoading.value = false
    }
    valuesVisible.value = value
  }

  const formVisible = ref(false),
    editing = shallowRef<Dictionary>(),
    formBusy = ref(false),
    formError = ref(''),
    unknownCreate = ref(false)
  const form = shallowReactive({
    code: '',
    name: '',
    description: '',
    initialItems: [] as ItemInput[],
  })
  const formSnapshot = ref('')
  const formDirty = computed(() => JSON.stringify(form) !== formSnapshot.value)
  function openForm(row?: Dictionary) {
    if (!allowed(row ? 'update' : 'create')) return
    editing.value = row
    formError.value = ''
    unknownCreate.value = false
    Object.assign(form, {
      code: row?.dict_type_code ?? '',
      name: row?.dict_type_name ?? '',
      description: row?.description ?? '',
      initialItems: [],
    })
    formSnapshot.value = JSON.stringify(form)
    formVisible.value = true
  }
  async function saveDictionary() {
    if (formBusy.value || unknownCreate.value) return
    formError.value = ''
    formBusy.value = true
    try {
      const dict_type_name = requiredName(form.name, '字典名称'),
        description = descriptionText(form.description)
      const current = editing.value
      assert(current ? 'update' : 'create')
      if (current) {
        const updated = await port.update({
          id: current.id,
          version: current.version,
          dict_type_name,
          description,
        })
        if (!alive) return
        if (selected.value?.id === updated.id) selected.value = updated
      } else {
        validateInitialItems(form.initialItems)
        await port.create({
          dict_type_code: validCode(form.code),
          dict_type_name,
          description,
          items: form.initialItems,
        })
        if (!alive) return
      }
      formVisible.value = false
      notice.value = '字典已保存'
      await load()
    } catch (cause) {
      if (alive) {
        formError.value = failure(cause)
        unknownCreate.value = cause instanceof DictionaryError && cause.unknownResult
      }
    } finally {
      if (alive) formBusy.value = false
    }
  }
  async function verifyCreate() {
    if (formBusy.value) return
    formBusy.value = true
    try {
      assert('read')
      const result = await port.query({
        page_index: 1,
        page_size: 20,
        keyword: '',
        dict_type_code: validCode(form.code),
      })
      if (!alive) return
      formError.value = result.items.length
        ? '已查到相同编码的字典。请关闭表单，在列表核对内容；不会重复提交。'
        : '暂未查到该编码；仍不能确定提交结果，请联系管理员核实，勿重复创建。'
      await load()
    } catch (cause) {
      if (alive) formError.value = failure(cause)
    } finally {
      if (alive) formBusy.value = false
    }
  }

  const itemVisible = ref(false),
    itemEditing = shallowRef<DictionaryItem>(),
    initialIndex = ref<number | null>(null)
  const itemForm = reactive<ItemForm>(emptyItem()),
    itemSnapshot = ref(''),
    itemBusy = ref(false),
    itemError = ref(''),
    itemUnknown = ref(false)
  const initialMode = ref(false)
  function openItem(row?: DictionaryItem, index?: number) {
    const local = index !== undefined
    if (!allowed(local ? 'create' : row ? 'updateItem' : 'createItem')) return
    if (!local && !selected.value) return
    initialMode.value = local
    initialIndex.value = index !== undefined && index >= 0 ? index : null
    itemEditing.value = row
    const initial = index !== undefined && index >= 0 ? form.initialItems[index] : undefined
    const value = row ?? initial
    Object.assign(
      itemForm,
      value
        ? {
            item_code: value.item_code,
            item_name: value.item_name,
            description: value.description,
            sort_no: value.sort_no ?? 0,
            item_color: value.item_color ?? '',
            status: value.status ?? '',
            json: JSON.stringify(value.ext_data, null, 2),
          }
        : emptyItem(),
    )
    itemError.value = ''
    itemUnknown.value = false
    itemSnapshot.value = JSON.stringify(itemForm)
    itemVisible.value = true
  }
  async function saveItem() {
    if (itemBusy.value || itemUnknown.value) return
    itemBusy.value = true
    itemError.value = ''
    try {
      const payload = itemPayload(itemForm)
      if (initialMode.value) {
        assert('create')
        const next = [...form.initialItems]
        if (initialIndex.value === null) next.push(payload)
        else next[initialIndex.value] = payload
        validateInitialItems(next)
        form.initialItems = next
      } else {
        const parent = selected.value,
          current = itemEditing.value
        if (!parent) throw new Error('字典已不可用，请重新查询')
        assert(current ? 'updateItem' : 'createItem')
        if (current) {
          const fields = {
            item_name: payload.item_name,
            description: payload.description,
            sort_no: payload.sort_no,
            item_color: payload.item_color,
            status: payload.status,
            ext_data: payload.ext_data,
          }
          await port.updateItem({
            ...fields,
            id: current.id,
            dict_type_id: parent.id,
            version: current.version,
          })
        } else await port.createItem({ ...payload, dict_type_id: parent.id })
        if (!alive) return
        notice.value = '字典值已保存'
        await loadItems()
      }
      itemVisible.value = false
    } catch (cause) {
      if (alive) {
        itemError.value = failure(cause)
        itemUnknown.value = cause instanceof DictionaryError && cause.unknownResult
      }
    } finally {
      if (alive) itemBusy.value = false
    }
  }
  const statusTarget = shallowRef<Dictionary | DictionaryItem>(),
    statusKind = ref<'dictionary' | 'item'>('dictionary'),
    statusAction = ref<'enable' | 'disable'>('disable'),
    statusBusy = ref(false),
    statusError = ref(''),
    statusUnknown = ref(false)
  function askStatus(
    row: Dictionary | DictionaryItem,
    kind: 'dictionary' | 'item',
    action: 'enable' | 'disable',
  ) {
    if (
      statusBusy.value ||
      !allowed(kind === 'dictionary' ? action : action === 'enable' ? 'enableItem' : 'disableItem')
    )
      return
    statusTarget.value = row
    statusKind.value = kind
    statusAction.value = action
    statusError.value = ''
    statusUnknown.value = false
  }
  async function confirmStatus() {
    if (!statusTarget.value || statusBusy.value || statusUnknown.value) return
    statusBusy.value = true
    statusError.value = ''
    const target = statusTarget.value
    const enable = statusAction.value === 'enable'
    try {
      assert(
        statusKind.value === 'dictionary'
          ? statusAction.value
          : enable
            ? 'enableItem'
            : 'disableItem',
      )
      if (statusKind.value === 'dictionary') {
        const result = await port[statusAction.value]({ id: target.id, version: target.version })
        if (!alive) return
        if (selected.value?.id === target.id) {
          selected.value = result
          // Re-read availability; do not mutate child status or versions locally.
          await loadItems()
        }
        notice.value = enable
          ? '字典已启用，单独停用的字典值保持停用'
          : '字典已停用，字典值自身状态保持不变'
        await load()
      } else {
        const result = await port[enable ? 'enableItem' : 'disableItem']({
          id: target.id,
          dict_type_id: (target as DictionaryItem).dict_type_id,
          version: target.version,
        })
        if (!alive) return
        notice.value = enable
          ? result.is_available
            ? '字典值已启用'
            : '字典值已启用；父字典仍停用，当前不可用于新业务'
          : '字典值已停用'
        await loadItems()
      }
      statusTarget.value = undefined
    } catch (cause) {
      if (alive) {
        statusError.value = failure(cause)
        statusUnknown.value = cause instanceof DictionaryError && cause.unknownResult
      }
    } finally {
      if (alive) statusBusy.value = false
    }
  }
  watch(
    () => port.initialQuery,
    (next) => {
      if (
        !next ||
        (next.page_index === page.value &&
          next.page_size === pageSize.value &&
          next.keyword === committed.keyword &&
          (next.dict_type_code ?? '') === committed.code &&
          (next.status ?? '') === committed.status)
      )
        return
      Object.assign(filters, {
        code: next.dict_type_code ?? '',
        keyword: next.keyword,
        status: next.status ?? '',
      })
      committed = { ...filters }
      page.value = next.page_index
      pageSize.value = next.page_size
      void load()
    },
  )
  onMounted(() => void load())
  onBeforeUnmount(() => {
    alive = false
    ++listEpoch
    ++itemEpoch
  })
  return {
    port,
    allowed,
    filters,
    page,
    pageSize,
    rows,
    total,
    loading,
    error,
    notice,
    load,
    search,
    reset,
    selected,
    valuesVisible,
    valuesLoading,
    valuesError,
    itemFilters,
    itemPage,
    itemPageSize,
    itemTotal,
    items,
    openValues,
    closeValues,
    loadItems,
    searchItems,
    resetItems,
    formVisible,
    editing,
    formBusy,
    formError,
    form,
    formDirty,
    unknownCreate,
    openForm,
    saveDictionary,
    verifyCreate,
    itemVisible,
    itemEditing,
    itemForm,
    itemSnapshot,
    itemBusy,
    itemError,
    itemUnknown,
    initialMode,
    openItem,
    saveItem,
    statusTarget,
    statusKind,
    statusAction,
    statusBusy,
    statusError,
    statusUnknown,
    askStatus,
    confirmStatus,
  }
}
