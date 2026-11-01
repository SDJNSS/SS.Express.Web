import type { DictionaryQuery } from '../types/dictionary'
export function dictionaryRouteQuery(query: Record<string, unknown>): DictionaryQuery {
  const scalar = (value: unknown) => (typeof value === 'string' ? value : '')
  const index = Number(scalar(query.pageIndex))
  const size = Number(scalar(query.pageSize))
  return {
    page_index: Number.isSafeInteger(index) && index > 0 ? index : 1,
    page_size: [10, 20, 50, 100].includes(size) ? size : 20,
    keyword: scalar(query.keyword).trim(),
    dict_type_code: scalar(query.dictTypeCode).trim() || null,
    status: query.status === 'active' || query.status === 'disabled' ? query.status : null,
  }
}
