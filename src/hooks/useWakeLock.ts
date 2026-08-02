import { useEffect } from 'react'

/**
 * 画面が自動で消えないようにする（Screen Wake Lock API）。
 *
 * iOS の Web アプリは画面がロックされると JavaScript が止まり、
 * 休憩終了のアラームを鳴らせない。休憩中だけ画面を点けたままにすることで
 * 実用上は確実に鳴らせるようにする。
 *
 * 対応していない環境や省電力モードでは取得に失敗するが、
 * その場合も記録の妨げにはならないよう黙って諦める。
 */
export function useWakeLock(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return undefined
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return undefined

    let sentinel: WakeLockSentinel | null = null
    let isCancelled = false

    const acquire = async () => {
      try {
        const acquired = await navigator.wakeLock.request('screen')
        if (isCancelled) {
          await acquired.release()
          return
        }
        sentinel = acquired
      } catch {
        // 省電力モードなどでは取得できない
      }
    }

    // 画面を離れると自動で解放されるため、戻ってきたら取り直す
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && sentinel?.released !== false) {
        void acquire()
      }
    }

    void acquire()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isCancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void sentinel?.release().catch(() => {})
    }
  }, [isActive])
}
