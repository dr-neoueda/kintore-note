import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
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
import { listAllCardioSessions } from '@/data/repositories/cardioRepository'
import { listMeasurements } from '@/data/repositories/measurementRepository'
import { calcLeanBodyMassKg } from '@/domain/bodyComposition'
import { formatShortDateLabel } from '@/domain/date'
import { DEFAULT_NUTRITION_TARGET } from '@/domain/nutritionTarget'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { CHART_PALETTES } from '../charts/chartPalette'
import { buildDailyExpenditure } from './dailyExpenditure'
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
  const measurements = useLiveQuery(() => listMeasurements(), [])
  const cardioSessions = useLiveQuery(() => listAllCardioSessions(), [])
  const { workouts, setsByWorkoutId } = useWorkoutHistory()

  /** 日ごとの消費エネルギー。摂取と並べて収支を読み取れるようにする。 */
  const expenditureByDate = useMemo(
    () =>
      buildDailyExpenditure({
        workouts,
        setsByWorkoutId,
        cardioSessions: cardioSessions ?? [],
        measurements: measurements ?? [],
      }),
    [workouts, setsByWorkoutId, cardioSessions, measurements],
  )
  const palette = CHART_PALETTES[useColorScheme()]

  const days = useMemo(() => summarizeMealDays(entries ?? []), [entries])
  const recent = useMemo(() => takeRecentDays(days, CHART_DAYS), [days])
  const average = useMemo(() => averageNutrition(recent), [recent])

  const target = settings?.nutritionTarget ?? DEFAULT_NUTRITION_TARGET

  const energyData = recent.map((day) => ({
    label: formatShortDateLabel(day.date),
    摂取: day.nutrition.kcal,
    // 消費が出せない日は線を飛ばす。0 にすると急落して見える
    消費: expenditureByDate.get(day.date)?.totalKcal || null,
  }))

  const hasExpenditure = energyData.some((point) => point.消費 !== null)

  /** 収支を出せる日だけの平均。基礎代謝を測っていない日は混ぜない。 */
  const averageBalance = useMemo(() => {
    const balances = recent
      .map((day) => {
        const expenditure = expenditureByDate.get(day.date)
        if (expenditure === undefined || !expenditure.hasBasal) return null
        return day.nutrition.kcal - expenditure.totalKcal
      })
      .filter((balance): balance is number => balance !== null)

    if (balances.length === 0) return null
    return Math.round(balances.reduce((sum, value) => sum + value, 0) / balances.length)
  }, [recent, expenditureByDate])

  const proteinData = recent.map((day) => ({
    label: formatShortDateLabel(day.date),
    たんぱく質: day.nutrition.protein,
  }))

  /** 体重は記録がある日だけを線でつなぐ。欠測日を0にすると急落して見える。 */
  const weightData = useMemo(
    () =>
      (measurements ?? [])
        .slice(0, WEIGHT_DAYS)
        .map((measurement) => ({
          label: formatShortDateLabel(measurement.date),
          date: measurement.date,
          体重: measurement.weightKg,
          除脂肪体重: calcLeanBodyMassKg(measurement.weightKg, measurement.bodyFatPercent),
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [measurements],
  )

  const hasLeanBodyMass = weightData.some((point) => point.除脂肪体重 !== null)

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

          {averageBalance !== null && (
            <p className={styles.balance} data-testid="average-balance">
              平均の収支 {averageBalance > 0 ? '+' : ''}
              {averageBalance} kcal / 日
              <span className={styles.balanceNote}>
                摂取 −（基礎代謝 + 運動）。基礎代謝を測った日だけで平均しています。
              </span>
            </p>
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            {hasExpenditure ? '摂取と消費の推移' : 'エネルギーの推移'}
          </h2>
          <p className={styles.cardNote}>
            棒が摂取、横線は目標の {target.kcal} kcal です。
            {hasExpenditure &&
              ' 折れ線は消費（基礎代謝 + 運動）です。日常生活の活動量は含んでいません。'}
          </p>
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={energyData} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} stroke={palette.axis} />
                <YAxis tick={axisStyle} stroke={palette.axis} width={40} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: palette.tooltipLabel }}
                  cursor={{ fill: palette.cursorFill }}
                />
                <ReferenceLine y={target.kcal} stroke={palette.grid} strokeDasharray="4 4" />
                <Bar dataKey="摂取" fill={palette.maxWeight} radius={[4, 4, 0, 0]} />
                {hasExpenditure && (
                  <Line
                    type="monotone"
                    dataKey="消費"
                    stroke={palette.oneRepMax}
                    strokeWidth={2}
                    dot={{ r: 3, fill: palette.oneRepMax, stroke: palette.oneRepMax }}
                    connectNulls
                  />
                )}
              </ComposedChart>
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
            食べた量の結果が出るのは体重です。ホームの「体組成を記録」で入れた値を出しています。
            {hasLeanBodyMass && ' 除脂肪体重は体重から脂肪を除いた重さで、筋量の増減を読み取れます。'}
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
                  {hasLeanBodyMass && (
                    <Line
                      type="monotone"
                      dataKey="除脂肪体重"
                      stroke={palette.oneRepMax}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={{ r: 2, fill: palette.oneRepMax, stroke: palette.oneRepMax }}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
