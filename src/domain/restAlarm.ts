/**
 * 休憩終了の合図を鳴らすかどうかの判定。
 *
 * 副作用を持たない純粋な条件判定にして、画面側は結果に従って鳴らすだけにする。
 */

/**
 * 目標到達からこの秒数までに気づけば鳴らす。
 * これを過ぎてからアプリに戻ってきた場合は、鳴らしても驚かせるだけなので鳴らさない。
 */
export const REST_ALARM_GRACE_SEC = 10

export interface RestAlarmDurationOption {
  readonly seconds: number
  readonly label: string
}

/**
 * アラームを鳴らし続ける長さの選択肢。
 *
 * 気づきやすさは人と場所で違う（自宅なら短く、音楽をかけているなら長く）。
 * 秒数を直接入れさせるより、代表的な長さから選べる方が判断しやすい。
 */
export const REST_ALARM_DURATION_OPTIONS: readonly RestAlarmDurationOption[] = [
  { seconds: 1, label: '短い' },
  { seconds: 3, label: '標準' },
  { seconds: 6, label: '長い' },
  { seconds: 12, label: 'とても長い' },
]

export const DEFAULT_REST_ALARM_DURATION_SEC = 3

export const MIN_REST_ALARM_DURATION_SEC = 1
export const MAX_REST_ALARM_DURATION_SEC = 30

/** 設定値を、鳴らせる範囲に収める。 */
export function normalizeRestAlarmDurationSec(seconds: number): number {
  if (!Number.isFinite(seconds)) return DEFAULT_REST_ALARM_DURATION_SEC

  return Math.min(
    MAX_REST_ALARM_DURATION_SEC,
    Math.max(MIN_REST_ALARM_DURATION_SEC, Math.round(seconds)),
  )
}

export interface ShouldFireRestAlarmParams {
  readonly isEnabled: boolean
  /** 画面が見えているか。iOS では非表示中に音を鳴らせない。 */
  readonly isDocumentVisible: boolean
  /** 同じ休憩で既に鳴らしたか。 */
  readonly hasAlreadyFired: boolean
  readonly elapsedSeconds: number
  readonly targetSeconds: number
}

export function shouldFireRestAlarm({
  isEnabled,
  isDocumentVisible,
  hasAlreadyFired,
  elapsedSeconds,
  targetSeconds,
}: ShouldFireRestAlarmParams): boolean {
  if (!isEnabled) return false
  if (!isDocumentVisible) return false
  if (hasAlreadyFired) return false
  if (targetSeconds <= 0) return false

  return (
    elapsedSeconds >= targetSeconds &&
    elapsedSeconds < targetSeconds + REST_ALARM_GRACE_SEC
  )
}
