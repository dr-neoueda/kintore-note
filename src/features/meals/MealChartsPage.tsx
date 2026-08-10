import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/PageHeader'
import { listAllCardioSessions } from '@/data/repositories/cardioRepository'
import { listAllMealEntries } from '@/data/repositories/mealRepository'
import { listMeasurements } from '@/data/repositories/measurementRepository'
import { getSettings } from '@/data/repositories/settingsRepository'
import { DEFAULT_NUTRITION_TARGET } from '@/domain/nutritionTarget'
import { useTodayKey } from '@/hooks/useTodayKey'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { BodyChartsSection } from '../body/BodyChartsSection'
import { buildBodyTrend, calcMetricChange } from '../body/bodyTrend'
import {
  CHART_PERIODS,
  DEFAULT_CHART_PERIOD,
  filterByPeriod,
  type ChartPeriod,
} from '../charts/chartPeriod'
import { buildDailyExpenditure } from './dailyExpenditure'
import { summarizeMealDays } from './mealDays'
import { NutritionChartsSection } from './NutritionChartsSection'
import styles from './MealChartsPage.module.css'

type Tab = 'nutrition' | 'body'

const TABS: readonly { readonly key: Tab; readonly label: string }[] = [
  { key: 'nutrition', label: '栄養' },
  { key: 'body', label: 'からだ' },
]

/**
 * 記録を振り返る画面。
 *
 * 食べた量と消費、そして体組成は別々に見ても意味が薄い。
 * 同じ期間で切り替えて見られるようにして、
 * 「この2週間で収支がいくら余って、体重がどう動いたか」を追えるようにする。
 */
export function MealChartsPage() {
  const todayKey = useTodayKey()
  const [tab, setTab] = useState<Tab>('nutrition')
  const [period, setPeriod] = useState<ChartPeriod>(DEFAULT_CHART_PERIOD)

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
        todayKey,
      }),
    [workouts, setsByWorkoutId, cardioSessions, measurements, todayKey],
  )

  const allDays = useMemo(() => summarizeMealDays(entries ?? []), [entries])

  /** グラフは古い日から右へ並べる。 */
  const days = useMemo(
    () => filterByPeriod(allDays, todayKey, period).reverse(),
    [allDays, todayKey, period],
  )

  /** 収支から見積もった増減と突き合わせるため、同じ期間の体重の変化を出す。 */
  const weightChange = useMemo(() => {
    const trend = filterByPeriod(
      buildBodyTrend(measurements ?? [], settings?.heightCm ?? null),
      todayKey,
      period,
    )
    return calcMetricChange(
      trend.map((point) => ({ date: point.date, value: point.movingAverageKg })),
    )
  }, [measurements, settings, todayKey, period])

  const target = settings?.nutritionTarget ?? DEFAULT_NUTRITION_TARGET
  const hasAnyRecord = allDays.length > 0 || (measurements ?? []).length > 0

  if (entries === undefined || measurements === undefined) {
    return (
      <>
        <PageHeader title="グラフ" />
        <p className="empty-state">読み込み中…</p>
      </>
    )
  }

  if (!hasAnyRecord) {
    return (
      <>
        <PageHeader title="グラフ" />
        <p className="empty-state">記録が貯まると、ここに推移が表示されます。</p>
      </>
    )
  }

  return (
    <>
      <PageHeader title="グラフ" />

      <div className={styles.content}>
        <div className={styles.controls}>
          <div className={styles.segmented} role="tablist" aria-label="グラフの種類">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={`${styles.segment} ${tab === key ? styles.segmentActive : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.periods} role="group" aria-label="期間">
            {CHART_PERIODS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={period.key === option.key}
                className={`${styles.periodButton} ${
                  period.key === option.key ? styles.periodActive : ''
                }`}
                onClick={() => setPeriod(option)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'nutrition' ? (
          days.length === 0 ? (
            <p className="empty-state">この期間の食事の記録がありません。</p>
          ) : (
            <NutritionChartsSection
              days={days}
              expenditureByDate={expenditureByDate}
              target={target}
              weightChange={weightChange}
            />
          )
        ) : (
          <BodyChartsSection
            measurements={measurements}
            heightCm={settings?.heightCm ?? null}
            todayKey={todayKey}
            period={period}
          />
        )}
      </div>
    </>
  )
}
