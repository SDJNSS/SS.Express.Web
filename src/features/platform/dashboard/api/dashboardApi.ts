import { getStoredAuthSession } from '@shared/api/authSession'
import { AUTH_SESSION_STATES } from '@shared/constants/authSession'
import type { DashboardMetric, PriorityItem, TransportTask } from '../types/dashboard'

export interface DashboardData {
  metrics: DashboardMetric[]
  priorities: PriorityItem[]
  tasks: TransportTask[]
  vehicleDistribution: Array<{ name: string; value: number }>
}

export interface DashboardAccessContext {
  isWelcomeOnlySession: boolean
  displayName: string
}

export function getDashboardAccessContext(): DashboardAccessContext {
  const session = getStoredAuthSession()
  return {
    isWelcomeOnlySession: session?.loginState === AUTH_SESSION_STATES.initialPasswordChangeRequired,
    displayName: session?.userName || session?.account || '当前用户',
  }
}

const dashboardData: DashboardData = {
  metrics: [
    {
      label: '今日运输单',
      value: 128,
      icon: 'mdi:clipboard-text-outline',
      tone: 'primary',
      change: '-6.2%',
      direction: 'down',
    },
    {
      label: '运输中',
      value: 46,
      icon: 'mdi:truck-fast-outline',
      tone: 'success',
      change: '+4.5%',
      direction: 'up',
    },
    {
      label: '待调度',
      value: 12,
      icon: 'mdi:calendar-clock-outline',
      tone: 'warning',
      change: '-14.3%',
      direction: 'down',
    },
    {
      label: '异常预警',
      value: 5,
      icon: 'mdi:bell-alert-outline',
      tone: 'danger',
      change: '+1',
      direction: 'up',
    },
  ],
  priorities: [
    {
      id: 'p1',
      title: '沪A12345 到达延迟',
      description: '预计延迟 2.5 小时',
      status: '运输中',
      tone: 'danger',
    },
    {
      id: 'p2',
      title: '粤B56789 需尽快调度',
      description: '计划 14:00 前发运',
      status: '待调度',
      tone: 'warning',
    },
    {
      id: 'p3',
      title: '鲁C88990 电子回单未上传',
      description: '运输任务已完成',
      status: '待回单',
      tone: 'primary',
    },
    {
      id: 'p4',
      title: '陕A11223 超速预警',
      description: 'G30 连霍高速',
      status: '异常',
      tone: 'danger',
    },
    {
      id: 'p5',
      title: '京N77890 保养提醒',
      description: '下次保养剩余 500km',
      status: '提醒',
      tone: 'info',
    },
  ],
  tasks: [
    {
      id: 't1',
      orderNo: 'YSD2505200001',
      customer: '京东物流',
      route: '成都 → 上海',
      vehicle: '沪A12345 / 牵引车',
      eta: '今天 18:00',
      status: '运输中',
      statusTone: 'success',
    },
    {
      id: 't2',
      orderNo: 'YSD2505200002',
      customer: '顺丰速运',
      route: '西安 → 郑州',
      vehicle: '陕A11223 / 罐式车',
      eta: '今天 16:30',
      status: '运输中',
      statusTone: 'success',
    },
    {
      id: 't3',
      orderNo: 'YSD2505200003',
      customer: '德邦物流',
      route: '郑州 → 上海',
      vehicle: '鲁C88990 / 厢式车',
      eta: '今天 20:00',
      status: '已完成',
      statusTone: 'primary',
    },
    {
      id: 't4',
      orderNo: 'YSD2505200004',
      customer: '三通一达',
      route: '广州 → 长沙',
      vehicle: '粤B56789 / 厢式车',
      eta: '明天 09:00',
      status: '待调度',
      statusTone: 'warning',
    },
  ],
  vehicleDistribution: [
    { name: '运输中', value: 142 },
    { name: '空闲中', value: 68 },
    { name: '待保养', value: 32 },
    { name: '维修中', value: 18 },
    { name: '离线', value: 26 },
  ],
}

export async function getDashboardData(): Promise<DashboardData> {
  await new Promise((resolve) => window.setTimeout(resolve, 260))
  return dashboardData
}
