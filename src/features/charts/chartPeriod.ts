import { addDaysToDateKey, type DateKey } from '@/domain/date'

/**
 * グラフに出す期間。
 *
 * 直近だけを見ると日々の揺れに気を取られ、長く取ると細かい変化が潰れる。
 * 短期と長期を切り替えられるようにして、どちらの読み方もできるようにする。
 */

export interface ChartPeriod {
  readonly key: string
  readonly label: string
  readonly days: number
}

export const CHART_PERIODS: readonly ChartPeriod[] = [
  { key: '2w', label: '2週間', days: 14 },
  { key: '1m', label: '1か月', days: 30 },
  { key: '3m', label: '3か月', days: 90 },
]

export const DEFAULT_CHART_PERIOD: ChartPeriod = CHART_PERIODS[0] as ChartPeriod

/** その期間に入る最も古い日。 */
export function periodStartDate(todayKey: DateKey, period: ChartPeriod): DateKey {
  return addDaysToDateKey(todayKey, -(period.days - 1))
}

/** 期間に入るものだけを残す。日付を持つものなら何にでも使える。 */
export function filterByPeriod<T extends { readonly date: DateKey }>(
  items: readonly T[],
  todayKey: DateKey,
  period: ChartPeriod,
): T[] {
  const start = periodStartDate(todayKey, period)
  return items.filter((item) => item.date >= start)
}
