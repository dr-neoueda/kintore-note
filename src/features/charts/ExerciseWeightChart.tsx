import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatShortDateLabel } from '@/domain/date'
import type { ExerciseProgressPoint } from '@/domain/progress'
import { useColorScheme } from '@/hooks/useColorScheme'
import { CHART_PALETTES } from './chartPalette'
import styles from './ExerciseWeightChart.module.css'

interface ExerciseWeightChartProps {
  readonly points: readonly ExerciseProgressPoint[]
}

const AXIS_FONT_SIZE = 10

/** 1種目の最大重量と推定1RMの推移。グラフ画面と種目カルテの両方で使う。 */
export function ExerciseWeightChart({ points }: ExerciseWeightChartProps) {
  const palette = CHART_PALETTES[useColorScheme()]

  const axisStyle = { fill: palette.axisText, fontSize: AXIS_FONT_SIZE }
  const tooltipStyle = {
    background: palette.tooltipBg,
    border: `1px solid ${palette.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: palette.tooltipText,
  }

  const data = points.map((point) => ({
    label: formatShortDateLabel(point.date),
    最大重量: point.maxWeightKg,
    推定1RM: point.estimatedOneRepMaxKg,
  }))

  return (
    <>
      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={axisStyle} stroke={palette.axis} />
            <YAxis tick={axisStyle} stroke={palette.axis} width={40} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: palette.tooltipLabel }} />
            <Line
              type="monotone"
              dataKey="最大重量"
              stroke={palette.maxWeight}
              strokeWidth={2}
              // 既定の白抜きの点は地色に紛れるため、線と同じ色で塗りつぶす
              dot={{ r: 3, fill: palette.maxWeight, stroke: palette.maxWeight }}
            />
            <Line
              type="monotone"
              dataKey="推定1RM"
              stroke={palette.oneRepMax}
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.swatch} style={{ background: palette.maxWeight }} />
          最大重量
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchDashed}`} />
          推定1RM
        </span>
      </div>
    </>
  )
}
