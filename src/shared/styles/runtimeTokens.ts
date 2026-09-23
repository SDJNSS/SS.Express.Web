type CssVariableName = `--${string}`

export function readCssToken(name: CssVariableName): string {
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()

  if (!value) {
    throw new Error(`Design Token ${name} 未定义`)
  }

  return value
}

export function readCssNumberToken(name: CssVariableName): number {
  const value = Number.parseFloat(readCssToken(name))

  if (!Number.isFinite(value)) {
    throw new Error(`Design Token ${name} 不是数值类型`)
  }

  return value
}
