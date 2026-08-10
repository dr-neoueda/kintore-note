import { calcBmi, calcLeanBodyMassKg } from '@/domain/bodyComposition'
import { addDaysToDateKey, type DateKey } from '@/domain/date'
import { roundTo } from '@/domain/number'
import type { BodyMeasurement } from '@/domain/types'

/**
 * 体組成の推移。
 *
 * 体重は1日で1kg近く動く。水分と食事の残りで揺れるので、その日の値だけを見ても
 * 増えているのか減っているのかが読み取れない。移動平均を重ねて、揺れをならした線を出す。
 */

/** 移動平均をとる日数。体重の日内変動をならすのに、1週間ぶんが目安。 */
export const MOVING_AVERAGE_DAYS = 7

export interface BodyTrendPoint {
  readonly date: DateKey
  readonly weightKg: number
  /** 直近7日ぶんの平均。測っていない日は飛ばして、あるぶんだけで平均する。 */
  readonly movingAverageKg: number
  readonly bodyFatPercent: number | null
  readonly muscleMassKg: number | null
  readonly leanBodyMassKg: number | null
  readonly bmi: number | null
}

const WEIGHT_DECIMALS = 1
const PERCENT_DECIMALS = 1

/**
 * 測定を古い順に並べ、移動平均と導出値を添える。
 *
 * 移動平均は「直近7件」ではなく「直近7日」で取る。
 * 測り忘れた日があると件数では期間がばらつき、
 * 3週間前の値が今週の平均に混ざってしまうため。
 */
export function buildBodyTrend(
  measurements: readonly BodyMeasurement[],
  heightCm: number | null,
): BodyTrendPoint[] {
  const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date))

  return sorted.map((measurement, index) => {
    const windowStart = addDaysToDateKey(measurement.date, -(MOVING_AVERAGE_DAYS - 1))
    const window = sorted
      .slice(0, index + 1)
      .filter((candidate) => candidate.date >= windowStart)

    const sum = window.reduce((total, candidate) => total + candidate.weightKg, 0)

    return {
      date: measurement.date,
      weightKg: measurement.weightKg,
      movingAverageKg: roundTo(sum / window.length, WEIGHT_DECIMALS),
      bodyFatPercent: measurement.bodyFatPercent,
      muscleMassKg: measurement.muscleMassKg,
      leanBodyMassKg: calcLeanBodyMassKg(measurement.weightKg, measurement.bodyFatPercent),
      bmi: calcBmi(measurement.weightKg, heightCm),
    }
  })
}

/** 期間のはじめと終わりを比べた変化。 */
export interface MetricChange {
  readonly first: number
  readonly last: number
  readonly delta: number
  /** 1週間あたりの変化。期間が1日未満なら出さない。 */
  readonly perWeek: number | null
}

const DAYS_PER_WEEK = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

function daysBetween(from: DateKey, to: DateKey): number {
  const fromMs = Date.parse(`${from}T00:00:00Z`)
  const toMs = Date.parse(`${to}T00:00:00Z`)
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return 0
  return Math.round((toMs - fromMs) / MS_PER_DAY)
}

export interface DatedValue {
  readonly date: DateKey
  readonly value: number | null
}

/**
 * 期間のはじめと終わりの差を出す。
 * 値が1つしか無ければ変化は読み取れないので出さない。当て推量の傾向は示さない。
 */
export function calcMetricChange(
  points: readonly DatedValue[],
  decimals = WEIGHT_DECIMALS,
): MetricChange | null {
  const known = points.filter(
    (point): point is { date: DateKey; value: number } => point.value !== null,
  )
  const first = known[0]
  const last = known[known.length - 1]
  if (first === undefined || last === undefined || first === last) return null

  const delta = last.value - first.value
  const days = daysBetween(first.date, last.date)

  return {
    first: first.value,
    last: last.value,
    delta: roundTo(delta, decimals),
    perWeek: days <= 0 ? null : roundTo((delta / days) * DAYS_PER_WEEK, decimals),
  }
}

/** 体脂肪率のような割合は、kg と混ぜないよう小数1桁のまま扱う。 */
export const PERCENT_CHANGE_DECIMALS = PERCENT_DECIMALS
