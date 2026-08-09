import { toDateKey, type DateKey } from './date'

/**
 * 月のカレンダーを組み立てる。
 *
 * 日付の選択に `input[type="date"]` を使うと、iOS Safari では
 * 開いた瞬間に今日が確定して change が飛び、過去の日を選べない。
 * ネイティブの選択 UI に頼らず、自前で月を描くための計算をここに置く。
 */

/** 'YYYY-MM' 形式の月。 */
export type MonthKey = string

const DAYS_PER_WEEK = 7

/** 月曜はじまり。週あたりのセット数の集計と揃える。 */
export const WEEKDAY_LABELS: readonly string[] = ['月', '火', '水', '木', '金', '土', '日']

export function toMonthKey(dateKey: DateKey): MonthKey {
  return dateKey.slice(0, 7)
}

export function isValidMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value)
}

function parseMonthKey(monthKey: MonthKey): { year: number; monthIndex: number } {
  const [year, month] = monthKey.split('-').map(Number)
  return { year: year ?? 1970, monthIndex: (month ?? 1) - 1 }
}

/** 月を前後に動かす。年またぎは Date に任せる。 */
export function addMonths(monthKey: MonthKey, months: number): MonthKey {
  const { year, monthIndex } = parseMonthKey(monthKey)
  const moved = new Date(year, monthIndex + months, 1)
  return toMonthKey(toDateKey(moved))
}

export function formatMonthLabel(monthKey: MonthKey): string {
  const { year, monthIndex } = parseMonthKey(monthKey)
  return `${year}年${monthIndex + 1}月`
}

/**
 * 月曜はじまりの週の並びを返す。
 * 前後の月にはみ出す枠は null にして、その月の日だけを扱えるようにする。
 */
export function buildMonthGrid(monthKey: MonthKey): (DateKey | null)[][] {
  const { year, monthIndex } = parseMonthKey(monthKey)

  const firstDay = new Date(year, monthIndex, 1)
  // getDay() は日曜が0。月曜はじまりに直す
  const leadingBlanks = (firstDay.getDay() + 6) % DAYS_PER_WEEK
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()

  const cells: (DateKey | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) =>
      toDateKey(new Date(year, monthIndex, index + 1)),
    ),
  ]

  while (cells.length % DAYS_PER_WEEK !== 0) cells.push(null)

  const weeks: (DateKey | null)[][] = []
  for (let index = 0; index < cells.length; index += DAYS_PER_WEEK) {
    weeks.push(cells.slice(index, index + DAYS_PER_WEEK))
  }
  return weeks
}
