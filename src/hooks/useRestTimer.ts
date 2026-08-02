import { useEffect, useState } from 'react'
import { elapsedSeconds } from '@/domain/duration'

const TICK_INTERVAL_MS = 1000

/**
 * 指定した時刻からの経過秒数を1秒ごとに返す。
 *
 * iOS の Web アプリはバックグラウンドや画面ロック中に JavaScript が止まるため、
 * 経過時間は「開始時刻との差分」で毎回計算し直す。
 * こうすることで、アプリに戻ったときに正しい経過時間が表示される。
 */
export function useRestTimer(startedAtIso: string | null): number {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (startedAtIso === null) return undefined

    const syncNow = () => setNowMs(Date.now())
    syncNow()

    const intervalId = window.setInterval(syncNow, TICK_INTERVAL_MS)
    // 復帰直後にずれた表示が残らないよう、可視状態の変化でも再計算する
    document.addEventListener('visibilitychange', syncNow)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', syncNow)
    }
  }, [startedAtIso])

  if (startedAtIso === null) return 0
  return elapsedSeconds(startedAtIso, nowMs)
}
