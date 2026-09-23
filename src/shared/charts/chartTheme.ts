import type { EChartsCoreOption } from 'echarts/core'

import { readCssNumberToken, readCssToken } from '@shared/styles/runtimeTokens'

export interface ChartTheme {
  colors: string[]
  baseOption: EChartsCoreOption
  textPrimary: string
  textSecondary: string
  fontSizeXs: number
  fontSizeMetric: number
  spacing2: number
  spacing3: number
}

export function createChartTheme(): ChartTheme {
  const textPrimary = readCssToken('--text-primary')
  const textSecondary = readCssToken('--text-secondary')
  const fontSizeXs = readCssNumberToken('--font-size-xs')

  return {
    colors: [
      readCssToken('--color-success'),
      readCssToken('--color-primary'),
      readCssToken('--color-warning'),
      readCssToken('--color-danger'),
      readCssToken('--text-disabled'),
    ],
    baseOption: {
      animationDuration: 420,
      textStyle: {
        fontFamily: readCssToken('--font-family'),
        color: textSecondary,
        fontSize: fontSizeXs,
      },
      tooltip: {
        backgroundColor: readCssToken('--chart-tooltip-background'),
        borderWidth: 0,
        textStyle: { color: readCssToken('--text-inverse') },
      },
    },
    textPrimary,
    textSecondary,
    fontSizeXs,
    fontSizeMetric: readCssNumberToken('--font-size-metric'),
    spacing2: readCssNumberToken('--spacing-2'),
    spacing3: readCssNumberToken('--spacing-3'),
  }
}
