import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageHeader } from '@/components/PageHeader'
import { listAllMealEntries } from '@/data/repositories/mealRepository'
import { getSettings } from '@/data/repositories/settingsRepository'
import { listRecentWorkouts } from '@/data/repositories/workoutRepository'
import { formatShortDateLabel } from '@/domain/date'
import { DEFAULT_NUTRITION_TARGET } from '@/domain/nutritionTarget'
import { useColorScheme } from '@/hooks/useColorScheme'
import { CHART_PALETTES } from '../charts/chartPalette'
import { averageNutrition, summarizeMealDays, takeRecentDays } from './mealDays'
import styles from './MealChartsPage.module.css'

const AXIS_FONT_SIZE = 10

/** 画面幅に収まる日数。これ以上並べると目盛りが読めない。 */
const CHART_DAYS = 14

/** 体重の推移を出す期間。 */
const WEIGHT_DAYS = 60

export function MealChartsPage() {
  const entries = useLiveQuery(() => listAllMealEntries(), [])
  const settings = useLiveQuery(() => getSettings(), [])
  const workouts = useLiveQuery(() => listRecentWorkouts(WEIGHT_DAYS), [])
  const palette = CHART_PALETTES[useColorScheme()]

  const days = useMemo(() => summarizeMealDays(entries ?? []), [entries])
  const recent = useMemo(() => takeRecentDays(days, CHART_DAYS), [days])
  const average = useMemo(() => averageNutrition(recent), [recent])

  const target = settings?.nutritionTarget ?? DEFAULT_NUTRITION_TARGET

  const energyData = recent.map((day) => ({
    label: formatShortDateLabel(day.date),
    エネルギー: day.nutrition.kcal,
  }))

  const proteinData = recent.map((day) => ({
    label: formatShortDateLabel(day.date),
    たんぱく質: day.nutrition.protein,
  }))

  /** 体重は記録がある日だけを線でつなぐ。欠測日を0にすると急落して見える。 */
  const weightData = useMemo(
    () =>
      (workouts ?? [])
        .filter((workout) => workout.bodyWeightKg != null)
        .map((workout) => ({
          label: formatShortDateLabel(workout.date),
          date: workout.date,
          体重: workout.bodyWeightKg as number,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [workouts],
  )

  const axisStyle = { fill: palette.axisText, fontSize: AXIS_FONT_SIZE }
  const tooltipStyle = {
    background: palette.tooltipBg,
    border: `1px solid ${palette.tooltipBorder}`,
    borderRadius: 8,
    fontSize: 12,
    color: palette.tooltipText,
  }

  if (entries === undefined) {
    return (
      <>
        <PageHeader title="食事のグラフ" />
        <p className="empty-state">読み込み中…</p>
      </>
    )
  }

  if (days.length === 0) {
    return (
      <>
        <PageHeader title="食事のグラフ" />
        <p className="empty-state">記録が貯まると、ここに推移が表示されます。</p>
      </>
    )
  }

  return (
    <>
      <PageHeader title="食事のグラフ" />

      <div className={styles.content}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>直近{recent.length}日の平均</h2>
          <p className={styles.cardNote}>記録がある日だけで平均しています。</p>

          <div className={styles.averages}>
            <div className={styles.average}>
              <div className={styles.averageValue}>{average.kcal}</div>
              <div className={styles.averageLabel}>kcal / 日</div>
            </div>
            <div className={styles.average}>
              <div className={styles.averageValue}>{average.protein}</div>
              <div className={styles.averageLabel}>たんぱく質 g</div>
            </div>
            <div className={styles.average}>
              <div className={styles.averageValue}>{average.fat}</div>
              <div className={styles.averageLabel}>脂質 g</div>
            </div>
            <div className={styles.average}>
              <div className={styles.averageValue}>{average.carb}</div>
              <div className={styles.averageLabel}>炭水化物 g</div>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>エネルギーの推移</h2>
          <p className={styles.cardNote}>横線は目標の {target.kcal} kcal です。</p>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={energyData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} stroke={palette.axis} />
                <YAxis tick={axisStyle} stroke={palette.axis} width={40} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: palette.tooltipLabel }}
                  cursor={{ fill: palette.cursorFill }}
                />
                <ReferenceLine y={target.kcal} stroke={palette.oneRepMax} strokeDasharray="4 4" />
                <Bar dataKey="エネルギー" fill={palette.maxWeight} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>たんぱく質の推移</h2>
          <p className={styles.cardNote}>横線は目標の {target.protein} g です。</p>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={proteinData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} stroke={palette.axis} />
                <YAxis tick={axisStyle} stroke={palette.axis} width={40} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: palette.tooltipLabel }}
                  cursor={{ fill: palette.cursorFill }}
                />
                <ReferenceLine
                  y={target.protein}
                  stroke={palette.oneRepMax}
                  strokeDasharray="4 4"
                />
                <Bar dataKey="たんぱく質" fill={palette.maxWeight} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>体重の推移</h2>
          <p className={styles.cardNote}>
            食べた量の結果が出るのは体重です。ホームの「体重・メモ」で記録した値を出しています。
          </p>
          {weightData.length === 0 ? (
            <p className="empty-state">体重の記録がまだありません。</p>
          ) : (
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                  <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={axisStyle} stroke={palette.axis} />
                  <YAxis
                    tick={axisStyle}
                    stroke={palette.axis}
                    width={40}
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: palette.tooltipLabel }}
                  />
                  <Line
                    type="monotone"
                    dataKey="体重"
                    stroke={palette.maxWeight}
                    strokeWidth={2}
                    dot={{ r: 3, fill: palette.maxWeight, stroke: palette.maxWeight }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
