export interface PagedEntityOption {
  id: number
  label: string
  description?: string
}

export interface PagedEntityQuery {
  keyword: string
  pageIndex: number
  pageSize: number
  signal: AbortSignal
}

export type PagedEntityLoader = (
  query: PagedEntityQuery,
) => Promise<{ items: PagedEntityOption[]; total: number }>
