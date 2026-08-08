import type { DateKey } from '@/domain/date'
import { sumNutrition, type Nutrition } from '@/domain/nutrition'
import type { MealEntry } from '@/domain/types'

export interface MealDaySummary {
  readonly date: DateKey
  readonly nutrition: Nutrition
  readonly itemCount: number
}

/**
 * 食事の記録を日ごとにまとめ、新しい日から順に返す。
 * 履歴の一覧とグラフの両方で使う。
 */
export function summarizeMealDays(entries: readonly MealEntry[]): MealDaySummary[] {
  const byDate = new Map<DateKey, MealEntry[]>()

  for (const entry of entries) {
    const current = byDate.get(entry.date)
    if (current === undefined) byDate.set(entry.date, [entry])
    else current.push(entry)
  }

  return [...byDate.entries()]
    .map(([date, dayEntries]) => ({
      date,
      nutrition: sumNutrition(dayEntries.map((entry) => entry.nutrition)),
      itemCount: dayEntries.length,
    }))
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** 直近 days 日ぶんを、古い順（グラフの並び）で返す。 */
export function takeRecentDays(
  summaries: readonly MealDaySummary[],
  days: number,
): MealDaySummary[] {
  return [...summaries].slice(0, days).reverse()
}

/** 記録がある日だけを対象にした平均。記録のない日を0として薄めない。 */
export function averageNutrition(summaries: readonly MealDaySummary[]): Nutrition {
  if (summaries.length === 0) {
    return { kcal: 0, protein: 0, fat: 0, carb: 0, fiber: 0, salt: 0 }
  }

  const total = sumNutrition(summaries.map((summary) => summary.nutrition))
  const count = summaries.length

  return {
    kcal: Math.round(total.kcal / count),
    protein: Math.round((total.protein / count) * 10) / 10,
    fat: Math.round((total.fat / count) * 10) / 10,
    carb: Math.round((total.carb / count) * 10) / 10,
    fiber: Math.round((total.fiber / count) * 10) / 10,
    salt: Math.round((total.salt / count) * 10) / 10,
  }
}
