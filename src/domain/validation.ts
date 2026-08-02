import { RPE_MAX, RPE_MIN } from './types'

/** 入力値がドメインの制約を満たさないときに投げる。UI ではこの message をそのまま表示できる。 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/** 前後の空白を除いた文字列を返す。空文字なら弾く。 */
export function requireNonEmpty(value: string, label: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw new ValidationError(`${label}を入力してください`)
  }
  return trimmed
}

/** 1以上の整数であることを保証する。 */
export function requirePositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${label}は1以上の整数で入力してください`)
  }
  return value
}

/** 0以上の有限数であることを保証する。自重種目の重量0を許すため下限は0。 */
export function requireNonNegativeNumber(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${label}は0以上の数値で入力してください`)
  }
  return value
}

/** RPE は未入力（null）を許し、入力された場合のみ範囲を検査する。 */
export function requireValidRpe(value: number | null): number | null {
  if (value === null) return null
  if (!Number.isFinite(value) || value < RPE_MIN || value > RPE_MAX) {
    throw new ValidationError(`RPEは${RPE_MIN}〜${RPE_MAX}で入力してください`)
  }
  return value
}

/** 休憩秒数は未計測（null）を許し、入力された場合のみ0以上を検査する。 */
export function requireValidRestSec(value: number | null): number | null {
  if (value === null) return null
  return requireNonNegativeNumber(value, '休憩時間')
}
