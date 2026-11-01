import type { EntityId } from '@shared/types/entityId'

const MAX_INT64 = 9223372036854775807n

/** Never coerce an Int64 string to Number, or accept an already rounded number. */
export function canonicalEntityId(value: unknown): string {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) {
    throw new Error('接口 ID 不是有效的安全整数，请使用十进制字符串')
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error('接口 ID 必须是十进制字符串或安全整数')
  }
  const text = String(value)
  if (!/^\d+$/u.test(text)) throw new Error('接口 ID 必须是非负十进制整数')
  const id = BigInt(text)
  if (id > MAX_INT64) throw new Error('接口 ID 超出 Int64 范围')
  return id.toString()
}

export function positiveEntityId(value: unknown): string | undefined {
  try {
    const id = canonicalEntityId(value)
    return id === '0' ? undefined : id
  } catch {
    return undefined
  }
}

export function sameEntityId(left: unknown, right: unknown): boolean {
  try {
    return canonicalEntityId(left) === canonicalEntityId(right)
  } catch {
    return false
  }
}

export function compareEntityIds(left: EntityId, right: EntityId): number {
  const a = BigInt(canonicalEntityId(left))
  const b = BigInt(canonicalEntityId(right))
  return a < b ? -1 : a > b ? 1 : 0
}

/** Only explicitly declared ID fields are normalized; versions and opaque IDs are untouched. */
export function normalizeEntityIdFields<T>(value: T, fields: ReadonlySet<string>): T {
  function visit(current: unknown): unknown {
    if (Array.isArray(current)) return current.map(visit)
    if (!current || typeof current !== 'object') return current
    return Object.fromEntries(
      Object.entries(current).map(([key, item]) => [
        key,
        fields.has(key) && item !== null && item !== undefined
          ? Array.isArray(item)
            ? item.map(canonicalEntityId)
            : canonicalEntityId(item)
          : visit(item),
      ]),
    )
  }
  return visit(value) as T
}
