export interface AppShellBranding {
  brandName: string
  platformName: string
  logoUrl: string
}

export const DEFAULT_SHELL_BRANDING: Readonly<AppShellBranding> = Object.freeze({
  brandName: '陆链控制台',
  platformName: '多式联运智慧调度平台',
  // Empty URL uses the existing bundled cube icon; no external default asset.
  logoUrl: '',
})

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function imageUrl(value: unknown): string {
  const url = text(value)
  if (
    !url ||
    /[\s\\]/u.test(url) ||
    [...url].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
  )
    return ''
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const parsed = new URL(url)
    return ['https:', 'http:'].includes(parsed.protocol) && !parsed.username && !parsed.password
      ? url
      : ''
  } catch {
    return ''
  }
}

export function resolveAppShellBranding(value: {
  brandName?: unknown
  platformName?: unknown
  logoUrl?: unknown
}): AppShellBranding {
  return {
    brandName: text(value.brandName) || DEFAULT_SHELL_BRANDING.brandName,
    platformName: text(value.platformName) || DEFAULT_SHELL_BRANDING.platformName,
    logoUrl: imageUrl(value.logoUrl),
  }
}
