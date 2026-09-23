import type { StatusTone } from '@shared/components/StatusTag.vue'

export interface DashboardMetric {
  label: string
  value: number
  icon: string
  tone: StatusTone
  change: string
  direction: 'up' | 'down'
}

export interface PriorityItem {
  id: string
  title: string
  description: string
  status: string
  tone: StatusTone
}

export interface TransportTask extends Record<string, unknown> {
  id: string
  orderNo: string
  customer: string
  route: string
  vehicle: string
  eta: string
  status: string
  statusTone: StatusTone
}
