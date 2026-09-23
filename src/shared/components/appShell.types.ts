export interface AppShellSystem {
  id: string
  label: string
  icon: string
  href: string
}

export interface AppShellNavigationChild {
  id: string
  label: string
  href: string
  active?: boolean
}

export interface AppShellNavigationItem {
  id: string
  label: string
  icon: string
  href?: string
  active?: boolean
  expanded?: boolean
  children?: AppShellNavigationChild[]
}

export interface AppShellBreadcrumb {
  id: string
  label: string
}

export type AppShellNavigationState = 'loading' | 'ready' | 'empty' | 'error'
