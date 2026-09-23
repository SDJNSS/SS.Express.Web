const DEFAULT_API_BASE_URL = '/api'
const DEFAULT_API_TIMEOUT_MS = 15_000
const DEFAULT_UPLOAD_TIMEOUT_MS = 600_000
const DEFAULT_SUCCESS_CODES = ['0', '1', '200', 'SUCCESS']

function normalizeBaseUrl(value: string | undefined): string {
  const normalized = value?.trim() || DEFAULT_API_BASE_URL
  if (normalized === '/') return normalized
  return normalized.replace(/\/+$/u, '')
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseBoolean(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true'
}

function parseSuccessCodes(value: string | undefined): ReadonlySet<string> {
  const codes = value
    ?.split(',')
    .map((code) => code.trim())
    .filter(Boolean)

  return new Set(codes?.length ? codes : DEFAULT_SUCCESS_CODES)
}

export const apiConfig = Object.freeze({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL),
  timeoutMs: parsePositiveInteger(import.meta.env.VITE_API_TIMEOUT_MS, DEFAULT_API_TIMEOUT_MS),
  uploadTimeoutMs: parsePositiveInteger(
    import.meta.env.VITE_API_UPLOAD_TIMEOUT_MS,
    DEFAULT_UPLOAD_TIMEOUT_MS,
  ),
  withCredentials: parseBoolean(import.meta.env.VITE_API_WITH_CREDENTIALS),
  successCodes: parseSuccessCodes(import.meta.env.VITE_API_SUCCESS_CODES),
})
