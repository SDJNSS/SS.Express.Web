import type { LookupKind, LookupOption } from '@shared/types/lookup'

const lookupSeed: Record<LookupKind, LookupOption[]> = {
  vehicle: [
    { value: 'v-001', label: '沪A12345', secondary: '牵引车' },
    { value: 'v-002', label: '粤B56789', secondary: '厢式车' },
    { value: 'v-003', label: '陕A11223', secondary: '罐式车' },
  ],
  driver: [
    { value: 'd-001', label: '王师傅', secondary: '沪A12345' },
    { value: 'd-002', label: '李师傅', secondary: '粤B56789' },
    { value: 'd-003', label: '赵师傅', secondary: '陕A11223' },
  ],
  customer: [
    { value: 'c-001', label: '京东物流', secondary: '重点客户' },
    { value: 'c-002', label: '顺丰速运', secondary: '重点客户' },
    { value: 'c-003', label: '德邦物流' },
  ],
  organization: [
    { value: 'o-001', label: '华东运输中心' },
    { value: 'o-002', label: '华南运营中心' },
    { value: 'o-003', label: '西北项目组' },
    { value: 'o-004', label: '华北运营中心' },
  ],
  user: [
    { value: 'u-001', label: '林嘉', secondary: '运营经理' },
    { value: 'u-002', label: '周宁', secondary: '调度专员' },
    { value: 'u-003', label: '陈曦', secondary: '车队主管' },
  ],
  address: [
    { value: 'a-001', label: '上海市嘉定区安亭物流园' },
    { value: 'a-002', label: '成都市新都区传化物流港' },
    { value: 'a-003', label: '广州市白云区太和物流园' },
  ],
}

export async function listLookupOptions(kind: LookupKind, keyword = ''): Promise<LookupOption[]> {
  await new Promise((resolve) => window.setTimeout(resolve, 120))
  const normalizedKeyword = keyword.trim().toLocaleLowerCase('zh-CN')
  if (!normalizedKeyword) return lookupSeed[kind]
  return lookupSeed[kind].filter((option) =>
    `${option.label}${option.secondary ?? ''}`
      .toLocaleLowerCase('zh-CN')
      .includes(normalizedKeyword),
  )
}
