import { format, parseISO } from 'date-fns'
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
