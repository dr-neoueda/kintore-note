import { endOfWeek, format, parseISO, startOfWeek, subWeeks } from 'date-fns'
import { ja } from 'date-fns/locale'

/** 'YYYY-MM-DD' 形式の日付キー。ローカルタイムゾーン基準。 */
export type DateKey = string

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Date をローカル日付の 'YYYY-MM-DD' に変換する。 */
export function toDateKey(date: Date): DateKey {
  return format(date, 'yyyy-MM-dd')
}

/** 'YYYY-MM-DD' 形式かどうかを判定する。 */
export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_PATTERN.test(value)) return false
  return !Number.isNaN(parseISO(value).getTime())
}

/** 日付キーを「8月2日(日)」のような表示用文字列にする。 */
export function formatDateLabel(dateKey: DateKey): string {
  if (!isValidDateKey(dateKey)) return dateKey
  return format(parseISO(dateKey), 'M月d日(E)', { locale: ja })
}

/** 日付キーを「2026年8月2日(日)」のような年付き文字列にする。 */
export function formatDateLabelWithYear(dateKey: DateKey): string {
  if (!isValidDateKey(dateKey)) return dateKey
  return format(parseISO(dateKey), 'yyyy年M月d日(E)', { locale: ja })
}

/** 日付キーをグラフの軸用の「8/2」形式にする。 */
export function formatShortDateLabel(dateKey: DateKey): string {
  if (!isValidDateKey(dateKey)) return dateKey
  return format(parseISO(dateKey), 'M/d')
}

/** 後から入力した記録に付ける時刻の基準（その日の正午）。 */
const BACKFILL_HOUR = 12

/**
 * セットの記録時刻を決める。
 *
 * 過去の日付を後から入力するとき、現在時刻をそのまま使うと
 * 「最も新しい記録」の判定が実際の実施順と食い違ってしまう。
 * そのため、当日以外はその日の正午を記録時刻にする。
 */
export function buildRecordedAt(dateKey: DateKey, now: Date): string {
  if (!isValidDateKey(dateKey)) return now.toISOString()
  if (dateKey === toDateKey(now)) return now.toISOString()

  const date = parseISO(dateKey)
  date.setHours(BACKFILL_HOUR, 0, 0, 0)
  return date.toISOString()
}

export interface DateRange {
  /** 開始日（この日を含む）。 */
  readonly fromDate: DateKey
  /** 終了日（この日を含む）。 */
  readonly toDate: DateKey
}

/** 週の始まりは月曜。週あたりのセット数を数える単位にする。 */
const WEEK_STARTS_ON = 1

/**
 * 指定日が属する週の範囲を返す。
 * weeksAgo に 1 を渡すと先週になる。
 */
export function getWeekRange(dateKey: DateKey, weeksAgo = 0): DateRange {
  const base = isValidDateKey(dateKey) ? parseISO(dateKey) : new Date()
  const target = subWeeks(base, weeksAgo)

  return {
    fromDate: toDateKey(startOfWeek(target, { weekStartsOn: WEEK_STARTS_ON })),
    toDate: toDateKey(endOfWeek(target, { weekStartsOn: WEEK_STARTS_ON })),
  }
}

/** 日付キーが範囲（両端を含む）に入っているか。 */
export function isWithinRange(dateKey: DateKey, range: DateRange): boolean {
  return dateKey >= range.fromDate && dateKey <= range.toDate
}

/** その日の始まり（ローカル 00:00）の ISO 文字列。 */
export function startOfDayIso(dateKey: DateKey): string {
  if (!isValidDateKey(dateKey)) return new Date(0).toISOString()

  const date = parseISO(dateKey)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}
