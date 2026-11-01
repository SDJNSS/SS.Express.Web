// Authored business semantics only; never derive purpose from a label, URL or resource code.
export function requireResourceDescription(value, resourceCode) {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    value.length > 400 ||
    !/^用途：\S[\s\S]+；场景：\S[\s\S]+$/u.test(value) ||
    /TODO|TBD|待补充|暂无描述/iu.test(value)
  )
    throw new Error(`Missing/invalid resource purpose and scenario: ${resourceCode}`)
  return value
}
