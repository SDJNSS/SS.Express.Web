import type {
  AppShellBreadcrumb,
  AppShellNavigationItem,
  AppShellSystem,
} from '@shared/components/appShell.types'

export type FrameworkPreviewState = 'ready' | 'loading' | 'empty' | 'retryable-error'
export type FrameworkStatus = 'pending' | 'in-transit' | 'exception' | 'completed'

export interface FrameworkSearchModel {
  keyword: string
  status: '' | FrameworkStatus
  routeType: '' | 'local' | 'linehaul'
}

export interface FrameworkTaskRow extends Record<string, unknown> {
  id: string
  taskNo: string
  route: string
  routeType: 'local' | 'linehaul'
  planWindow: string
  vehicle: string
  dispatcher: string
  status: FrameworkStatus
}

export interface FrameworkShellFixture {
  productName: string
  currentSystemLabel: string
  systems: AppShellSystem[]
  navigation: AppShellNavigationItem[]
  breadcrumbs: AppShellBreadcrumb[]
  rows: FrameworkTaskRow[]
}
