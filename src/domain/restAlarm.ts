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
