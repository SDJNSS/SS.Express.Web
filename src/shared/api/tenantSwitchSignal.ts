import { clearStoredAuthSession, getStoredAuthSession, type StoredAuthSession } from './authSession'

const SIGNAL_KEY = 'ss-express-tenant-switch'

interface TenantSwitchSignal {
  sessionId: number
  sessionVersion: string
  tenantId: number
}

function parseSignal(value: string | null): TenantSwitchSignal | null {
  if (!value) return null
  try {
    const signal = JSON.parse(value) as Partial<TenantSwitchSignal>
    return Number.isSafeInteger(signal.sessionId) && Number.isSafeInteger(signal.tenantId) &&
      typeof signal.sessionVersion === 'string'
      ? signal as TenantSwitchSignal
      : null
  } catch {
    return null
  }
}

export function publishTenantSwitch(previous: StoredAuthSession): void {
  const current = getStoredAuthSession()
  if (!previous.sessionId || !current?.sessionVersion || previous.sessionId !== current.sessionId) return
  window.localStorage.setItem(SIGNAL_KEY, JSON.stringify({
    sessionId: current.sessionId,
    sessionVersion: current.sessionVersion,
    tenantId: current.currentTenantId,
  }))
}

export function observeTenantSwitch(): void {
  function revalidate() {
    const signal = parseSignal(window.localStorage.getItem(SIGNAL_KEY))
    const current = getStoredAuthSession()
    if (!signal || !current || current.sessionId !== signal.sessionId) return
    if (current.sessionVersion === signal.sessionVersion && current.currentTenantId === signal.tenantId) return

    // Never delete another tab's freshly switched persistent session.
    clearStoredAuthSession('session')
    const persistent = getStoredAuthSession('persistent')
    if (persistent?.sessionId === signal.sessionId && persistent.sessionVersion !== signal.sessionVersion) {
      clearStoredAuthSession('persistent')
    }
    window.location.replace(getStoredAuthSession() ? '/platform/welcome' : '/login')
  }
  window.addEventListener('storage', (event) => {
    if (event.key === SIGNAL_KEY) revalidate()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') revalidate()
  })
}
