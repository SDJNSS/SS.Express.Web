import type { ItemInput } from '../types/dictionary'

export interface ItemForm {
  item_code: string
  item_name: string
  description: string
  sort_no: number
  item_color: string
  status: 'active' | 'disabled' | ''
  json: string
}
export const emptyItem = (): ItemForm => ({
  item_code: '',
  item_name: '',
  description: '',
  sort_no: 0,
  item_color: '',
  status: 'active',
  json: '',
})
export function requiredName(value: string, label: string) {
  if (!value.trim() || value.trim().length > 100) throw new Error(`${label}需填写 1–100 个字符`)
  return value.trim()
}
export function validCode(value: string) {
  const code = requiredName(value, '编码')
  if (
    /\s/u.test(code) ||
    [...code].some(
      (char) => char.charCodeAt(0) < 32 || (char.charCodeAt(0) >= 127 && char.charCodeAt(0) <= 159),
    )
  )
    throw new Error('编码不能包含空白或控制字符')
  return code
}
export function descriptionText(value: string) {
  if (value.length > 2000) throw new Error('描述最多 2000 个字符')
  return value
}
export function itemPayload(form: ItemForm): ItemInput {
  const item_code = validCode(form.item_code)
  const item_name = requiredName(form.item_name, '字典值名称')
  const description = descriptionText(form.description)
  if (!Number.isInteger(form.sort_no) || form.sort_no < 0 || form.sort_no > 2147483647)
    throw new Error('排序需为非负 int32 整数')
  if (form.item_color.length > 30) throw new Error('颜色或标签最多 30 个字符')
  if (form.status !== 'active' && form.status !== 'disabled')
    throw new Error('请选择字典值状态；未设置不等于启用')
  let ext_data: ItemInput['ext_data']
  try {
    ext_data = form.json.trim() ? JSON.parse(form.json) : null
  } catch {
    throw new Error('扩展数据不是有效的 JSON')
  }
  if (new TextEncoder().encode(JSON.stringify(ext_data)).length > 16 * 1024)
    throw new Error('扩展数据的 UTF-8 编码不能超过 16 KiB')
  return {
    item_code,
    item_name,
    description,
    sort_no: form.sort_no,
    item_color: form.item_color,
    status: form.status,
    ext_data,
  }
}
export function validateInitialItems(items: ItemInput[]) {
  if (items.length > 200) throw new Error('初始字典值最多 200 条')
  const codes = items.map((item) => validCode(item.item_code).toLowerCase())
  if (new Set(codes).size !== codes.length) throw new Error('初始字典值编码重复（不区分大小写）')
}
