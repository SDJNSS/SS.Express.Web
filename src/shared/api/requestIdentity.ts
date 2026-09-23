const DEVICE_ID_KEY = 'ss-express-device-id'

function randomIdentifier(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createRequestId(): string {
  return randomIdentifier()
}

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return randomIdentifier()

  try {
    const stored = window.localStorage.getItem(DEVICE_ID_KEY)
    if (stored) return stored

    const deviceId = randomIdentifier()
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId)
    return deviceId
  } catch {
    return randomIdentifier()
  }
}
