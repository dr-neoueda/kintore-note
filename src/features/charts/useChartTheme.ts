import { useColorScheme } from '@/hooks/useColorScheme'
import { CHART_PALETTES, type ChartPalette } from './chartPalette'

/**
 * グラフの共通の見た目。
 *
 * Recharts には色を SVG の属性として渡すため CSS 変数が効かない。
 * 軸と吹き出しの指定は毎回同じなので、ここでまとめて作る。
 */

const AXIS_FONT_SIZE = 10
const TOOLTIP_FONT_SIZE = 12
const TOOLTIP_RADIUS = 8

export interface ChartTheme {
  readonly palette: ChartPalette
  readonly axisStyle: { readonly fill: string; readonly fontSize: number }
  readonly tooltipStyle: Readonly<Record<string, string | number>>
  readonly tooltipLabelStyle: { readonly color: string }
  readonly cursorStyle: { readonly fill: string }
}

export function useChartTheme(): ChartTheme {
  const palette = CHART_PALETTES[useColorScheme()]

  return {
    palette,
    axisStyle: { fill: palette.axisText, fontSize: AXIS_FONT_SIZE },
    tooltipStyle: {
      background: palette.tooltipBg,
      border: `1px solid ${palette.tooltipBorder}`,
      borderRadius: TOOLTIP_RADIUS,
      fontSize: TOOLTIP_FONT_SIZE,
      color: palette.tooltipText,
    },
    tooltipLabelStyle: { color: palette.tooltipLabel },
    cursorStyle: { fill: palette.cursorFill },
  }
}
