import { computed, onBeforeUnmount, reactive, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { useEffectivePermissions } from '@shared/composables/useEffectivePermissions'
import { subscribeNavigationPermissionSnapshot } from '@shared/services/navigationPermissionState'
import { notification } from '@shared/services/notification'
import { contentErrorMessage, contentSessionKey, hasContentTenant } from '../api/trainingContentApi'
import type { TrainingPreviewState, TrainingStatus } from '../types/trainingContent'
import type {
  ContentPage,
  ContentQuery,
  ResourceVersionRequest,
  StatusChangeRequest,
  StatusChangeResponse,
} from '../types/trainingContentContracts'
import type { ContentAction, ContentRuntime, ContentSearch } from '../types/trainingContentRuntime'

interface ResourceRecord {
  id: number
  updatedAt: string
  status: TrainingStatus
}
interface ResourceApi<Summary, Detail, Payload> {
  query: (query: ContentQuery, signal?: AbortSignal) => Promise<ContentPage<Summary>>
  detail: (id: number, signal?: AbortSignal) => Promise<Detail>
  create: (body: Payload) => Promise<Detail>
  update: (body: Payload & ResourceVersionRequest) => Promise<Detail>
  changeStatus: (body: StatusChangeRequest) => Promise<StatusChangeResponse>
  copy?: (id: number) => Promise<Detail>
}

/** Production-only controller. Tenant and auth are supplied by the shared request layer. */
export function useTrainingContent<
  Summary,
  Detail extends Summary,
  RecordType extends ResourceRecord,
  FormType,
  Payload,
>(options: {
  api: ResourceApi<Summary, Detail, Payload>
  map: (dto: Summary | Detail) => RecordType
  payload: (form: FormType) => Payload
  permissions: Partial<Record<ContentAction, string>>
}) {
  const route = useRoute()
  const router = useRouter()
  const { hasFunctionPermission } = useEffectivePermissions()
  const records = shallowRef<RecordType[]>([])
  const state = ref<TrainingPreviewState>('loading')
  const total = ref(0)
  const error = ref('')
  const scope = ref('')
  const epoch = ref(0)
  let disposed = false
  let leaveGuard: () => boolean | Promise<boolean> = () => true
  onBeforeRouteLeave(() => leaveGuard())
  let sequence = 0
  let controller: AbortController | undefined
  const unsubscribe = subscribeNavigationPermissionSnapshot((snapshot) => {
    scope.value = `${snapshot.scope ?? ''}:${contentSessionKey()}`
  })
  const allowed = (action: ContentAction) => {
    const code = options.permissions[action]
    return Boolean(code && hasFunctionPermission(code))
  }
  const positiveInt = (value: unknown, fallback: number) => {
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
  }
  const query = computed<ContentSearch>(() => ({
    keyword: String(route.query.keyword ?? ''),
    status: String(route.query.status ?? ''),
    trainingType: String(route.query.trainingType ?? ''),
    locked: String(route.query.locked ?? ''),
    type: String(route.query.type ?? ''),
    mode: String(route.query.mode ?? ''),
    page: positiveInt(route.query.page, 1),
    pageSize: Math.min(100, positiveInt(route.query.pageSize, 10)),
  }))
  const contextKey = computed(() => `${scope.value}:${epoch.value}`)
  const requestContext = () => `${scope.value}:${epoch.value}:${contentSessionKey()}`
  function assertAccess(action: ContentAction, started = requestContext()) {
    if (disposed || started !== requestContext())
      throw new Error('登录或 Tenant 上下文已变化，请重新打开页面')
    if (!hasContentTenant()) throw new Error('请先选择当前 Tenant')
    if (!allowed('view') || !allowed(action))
      throw new Error('当前没有此操作权限，请联系管理员授权')
  }
  function requestQuery(): ContentQuery {
    const value = query.value
    return {
      page_index: Number(value.page),
      page_size: Number(value.pageSize),
      ...(value.keyword ? { keyword: String(value.keyword).trim() } : {}),
      ...(value.status ? { status: String(value.status) } : {}),
      ...(value.trainingType ? { training_type: String(value.trainingType).trim() } : {}),
      ...(['true', 'false'].includes(String(value.locked))
        ? { is_locked: value.locked === 'true' }
        : {}),
      ...(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(String(value.type))
        ? { question_type: value.type as NonNullable<ContentQuery['question_type']> }
        : {}),
      ...(['FIXED', 'RANDOM'].includes(String(value.mode))
        ? { paper_mode: value.mode as NonNullable<ContentQuery['paper_mode']> }
        : {}),
    }
  }
  async function fetchList() {
    controller?.abort()
    controller = new AbortController()
    const current = ++sequence
    const started = requestContext()
    error.value = ''
    state.value = 'loading'
    try {
      assertAccess('view', started)
      const result = await options.api.query(requestQuery(), controller.signal)
      if (current !== sequence || disposed) return
      assertAccess('view', started)
      total.value = result.total
      if (
        result.total > 0 &&
        (Number(query.value.page) - 1) * Number(query.value.pageSize) >= result.total
      ) {
        await load({ ...query.value, page: Math.ceil(result.total / Number(query.value.pageSize)) })
        return
      }
      records.value = result.items.map(options.map)
      state.value = result.items.length ? 'ready' : 'empty'
    } catch (cause) {
      if (current !== sequence || disposed || started !== requestContext()) return
      error.value = cause instanceof Error ? cause.message : contentErrorMessage(cause)
      records.value = []
      total.value = 0
      state.value = 'retryable-error'
    }
  }
  async function load(next?: ContentSearch) {
    if (next) {
      const urlQuery = Object.fromEntries(
        Object.entries(next)
          .filter(([, value]) => value !== '')
          .map(([key, value]) => [key, String(value)]),
      )
      const location = { path: route.path, query: urlQuery }
      if (router.resolve(location).fullPath !== route.fullPath) {
        await router.push(location)
        return // The route watcher performs the request, including back/forward restoration.
      }
    }
    await fetchList()
  }
  async function detail(record: RecordType) {
    const started = requestContext()
    assertAccess('view', started)
    const result = await options.api.detail(record.id)
    assertAccess('view', started)
    return options.map(result)
  }
  async function mutate(action: ContentAction, operation: () => Promise<RecordType>) {
    const started = requestContext()
    assertAccess(action, started)
    const result = await operation()
    assertAccess(action, started)
    notification.success('操作成功')
    // A failed refresh must not turn a confirmed write into a retryable write.
    await fetchList()
    assertAccess(action, started)
    return result
  }
  const runtime: ContentRuntime<RecordType, FormType> = reactive({
    get total() {
      return total.value
    },
    get query() {
      return query.value
    },
    get contextKey() {
      return contextKey.value
    },
    get error() {
      return error.value
    },
    allowed,
    load,
    detail,
    setLeaveGuard: (guard: () => boolean | Promise<boolean>) => {
      leaveGuard = guard
    },
    save: (form: FormType, record?: RecordType) =>
      mutate(record ? 'update' : 'create', async () => {
        const payload = options.payload(form)
        return options.map(
          record
            ? await options.api.update({ ...payload, id: record.id, updated_at: record.updatedAt })
            : await options.api.create(payload),
        )
      }),
    changeStatus: (record: RecordType) =>
      mutate('status', async () => {
        const result = await options.api.changeStatus({
          id: record.id,
          updated_at: record.updatedAt,
          target_status: record.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
        })
        return { ...record, status: result.status, updatedAt: result.updated_at }
      }),
    ...(options.api.copy
      ? {
          copy: (record: RecordType) =>
            mutate('copy', async () => options.map(await options.api.copy!(record.id))),
        }
      : {}),
  }) as ContentRuntime<RecordType, FormType>

  watch(
    scope,
    () => {
      epoch.value++
      records.value = []
    },
    { flush: 'sync' },
  )
  watch(
    () => allowed('view'),
    (canView, before) => {
      if (!canView && before) {
        epoch.value++
        records.value = []
      }
    },
    { flush: 'sync' },
  )
  watch(
    [scope, () => allowed('view'), query],
    () => {
      void fetchList()
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    disposed = true
    sequence++
    controller?.abort()
    unsubscribe()
  })
  return { records, state, runtime, contextKey, assertAccess, requestContext }
}
