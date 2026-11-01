export interface PagedEntityOption<TId extends number | string = number> {
  id: TId
  label: string
  description?: string
}

export interface PagedEntityQuery {
  keyword: string
  pageIndex: number
  pageSize: number
  signal: AbortSignal
}

export type PagedEntityLoader<TId extends number | string = number> = (
  query: PagedEntityQuery,
) => Promise<{ items: PagedEntityOption<TId>[]; total: number }>
