import type { VersionToken } from '@shared/types/common'

const ACCESS_TOKEN_KEY = 'access_token'
const LOGIN_STATE_KEY = 'login_state'
const ACCOUNT_KEY = 'login_account'
const TENANT_NAME_KEY = 'login_tenant_name'
const TENANT_CODE_KEY = 'login_tenant_code'
const DISPLAY_TITLE_KEY = 'login_display_title'
const USER_ID_KEY = 'login_user_id'
const USER_NAME_KEY = 'login_user_name'
const USER_AVATAR_KEY = 'login_user_avatar'
const USER_AVATAR_FILE_ID_KEY = 'login_user_avatar_file_id'
const PERMISSIONS_KEY = 'login_permissions'
const CURRENT_TENANT_ID_KEY = 'login_tenant_id'
const AVAILABLE_TENANTS_KEY = 'login_available_tenants'
const SESSION_ID_KEY = 'login_session_id'
const SESSION_VERSION_KEY = 'login_session_version'

export type AccessTokenPersistence = 'session' | 'persistent'

export interface StoredAuthSession {
  accessToken: string
  loginState: string
  account: string
  currentTenantName?: string
  currentTenantCode?: string
  userId?: string
  userName?: string
  avatarUrl?: string
  avatarFileId?: string
  displayTitle?: string
  permissions?: string[]
  currentTenantId?: number
  availableTenants?: StoredTenantOption[]
  sessionId?: number
  sessionVersion?: VersionToken
}

export interface StoredTenantOption {
  tenantId: number
  tenantUserId: number
  tenantCode: string
  tenantName: string
  tenantType: string
  logoUrl: string
  timezone: string
  isDefault: boolean
}

function browserStorageAvailable(): boolean {
  return typeof window !== 'undefined'
}

export function getStoredAccessToken(): string | null {
  if (!browserStorageAvailable()) return null
  return (
    window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ?? window.localStorage.getItem(ACCESS_TOKEN_KEY)
  )
}

export function getStoredAuthSession(): StoredAuthSession | null {
  if (!browserStorageAvailable()) return null

  const storage = window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
    ? window.sessionStorage
    : window.localStorage.getItem(ACCESS_TOKEN_KEY)
      ? window.localStorage
      : null
  if (!storage) return null

  const accessToken = storage.getItem(ACCESS_TOKEN_KEY)
  const loginState = storage.getItem(LOGIN_STATE_KEY)
  const account = storage.getItem(ACCOUNT_KEY)
  if (!accessToken || !loginState || !account) return null

  const currentTenantName = storage.getItem(TENANT_NAME_KEY)
  const currentTenantCode = storage.getItem(TENANT_CODE_KEY)
  const userId = storage.getItem(USER_ID_KEY)
  const userName = storage.getItem(USER_NAME_KEY)
  const avatarUrl = storage.getItem(USER_AVATAR_KEY)
  const avatarFileId = storage.getItem(USER_AVATAR_FILE_ID_KEY)
  const displayTitle = storage.getItem(DISPLAY_TITLE_KEY)
  const storedPermissions = storage.getItem(PERMISSIONS_KEY)
  const currentTenantId = Number(storage.getItem(CURRENT_TENANT_ID_KEY)) || undefined
  const sessionId = Number(storage.getItem(SESSION_ID_KEY)) || undefined
  const sessionVersion = storage.getItem(SESSION_VERSION_KEY) || undefined
  const storedAvailableTenants = storage.getItem(AVAILABLE_TENANTS_KEY)
  let permissions: string[] = []
  let availableTenants: StoredTenantOption[] = []
  if (storedPermissions) {
    try {
      const parsed = JSON.parse(storedPermissions) as unknown
      if (Array.isArray(parsed)) {
        permissions = parsed.filter((item): item is string => typeof item === 'string')
      }
    } catch {
      permissions = []
    }
  }
  if (storedAvailableTenants) {
    try {
      const parsed = JSON.parse(storedAvailableTenants) as unknown
      if (Array.isArray(parsed)) availableTenants = parsed as StoredTenantOption[]
    } catch {
      availableTenants = []
    }
  }
  return {
    accessToken,
    loginState,
    account,
    ...(currentTenantName ? { currentTenantName } : {}),
    ...(currentTenantCode ? { currentTenantCode } : {}),
    ...(userId ? { userId } : {}),
    ...(userName ? { userName } : {}),
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(avatarFileId ? { avatarFileId } : {}),
    ...(displayTitle ? { displayTitle } : {}),
    ...(permissions.length ? { permissions } : {}),
    ...(currentTenantId ? { currentTenantId } : {}),
    ...(availableTenants.length ? { availableTenants } : {}),
    ...(sessionId ? { sessionId } : {}),
    ...(sessionVersion ? { sessionVersion } : {}),
  }
}

