import { defineApiPath } from '@shared/api/apiPath'
export { getStoredAuthSession as getDictionarySession } from '@shared/api/authSession'
import { serviceApiPath } from '@shared/api/backendServices'
import { ApiError, requestApi } from '@shared/api/httpClient'
import { DictionaryError } from '../types/dictionary'
import type {
  Dictionary,
  DictionaryCreate,
  DictionaryItem,
  DictionaryItemStatusRequest,
  DictionaryQuery,
  DictionaryStatusRequest,
  DictionaryUpdate,
  ItemInput,
  ItemQuery,
  ItemUpdate,
  Paged,
} from '../types/dictionary'

const endpoints = Object.freeze({
  query: '/Dictionary/Query',
  queryItems: '/Dictionary/QueryItems',
  create: '/Dictionary/Create',
  update: '/Dictionary/Update',
  enable: '/Dictionary/Enable',
  disable: '/Dictionary/Disable',
  createItem: '/Dictionary/CreateItem',
  updateItem: '/Dictionary/UpdateItem',
  enableItem: '/Dictionary/EnableItem',
  disableItem: '/Dictionary/DisableItem',
})

function adaptRecord(value: unknown, isItem = false): void {
  if (!value || typeof value !== 'object') throw new Error('字典接口响应缺少对象')
  const row = value as Record<string, unknown>
  if (!Number.isInteger(row.id) || (row.id as number) < 1 || (row.id as number) > 2147483647)
    throw new Error('字典接口返回无效的 int32 ID')
  if (typeof row.version !== 'string' || !/^\d+$/.test(row.version))
    throw new Error('字典接口必须返回原始字符串版本')
  if (
    isItem &&
    (!Number.isInteger(row.dict_type_id) ||
      (row.dict_type_id as number) < 1 ||
      (row.dict_type_id as number) > 2147483647 ||
      typeof row.is_available !== 'boolean')
  )
    throw new Error('字典值响应缺少有效归属或业务可用性')
  // Existing dictionaries can return upper-case states. Canonicalize only known
  // record statuses; preserve null history, codes, JSON data and raw versions.
  const status = typeof row.status === 'string' ? row.status.toLowerCase() : row.status
  if (status !== 'active' && status !== 'disabled' && !(isItem && status === null))
    throw new Error('字典接口响应缺少合法状态')
  row.status = status
}
function adaptResponse(value: unknown, item = false): void {
  if (value && typeof value === 'object' && 'total' in value) {
    const page = value as Paged<unknown> & { dictionary?: Dictionary }
    if (!Array.isArray(page.items) || !Number.isInteger(page.total) || page.total < 0)
      throw new Error('字典分页响应无效')
    page.items.forEach((row) => adaptRecord(row, item))
    if (item) adaptRecord(page.dictionary)
  } else {
    adaptRecord(value, item)
    if (value && typeof value === 'object' && 'items' in value) {
      if (!Array.isArray(value.items)) throw new Error('新建字典响应缺少初始值列表')
      value.items.forEach((row) => adaptRecord(row, true))
    }
  }
}
async function post<Response, Request>(
  path: string,
  body: Request,
  write: boolean,
  item = false,
): Promise<Response> {
  let received = false
  try {
    const response = await requestApi<Response, Request>({
      method: 'POST',
      url: serviceApiPath('iam', defineApiPath(path)),
      data: body,
      tenantScoped: false,
      retryAuth: false,
      headers: { 'Content-Type': 'application/json' },
    })
    received = true
    adaptResponse(response, item)
    return response
  } catch (error) {
    if (error instanceof ApiError) {
      // A 5xx/network failure or unusable write response may have committed.
      // Never replay a write, including after token refresh.
      const unknown =
        write &&
        (error.category === 'network' ||
          (error.status ?? 0) >= 500 ||
          error.category === 'cancelled' ||
          error.category === 'system')
      throw new DictionaryError(
        error.reasonCode ?? error.code ?? error.category,
        error.message,
        unknown,
      )
    }
    throw new DictionaryError(
      'DICT_RESPONSE_INVALID',
      error instanceof Error ? error.message : '字典响应不可用',
      write && received,
    )
  }
}
export const dictionaryApi = {
  query: (body: DictionaryQuery) =>
    post<Paged<Dictionary>, DictionaryQuery>(endpoints.query, body, false),
  queryItems: (body: ItemQuery) =>
    post<Paged<DictionaryItem> & { dictionary: Dictionary }, ItemQuery>(
      endpoints.queryItems,
      body,
      false,
      true,
    ),
  create: (body: DictionaryCreate) =>
    post<Dictionary & { items: DictionaryItem[] }, DictionaryCreate>(endpoints.create, body, true),
  update: (body: DictionaryUpdate) =>
    post<Dictionary, DictionaryUpdate>(endpoints.update, body, true),
  enable: (body: DictionaryStatusRequest) =>
    post<Dictionary, DictionaryStatusRequest>(endpoints.enable, body, true),
  disable: (body: DictionaryStatusRequest) =>
    post<Dictionary, DictionaryStatusRequest>(endpoints.disable, body, true),
  createItem: (body: ItemInput & { dict_type_id: number }) =>
    post<DictionaryItem, ItemInput & { dict_type_id: number }>(
      endpoints.createItem,
      body,
      true,
      true,
    ),
  updateItem: (body: ItemUpdate) =>
    post<DictionaryItem, ItemUpdate>(endpoints.updateItem, body, true, true),
  enableItem: (body: DictionaryItemStatusRequest) =>
    post<DictionaryItem, DictionaryItemStatusRequest>(endpoints.enableItem, body, true, true),
  disableItem: (body: DictionaryItemStatusRequest) =>
    post<DictionaryItem, DictionaryItemStatusRequest>(endpoints.disableItem, body, true, true),
}
