export type ApiPath = `/${string}`

const absoluteUrlPattern = /^[a-z][a-z\d+.-]*:\/\//iu

export function defineApiPath(path: string): ApiPath {
  const normalized = path.trim()
  if (
    !normalized.startsWith('/') ||
    normalized.startsWith('//') ||
    absoluteUrlPattern.test(normalized)
  ) {
    throw new Error(`接口路径必须是以单个 / 开头的相对路径：${path}`)
  }
  return normalized as ApiPath
}

export function joinApiPath(basePath: ApiPath, endpointPath: ApiPath): ApiPath {
  const base = basePath === '/' ? '' : basePath.replace(/\/+$/u, '')
  return defineApiPath(`${base}${endpointPath}`)
}

export function resolveApiPath(
  template: ApiPath,
  parameters: Readonly<Record<string, string | number>>,
): ApiPath {
  const resolved = template.replace(/:([a-z][a-z\d]*)/giu, (placeholder, key: string) => {
    const value = parameters[key]
    return value === undefined ? placeholder : encodeURIComponent(String(value))
  })

  if (/:([a-z][a-z\d]*)/iu.test(resolved)) {
    throw new Error(`接口路径参数不完整：${template}`)
  }
  return defineApiPath(resolved)
}
