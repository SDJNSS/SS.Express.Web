/** Wire contract: iam-dictionary-api-contract-2026-10-29; no tenant selector. */
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
export interface Dictionary extends Record<string, unknown> {
  id: number
  dict_type_code: string
  dict_type_name: string
  description: string
  status: 'active' | 'disabled'
  version: string
  created_at: string | null
  updated_at: string | null
  created_by: string
  updated_by: string
}
export interface ItemInput {
  item_code: string
  item_name: string
  description: string
  sort_no: number
  item_color: string
  status: 'active' | 'disabled'
  ext_data: JsonValue
}
export interface DictionaryItem extends Record<string, unknown>, Omit<ItemInput, 'status'> {
  id: number
  dict_type_id: number
  dict_type_code: string
  status: 'active' | 'disabled' | null
  is_available: boolean
  version: string
  created_at: string | null
  updated_at: string | null
  created_by: string
  updated_by: string
}
export interface DictionaryQuery {
  page_index: number
  page_size: number
  keyword: string
  dict_type_code: string | null
  status?: 'active' | 'disabled' | null
}
export interface ItemQuery {
  dict_type_id: number
  page_index: number
  page_size: number
  keyword: string
  status: 'active' | 'disabled' | null
}
export interface Paged<T> {
  items: T[]
  total: number
  page_index: number
  page_size: number
}
export interface DictionaryCreate {
  dict_type_code: string
  dict_type_name: string
  description: string
  items: ItemInput[]
}
export interface DictionaryUpdate {
  id: number
  version: string
  dict_type_name: string
  description: string
}
export interface ItemUpdate extends Omit<ItemInput, 'item_code'> {
  id: number
  dict_type_id: number
  version: string
}
export type DictionaryAction =
  | 'read'
  | 'create'
  | 'update'
  | 'enable'
  | 'disable'
  | 'createItem'
  | 'updateItem'
  | 'enableItem'
  | 'disableItem'
export interface DictionaryStatusRequest {
  id: number
  version: string
}
export interface DictionaryItemStatusRequest extends DictionaryStatusRequest {
  dict_type_id: number
}
/** The management UI exposes status operations, never the backend Delete endpoints. */
export interface DictionaryPort {
  readonly initialQuery?: DictionaryQuery
  readonly authorizationPending?: boolean
  can: (action: DictionaryAction) => boolean
  query: (body: DictionaryQuery) => Promise<Paged<Dictionary>>
  queryItems: (body: ItemQuery) => Promise<Paged<DictionaryItem> & { dictionary: Dictionary }>
  create: (body: DictionaryCreate) => Promise<Dictionary & { items: DictionaryItem[] }>
  update: (body: DictionaryUpdate) => Promise<Dictionary>
  enable: (body: DictionaryStatusRequest) => Promise<Dictionary>
  disable: (body: DictionaryStatusRequest) => Promise<Dictionary>
  createItem: (body: ItemInput & { dict_type_id: number }) => Promise<DictionaryItem>
  updateItem: (body: ItemUpdate) => Promise<DictionaryItem>
  enableItem: (body: DictionaryItemStatusRequest) => Promise<DictionaryItem>
  disableItem: (body: DictionaryItemStatusRequest) => Promise<DictionaryItem>
}
export class DictionaryError extends Error {
  constructor(
    public readonly reason: string,
    message: string,
    public readonly unknownResult = false,
  ) {
    super(message)
  }
}
