import type { ColorScheme } from '@/hooks/useColorScheme'

/**
 * グラフの配色。
 * Recharts には SVG の属性として色を渡すため CSS 変数を使えず、
 * 外観設定ごとの値をここで持つ。
 *
 * 白黒のため、2系列は「濃さ」と「線種（実線／破線）」で区別する。
 */
export interface ChartPalette {
  readonly maxWeight: string
  readonly oneRepMax: string
  readonly volume: string
  readonly grid: string
  readonly axis: string
  readonly axisText: string
  readonly tooltipBg: string
  readonly tooltipBorder: string
  readonly tooltipText: string
  readonly tooltipLabel: string
  readonly cursorFill: string
}

export const CHART_PALETTES: Readonly<Record<ColorScheme, ChartPalette>> = {
  light: {
    maxWeight: '#111113',
    oneRepMax: '#8e8f96',
    volume: '#55565c',
    grid: '#e0e0e2',
    axis: '#c9c9cc',
    axisText: '#6e6f75',
    tooltipBg: '#ffffff',
    tooltipBorder: '#e0e0e2',
    tooltipText: '#111113',
    tooltipLabel: '#55565c',
    cursorFill: 'rgba(17, 17, 19, 0.05)',
  },
  dark: {
    maxWeight: '#f2f2f4',
    oneRepMax: '#8a8a91',
    volume: '#a1a1a8',
    grid: '#2e2e32',
    axis: '#3a3a3f',
    axisText: '#8a8a91',
    tooltipBg: '#1c1c1f',
    tooltipBorder: '#2e2e32',
    tooltipText: '#f2f2f4',
    tooltipLabel: '#a1a1a8',
    cursorFill: 'rgba(242, 242, 244, 0.08)',
  },
}
