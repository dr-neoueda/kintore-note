import type { DateKey } from '@/domain/date'
import { roundTo } from '@/domain/number'
import type { DailyExpenditure } from './dailyExpenditure'
import type { MealDaySummary } from './mealDays'

/**
 * 摂取と消費の収支。
 *
 * 1日ぶんを見ても、食べ過ぎたかどうかは体重に現れない。
 * 積み上げてはじめて「この2週間で脂肪何kg分の差がついたか」が読み取れる。
 */

/**
 * 体脂肪1kg分のエネルギー（kcal）。
 * 脂肪組織は純粋な脂質ではなく水分なども含むため、9kcal/g より小さい。
 */
export const KCAL_PER_FAT_KG = 7200

export interface EnergyBalancePoint {
  readonly date: DateKey
  readonly intakeKcal: number
  readonly expenditureKcal: number
  /** 摂取 − 消費。プラスなら余っている。 */
  readonly balanceKcal: number
  /** その日までの収支の合計。 */
  readonly cumulativeKcal: number
}

interface BuildEnergyBalanceParams {
  /** 古い順に並んだ、食事の記録がある日。 */
  readonly days: readonly MealDaySummary[]
  readonly expenditureByDate: ReadonlyMap<DateKey, DailyExpenditure>
}

/**
 * 収支を日ごとに積み上げる。
 *
 * 基礎代謝が分からない日は消費が運動ぶんだけになり、収支が大きくプラスに振れる。
 * 積み上げると誤差もそのまま積み上がるので、そういう日は最初から含めない。
 */
export function buildEnergyBalance({
  days,
  expenditureByDate,
}: BuildEnergyBalanceParams): EnergyBalancePoint[] {
  const points: EnergyBalancePoint[] = []
  let cumulative = 0

  for (const day of days) {
    const expenditure = expenditureByDate.get(day.date)
    if (expenditure === undefined || !expenditure.hasBasal) continue

    const balance = day.nutrition.kcal - expenditure.totalKcal
    cumulative += balance

    points.push({
      date: day.date,
      intakeKcal: day.nutrition.kcal,
      expenditureKcal: expenditure.totalKcal,
      balanceKcal: balance,
      cumulativeKcal: cumulative,
    })
  }

  return points
}

/** 収支の合計を体脂肪の重さに直した目安（kg）。 */
export function toFatMassKg(kcal: number): number {
  return roundTo(kcal / KCAL_PER_FAT_KG, 2)
}

export interface EnergyBalanceSummary {
  readonly dayCount: number
  readonly averageIntakeKcal: number
  readonly averageExpenditureKcal: number
  readonly averageBalanceKcal: number
  readonly cumulativeKcal: number
  /** 収支の合計を体脂肪に換算した目安（kg）。 */
  readonly fatMassKg: number
}

/** 収支の出せた日だけでまとめる。出せる日が無ければ null。 */
export function summarizeEnergyBalance(
  points: readonly EnergyBalancePoint[],
): EnergyBalanceSummary | null {
  const last = points[points.length - 1]
  if (last === undefined) return null

  const count = points.length
  const totalIntake = points.reduce((sum, point) => sum + point.intakeKcal, 0)
  const totalExpenditure = points.reduce((sum, point) => sum + point.expenditureKcal, 0)

  return {
    dayCount: count,
    averageIntakeKcal: Math.round(totalIntake / count),
    averageExpenditureKcal: Math.round(totalExpenditure / count),
    averageBalanceKcal: Math.round((totalIntake - totalExpenditure) / count),
    cumulativeKcal: last.cumulativeKcal,
    fatMassKg: toFatMassKg(last.cumulativeKcal),
  }
}
