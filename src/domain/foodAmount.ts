import type { FoodPortion } from './commonFoods'
import { roundTo } from './number'

/**
 * 個数で数える食品の単位。
 *
 * 梅干しや卵は「16g」より「2個」の方が分かりやすい。
 * どう数えるかは分量から読み取る。「1個 8g」と書いてあれば個で数えられると分かるので、
 * 食品ごとに別の項目を持たせずに済む。
 */
export interface CountUnit {
  /** 「個」「本」など、数え方。 */
  readonly label: string
  /** 1つあたりの重さ（g）。 */
  readonly gramsPerUnit: number
}

/**
 * 個数で数える助数詞。
 * 「1食分」「1皿分」のような目安は、2倍3倍しても量が定まらないので入れない。
 */
const COUNTERS: readonly string[] = [
  '個',
  '本',
  '枚',
  '切れ',
  '尾',
  '玉',
  'パック',
  '丁',
  '袋',
  '缶',
  '粒',
  '房',
  'かけ',
]

/** 分量に「1個」のようなものがあれば、その食品は個数で数えられる。 */
export function findCountUnit(
  portions: readonly FoodPortion[] | undefined,
): CountUnit | null {
  if (portions === undefined) return null

  for (const portion of portions) {
    if (portion.grams <= 0) continue
    const counter = COUNTERS.find((candidate) => portion.label === `1${candidate}`)
    if (counter !== undefined) return { label: counter, gramsPerUnit: portion.grams }
  }

  return null
}

/** 個数から重さへ。半端な数（0.5個）も扱えるようにする。 */
export function countToGrams(count: number, unit: CountUnit): number {
  if (!Number.isFinite(count) || count <= 0) return 0
  return Math.round(count * unit.gramsPerUnit)
}

/**
 * 重さから個数へ。
 * 割り切れなくても近い数を返す。単位を切り替えたときの表示に使う。
 */
export function gramsToCount(grams: number, unit: CountUnit): number {
  if (!Number.isFinite(grams) || grams <= 0 || unit.gramsPerUnit <= 0) return 0
  return roundTo(grams / unit.gramsPerUnit, 1)
}