export function setStoredAccessToken(
  accessToken: string,
  persistence: AccessTokenPersistence = 'session',
): void {
  if (!browserStorageAvailable()) return
  clearStoredAccessToken()
  const storage = persistence === 'persistent' ? window.localStorage : window.sessionStorage
  storage.setItem(ACCESS_TOKEN_KEY, accessToken)
}

export function setStoredAuthSession(
  session: StoredAuthSession,
  persistence: AccessTokenPersistence = 'session',
): void {
  if (!browserStorageAvailable()) return
  clearStoredAuthSession()
  const storage = persistence === 'persistent' ? window.localStorage : window.sessionStorage
  storage.setItem(ACCESS_TOKEN_KEY, session.accessToken)
  storage.setItem(LOGIN_STATE_KEY, session.loginState)
  storage.setItem(ACCOUNT_KEY, session.account)
  if (session.currentTenantName) storage.setItem(TENANT_NAME_KEY, session.currentTenantName)
  if (session.currentTenantCode) storage.setItem(TENANT_CODE_KEY, session.currentTenantCode)
  if (session.userId) storage.setItem(USER_ID_KEY, session.userId)
  if (session.userName) storage.setItem(USER_NAME_KEY, session.userName)
  if (session.avatarUrl) storage.setItem(USER_AVATAR_KEY, session.avatarUrl)
  if (session.avatarFileId) storage.setItem(USER_AVATAR_FILE_ID_KEY, session.avatarFileId)
  if (session.displayTitle) storage.setItem(DISPLAY_TITLE_KEY, session.displayTitle)
  if (session.permissions?.length) {
    storage.setItem(PERMISSIONS_KEY, JSON.stringify(session.permissions))
  }
  if (session.currentTenantId) {
    storage.setItem(CURRENT_TENANT_ID_KEY, String(session.currentTenantId))
  }
  if (session.availableTenants?.length) {
    storage.setItem(AVAILABLE_TENANTS_KEY, JSON.stringify(session.availableTenants))
  }
  if (session.sessionId) storage.setItem(SESSION_ID_KEY, String(session.sessionId))
  if (session.sessionVersion) storage.setItem(SESSION_VERSION_KEY, session.sessionVersion)
}

export function updateStoredAuthSession(
  patch: Partial<Omit<StoredAuthSession, 'accessToken' | 'loginState' | 'account'>>,
): void {
  if (!browserStorageAvailable()) return
  const current = getStoredAuthSession()
  if (!current) return
  const persistence: AccessTokenPersistence = window.sessionStorage.getItem(ACCESS_TOKEN_KEY)
    ? 'session'
    : 'persistent'
  setStoredAuthSession({ ...current, ...patch }, persistence)
}

export function replaceStoredAuthSession(session: StoredAuthSession): void {
  if (!browserStorageAvailable()) return
  const persistence: AccessTokenPersistence = window.localStorage.getItem(ACCESS_TOKEN_KEY)
    ? 'persistent'
    : 'session'
  setStoredAuthSession(session, persistence)
}

export function clearStoredAccessToken(): void {
  if (!browserStorageAvailable()) return
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  window.localStorage.removeItem(ACCESS_TOKEN_KEY)
}

export function clearStoredAuthSession(): void {
  if (!browserStorageAvailable()) return
  for (const storage of [window.sessionStorage, window.localStorage]) {
    storage.removeItem(ACCESS_TOKEN_KEY)
    storage.removeItem(LOGIN_STATE_KEY)
    storage.removeItem(ACCOUNT_KEY)
    storage.removeItem(TENANT_NAME_KEY)
    storage.removeItem(TENANT_CODE_KEY)
    storage.removeItem(USER_ID_KEY)
    storage.removeItem(USER_NAME_KEY)
    storage.removeItem(USER_AVATAR_KEY)
    storage.removeItem(USER_AVATAR_FILE_ID_KEY)
    storage.removeItem(DISPLAY_TITLE_KEY)
    storage.removeItem(PERMISSIONS_KEY)
    storage.removeItem(CURRENT_TENANT_ID_KEY)
    storage.removeItem(AVAILABLE_TENANTS_KEY)
    storage.removeItem(SESSION_ID_KEY)
    storage.removeItem(SESSION_VERSION_KEY)
  }
}
