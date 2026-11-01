import { DictionaryError } from '../types/dictionary'
import type {
  Dictionary,
  DictionaryAction,
  DictionaryItem,
  DictionaryPort,
  ItemInput,
  DictionaryStatusRequest,
  DictionaryItemStatusRequest,
} from '../types/dictionary'

// Isolated fixtures. Never imported by a production binding, API client or registry.
export function createDictionaryPreviewPort(scenario = 'ready'): DictionaryPort {
  const dictionaries = new Map<number, Dictionary>(),
    items = new Map<number, DictionaryItem>()
  const deletedDictionaries = new Set<number>(),
    deletedItems = new Set<number>()
  let id = 100,
    itemId = 1000,
    revision = 0n,
    failedRead = false
  let failedWrite = false
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
  const version = () => (63928800000000000n + ++revision).toString()
  const audit = () => ({
    version: version(),
    created_at: '2026-10-29T10:00:00',
    updated_at: '2026-10-29T10:00:00',
    created_by: '预览管理员',
    updated_by: '预览管理员',
  })
  function guard(action: DictionaryAction) {
    if (!port.can(action))
      throw new DictionaryError('AUTH_PERMISSION_DENIED', '当前会话缺少此操作的资源权限')
  }
  function parent(key: number) {
    const value = dictionaries.get(key)
    if (!value || deletedDictionaries.has(key))
      throw new DictionaryError('DICT_TYPE_NOT_FOUND', '字典不存在或已删除')
    return value
  }
  function item(key: number, parentId: number) {
    parent(parentId)
    const value = items.get(key)
    if (!value || deletedItems.has(key))
      throw new DictionaryError('DICT_ITEM_NOT_FOUND', '字典值不存在或已删除')
    if (value.dict_type_id !== parentId)
      throw new DictionaryError('DICT_PARENT_MISMATCH', '字典值不属于当前字典')
    return value
  }
  function checkVersion(current: { version: string }, supplied: string) {
    if (current.version !== supplied || (scenario === 'version-conflict' && !failedWrite)) {
      failedWrite = true
      throw new DictionaryError(
        'DICT_VERSION_CONFLICT',
        '数据已被其他人修改；输入已保留，请关闭后刷新并核对再编辑。',
      )
    }
  }
  const sameCode = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
  function addItem(parentId: number, input: ItemInput) {
    const value: DictionaryItem = {
      ...clone(input),
      id: ++itemId,
      dict_type_id: parentId,
      dict_type_code: parent(parentId).dict_type_code,
      is_available: parent(parentId).status === 'active' && input.status === 'active',
      ...audit(),
    }
    items.set(value.id, value)
    return value
  }
  function page<T>(values: T[], index: number, size: number) {
    return clone({
      items: values.slice((index - 1) * size, index * size),
      total: values.length,
      page_index: index,
      page_size: size,
    })
  }
  function responseItem(value: DictionaryItem): DictionaryItem {
    return clone({
      ...value,
      is_available: parent(value.dict_type_id).status === 'active' && value.status === 'active',
    })
  }
  function changeDictionaryStatus(body: DictionaryStatusRequest, status: 'active' | 'disabled') {
    guard(status === 'active' ? 'enable' : 'disable')
    const row = parent(body.id)
    checkVersion(row, body.version)
    if (row.status !== status)
      Object.assign(row, { status, version: version(), updated_at: '2026-10-29T11:00:00' })
    if (scenario === 'status-unknown' && !failedWrite) {
      failedWrite = true
      throw new DictionaryError(
        'NETWORK_ERROR',
        '连接中断，启停结果未知；请关闭后刷新列表核实。',
        true,
      )
    }
    return clone(row)
  }
  function changeItemStatus(body: DictionaryItemStatusRequest, status: 'active' | 'disabled') {
    guard(status === 'active' ? 'enableItem' : 'disableItem')
    const row = item(body.id, body.dict_type_id)
    checkVersion(row, body.version)
    if (row.status !== status)
      Object.assign(row, { status, version: version(), updated_at: '2026-10-29T11:00:00' })
    return responseItem(row)
  }
  const port: DictionaryPort = {
    can: (action) =>
      scenario !== 'missing-read' &&
      !(scenario === 'read-only' && action !== 'read') &&
      !(scenario === 'no-enable' && (action === 'enable' || action === 'enableItem')) &&
      !(scenario === 'no-disable' && (action === 'disable' || action === 'disableItem')),
    async query(body) {
      guard('read')
      if (scenario === 'loading') return new Promise(() => {})
      if (scenario === 'retryable-error' && !failedRead) {
        failedRead = true
        throw new DictionaryError('NETWORK_ERROR', '字典列表暂时加载失败，请重试')
      }
      const values = [...dictionaries.values()].filter(
        (row) =>
          !deletedDictionaries.has(row.id) &&
          (!body.status || row.status === body.status) &&
          (!body.dict_type_code || sameCode(row.dict_type_code, body.dict_type_code)) &&
          [row.dict_type_code, row.dict_type_name, row.description]
            .join(' ')
            .toLowerCase()
            .includes(body.keyword.toLowerCase()),
      )
      values.sort((a, b) => a.dict_type_code.localeCompare(b.dict_type_code) || a.id - b.id)
      return page(values, body.page_index, body.page_size)
    },
    async queryItems(body) {
      guard('read')
      if (scenario === 'parent-deleted' && !failedRead) {
        failedRead = true
        deletedDictionaries.add(body.dict_type_id)
      }
      const dictionary = parent(body.dict_type_id)
      if (scenario === 'values-error' && !failedRead) {
        failedRead = true
        throw new DictionaryError('NETWORK_ERROR', '字典值暂时加载失败，请重试')
      }
      const values = [...items.values()].filter(
        (row) =>
          !deletedItems.has(row.id) &&
          row.dict_type_id === dictionary.id &&
          (!body.status || row.status === body.status) &&
          (body.status !== 'active' || dictionary.status === 'active') &&
          [row.item_code, row.item_name, row.description]
            .join(' ')
            .toLowerCase()
            .includes(body.keyword.toLowerCase()),
      )
      values.sort((a, b) => a.sort_no - b.sort_no || a.id - b.id)
      return {
        ...page(values.map(responseItem), body.page_index, body.page_size),
        dictionary: clone(dictionary),
      }
    },
    async create(body) {
      guard('create')
      if (
        [...dictionaries.values()].some((row) => sameCode(row.dict_type_code, body.dict_type_code))
      )
        throw new DictionaryError('DICT_CODE_CONFLICT', '字典编码已存在（包含已删除记录）')
      const codes = body.items.map((row) => row.item_code.toLowerCase())
      if (codes.length > 200 || new Set(codes).size !== codes.length)
        throw new DictionaryError('DICT_CODE_CONFLICT', '初始字典值编码重复或超过 200 条')
      const row = { ...body, id: ++id, status: 'active' as const, ...audit() }
      const { items: initial, ...dictionary } = row
      dictionaries.set(dictionary.id, dictionary)
      const created = initial.map((input) => addItem(dictionary.id, input))
      if (scenario === 'unknown-result' && !failedWrite) {
        failedWrite = true
        throw new DictionaryError(
          'NETWORK_ERROR',
          '连接中断，提交结果未知；请查询编码核实，不要重复提交。',
          true,
        )
      }
      return clone({ ...dictionary, items: created })
    },
    async update(body) {
      guard('update')
      const row = parent(body.id)
      checkVersion(row, body.version)
      Object.assign(row, {
        dict_type_name: body.dict_type_name,
        description: body.description,
        version: version(),
      })
      return clone(row)
    },
    async enable(body) {
      return changeDictionaryStatus(body, 'active')
    },
    async disable(body) {
      return changeDictionaryStatus(body, 'disabled')
    },
    async createItem(body) {
      guard('createItem')
      parent(body.dict_type_id)
      if (
        [...items.values()].some(
          (row) =>
            row.dict_type_id === body.dict_type_id && sameCode(row.item_code, body.item_code),
        )
      )
        throw new DictionaryError('DICT_CODE_CONFLICT', '该字典值编码已存在（包含已删除记录）')
      return clone(addItem(body.dict_type_id, body))
    },
    async updateItem(body) {
      guard('updateItem')
      const row = item(body.id, body.dict_type_id)
      checkVersion(row, body.version)
      Object.assign(row, clone(body), { version: version() })
      return responseItem(row)
    },
    async enableItem(body) {
      return changeItemStatus(body, 'active')
    },
    async disableItem(body) {
      return changeItemStatus(body, 'disabled')
    },
  }
  if (scenario !== 'empty') {
    const seeds = [
      ['TRANSPORT_MODE', '运输方式', '用于运输任务的方式选择'],
      ['VEHICLE_TYPE', '车辆类型', '车辆档案的公共分类'],
      ['COURSE_TYPE', '课程类型', '培训课程内容分类'],
      ['DOCUMENT_TYPE', '单证类型', '运输记录与电子单证分类'],
    ]
    for (const [code, name, description] of seeds) {
      const row: Dictionary = {
        id: ++id,
        dict_type_code: code!,
        dict_type_name: name!,
        description: description!,
        status: 'active',
        ...audit(),
      }
      if (code === 'TRANSPORT_MODE') {
        row.version = '0'
        row.updated_at = null
      }
      dictionaries.set(row.id, row)
      for (let index = 0; index < (code === 'TRANSPORT_MODE' ? 25 : 3); index++) {
        const value = addItem(row.id, {
          item_code: `VALUE_${index + 1}`,
          item_name: `${name}选项 ${index + 1}`,
          description: '',
          sort_no: index,
          item_color: index === 0 ? '基础分类' : '',
          status: index === 1 ? 'disabled' : 'active',
          ext_data: index === 0 ? false : null,
        })
        if (index === 2) value.status = null
      }
    }
  }
  return port
}
