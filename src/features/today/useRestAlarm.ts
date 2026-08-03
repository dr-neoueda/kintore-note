import { useEffect, useRef } from 'react'
import { shouldFireRestAlarm } from '@/domain/restAlarm'
import { playRestAlarm } from '../workout/audioAlarm'

interface UseRestAlarmParams {
  /** 休憩の開始時刻。休憩ごとに1回だけ鳴らすための識別子も兼ねる。 */
  readonly restStartedAt: string | null
  readonly elapsedSeconds: number
  readonly targetSeconds: number
  readonly isEnabled: boolean
}

/** 休憩が目標時間に達したら、その休憩につき1回だけ合図を鳴らす。 */
export function useRestAlarm({
  restStartedAt,
  elapsedSeconds,
  targetSeconds,
  isEnabled,
}: UseRestAlarmParams): void {
  const firedForRestRef = useRef<string | null>(null)

  useEffect(() => {
    if (restStartedAt === null) return

    const shouldFire = shouldFireRestAlarm({
      isEnabled,
      isDocumentVisible:
        typeof document === 'undefined' || document.visibilityState === 'visible',
      hasAlreadyFired: firedForRestRef.current === restStartedAt,
      elapsedSeconds,
      targetSeconds,
    })
    if (!shouldFire) return

    firedForRestRef.current = restStartedAt
    void playRestAlarm()
  }, [restStartedAt, elapsedSeconds, targetSeconds, isEnabled])
}
