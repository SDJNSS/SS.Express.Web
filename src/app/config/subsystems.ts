import type { SubsystemConfig } from '@shared/types/common'

export const subsystemConfigs: SubsystemConfig[] = [
  {
    id: 'dms',
    label: 'DMS 物流平台门户',
    icon: 'mdi:view-dashboard-outline',
  },
  {
    id: 'iam',
    label: 'IAM 身份中心',
    icon: 'mdi:account-key-outline',
  },
  {
    id: 'tms',
    label: 'TMS 运输管理',
    icon: 'mdi:truck-delivery-outline',
  },
  {
    id: 'vms',
    label: 'VMS 车辆管理',
    icon: 'mdi:car-cog',
  },
]

export function findSubsystem(path: string): SubsystemConfig {
  const segment = path.split('/').filter(Boolean)[0]
  return subsystemConfigs.find((subsystem) => subsystem.id === segment) ?? subsystemConfigs[0]!
}
