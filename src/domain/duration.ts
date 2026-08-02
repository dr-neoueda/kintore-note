const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3600
const MILLISECONDS_PER_SECOND = 1000

function padTwo(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * 秒数を M:SS（1時間以上なら H:MM:SS）形式にする。
 * 負の値や小数は 0 側に丸める。
 */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / SECONDS_PER_HOUR)
  const minutes = Math.floor((total % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  const remainingSeconds = total % SECONDS_PER_MINUTE

  if (hours > 0) {
    return `${hours}:${padTwo(minutes)}:${padTwo(remainingSeconds)}`
  }
  return `${minutes}:${padTwo(remainingSeconds)}`
}

/**
 * 開始時刻からの経過秒数を返す。
 * 現在時刻を引数で受け取るため純粋関数として扱える。
 * これにより、アプリがバックグラウンドに回ってタイマーが止まっても
 * 復帰時に正しい経過時間を再計算できる。
 */
export function elapsedSeconds(startedAtIso: string, nowMs: number): number {
  const startedMs = Date.parse(startedAtIso)
  if (Number.isNaN(startedMs)) return 0

  return Math.max(0, Math.floor((nowMs - startedMs) / MILLISECONDS_PER_SECOND))
}
