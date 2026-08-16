export interface PlatformTenantInfo {
  logoText: string
  tenantName: string
  tenantLabel: string
}

export interface PlatformUserProfile {
  avatarText: string
  avatarUrl?: string
  displayName: string
  roleName: string
}

export interface PlatformMenuItem {
  key: string
  label: string
  icon?: string
  path?: string
  badge?: string
  children?: PlatformMenuItem[]
}

export interface PlatformMenuClickPayload {
  item: PlatformMenuItem
  level: number
}

export interface PlatformSearchResult {
  key: string
  title: string
  description?: string
  groupLabel?: string
  actionLabel?: string
  path?: string
  payload?: unknown
}
