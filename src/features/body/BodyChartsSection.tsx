import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DateKey } from '@/domain/date'
import { formatShortDateLabel } from '@/domain/date'
import type { BodyMeasurement } from '@/domain/types'
import { filterByPeriod, type ChartPeriod } from '../charts/chartPeriod'
import { useChartTheme } from '../charts/useChartTheme'
import { buildBodyTrend, calcMetricChange, MOVING_AVERAGE_DAYS } from './bodyTrend'
import { ChangeSummary } from './ChangeSummary'
import styles from './BodyChartsSection.module.css'

interface BodyChartsSectionProps {
  readonly measurements: readonly BodyMeasurement[]
  readonly heightCm: number | null
  readonly todayKey: DateKey
  readonly period: ChartPeriod
}

/** 体組成の推移。体重の揺れをならした線を重ね、増減の向きを読み取れるようにする。 */
export function BodyChartsSection({
  measurements,
  heightCm,
  todayKey,
  period,
}: BodyChartsSectionProps) {
  const theme = useChartTheme()

  /**
   * 移動平均は期間の外の測定も使う。
   * 期間の初日だけ平均が1点になって跳ねるのを避けるため、
   * 先に全期間で計算してから絞り込む。
   */
  const trend = useMemo(
    () => filterByPeriod(buildBodyTrend(measurements, heightCm), todayKey, period),
    [measurements, heightCm, todayKey, period],
  )

  const points = trend.map((point) => ({
    ...point,
    label: formatShortDateLabel(point.date),
  }))

  const weightChange = calcMetricChange(
    trend.map((point) => ({ date: point.date, value: point.movingAverageKg })),
  )
  const bodyFatChange = calcMetricChange(
    trend.map((point) => ({ date: point.date, value: point.bodyFatPercent })),
  )
  const leanChange = calcMetricChange(
    trend.map((point) => ({ date: point.date, value: point.leanBodyMassKg })),
  )

  const hasLean = points.some((point) => point.leanBodyMassKg !== null)
  const hasBodyFat = points.some((point) => point.bodyFatPercent !== null)
  const hasMuscle = points.some((point) => point.muscleMassKg !== null)
  const latestBmi = [...points].reverse().find((point) => point.bmi !== null)?.bmi ?? null

  if (points.length === 0) {
    return (
      <p className="empty-state">
        この期間の体組成の記録がありません。ホームの「体組成を記録」から入れられます。
      </p>
    )
  }

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>この期間の変化</h2>
        <p className={styles.cardNote}>
          体重は{MOVING_AVERAGE_DAYS}日移動平均で比べています。日ごとの水分の増減に
          振り回されずに、向きを読み取るためです。
        </p>

        <div className={styles.changes}>
          <ChangeSummary label="体重" unit="kg" change={weightChange} />
          {hasBodyFat && (
            <ChangeSummary label="体脂肪率" unit="%" change={bodyFatChange} />
          )}
          {hasLean && (
            <ChangeSummary label="除脂肪体重" unit="kg" change={leanChange} isGainGood />
          )}
        </div>

        {latestBmi !== null && (
          <p className={styles.bmi} data-testid="latest-bmi">
            直近の BMI <strong>{latestBmi}</strong>
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>体重の推移</h2>
        <p className={styles.cardNote}>
          細い実線が測った値、太い線が{MOVING_AVERAGE_DAYS}日移動平均です。
        </p>
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={theme.palette.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={theme.axisStyle} stroke={theme.palette.axis} />
              <YAxis
                tick={theme.axisStyle}
                stroke={theme.palette.axis}
                width={40}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip
                contentStyle={theme.tooltipStyle}
                labelStyle={theme.tooltipLabelStyle}
              />
              <Line
                type="monotone"
                dataKey="weightKg"
                name="体重"
                stroke={theme.palette.oneRepMax}
                strokeWidth={1}
                dot={{ r: 2, fill: theme.palette.oneRepMax, stroke: theme.palette.oneRepMax }}
              />
              <Line
                type="monotone"
                dataKey="movingAverageKg"
                name={`${MOVING_AVERAGE_DAYS}日平均`}
                stroke={theme.palette.maxWeight}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {(hasBodyFat || hasLean) && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>体脂肪と除脂肪体重</h2>
          <p className={styles.cardNote}>
            体重が同じでも、除脂肪体重が増えて体脂肪率が下がっていれば中身は変わっています。
          </p>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid
                  stroke={theme.palette.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="label" tick={theme.axisStyle} stroke={theme.palette.axis} />
                <YAxis
                  yAxisId="percent"
                  tick={theme.axisStyle}
                  stroke={theme.palette.axis}
                  width={34}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <YAxis
                  yAxisId="mass"
                  orientation="right"
                  tick={theme.axisStyle}
                  stroke={theme.palette.axis}
                  width={34}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip
                  contentStyle={theme.tooltipStyle}
                  labelStyle={theme.tooltipLabelStyle}
                />
                {hasBodyFat && (
                  <Line
                    yAxisId="percent"
                    type="monotone"
                    dataKey="bodyFatPercent"
                    name="体脂肪率 %"
                    stroke={theme.palette.oneRepMax}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 2, fill: theme.palette.oneRepMax, stroke: theme.palette.oneRepMax }}
                    connectNulls
                  />
                )}
                {hasLean && (
                  <Line
                    yAxisId="mass"
                    type="monotone"
                    dataKey="leanBodyMassKg"
                    name="除脂肪体重 kg"
                    stroke={theme.palette.maxWeight}
                    strokeWidth={2}
                    dot={{ r: 2, fill: theme.palette.maxWeight, stroke: theme.palette.maxWeight }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {hasMuscle && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>筋肉量の推移</h2>
          <p className={styles.cardNote}>体組成計が出した筋肉量です。</p>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid
                  stroke={theme.palette.grid}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis dataKey="label" tick={theme.axisStyle} stroke={theme.palette.axis} />
                <YAxis
                  tick={theme.axisStyle}
                  stroke={theme.palette.axis}
                  width={40}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip
                  contentStyle={theme.tooltipStyle}
                  labelStyle={theme.tooltipLabelStyle}
                />
                <Line
                  type="monotone"
                  dataKey="muscleMassKg"
                  name="筋肉量 kg"
                  stroke={theme.palette.maxWeight}
                  strokeWidth={2}
                  dot={{ r: 2, fill: theme.palette.maxWeight, stroke: theme.palette.maxWeight }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </>
  )
}
