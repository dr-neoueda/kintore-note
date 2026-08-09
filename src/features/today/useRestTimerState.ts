import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listSetsByWorkout } from '@/data/repositories/setRepository'
import { getSettings } from '@/data/repositories/settingsRepository'
import { getWorkoutByDate } from '@/data/repositories/workoutRepository'
import {
  DEFAULT_REST_ALARM_DURATION_SEC,
  REST_ALARM_GRACE_SEC,
} from '@/domain/restAlarm'
import type { WorkoutSet } from '@/domain/types'
import { useExercises } from '@/hooks/useExercises'
import { useRestTimer } from '@/hooks/useRestTimer'
import { useTodayKey } from '@/hooks/useTodayKey'
import { useWakeLock } from '@/hooks/useWakeLock'
import { useRestAlarm } from './useRestAlarm'

/** これを超えて経過した休憩は、記録・表示ともに意味を持たないため打ち切る。 */
const MAX_REST_SECONDS = 30 * 60

export interface RestTimerState {
  readonly isVisible: boolean
  readonly seconds: number
  readonly targetSeconds: number
  readonly dismiss: () => void
}

/**
 * 休憩タイマーの状態。
 *
 * ホーム画面の中に置くと、履歴やグラフを見に行った瞬間に消えてしまう。
 * 休憩中に他の画面を見るのは普通の使い方なので、画面をまたいで生き続けるよう
 * アプリ全体の枠（AppShell）から呼ぶ。
 */
export function useRestTimerState(): RestTimerState {
  const todayKey = useTodayKey()
  const { exerciseById } = useExercises()
  const settings = useLiveQuery(() => getSettings(), [])

  const workout = useLiveQuery(() => getWorkoutByDate(todayKey), [todayKey])
  const workoutId = workout?.id

  const sets = useLiveQuery(
    () => (workoutId === undefined ? Promise.resolve<WorkoutSet[]>([]) : listSetsByWorkout(workoutId)),
    [workoutId],
  )

  const lastSet = sets === undefined ? undefined : sets[sets.length - 1]
  const seconds = useRestTimer(lastSet?.recordedAt ?? null)

  const [dismissedSetId, setDismissedSetId] = useState<number | null>(null)

  // 新しいセットを記録したら、閉じていても出し直す
  useEffect(() => {
    if (lastSet?.id !== undefined && dismissedSetId !== null && lastSet.id !== dismissedSetId) {
      setDismissedSetId(null)
    }
  }, [lastSet?.id, dismissedSetId])

  const targetSeconds =
    lastSet === undefined
      ? 0
      : lastSet.restTargetSec ?? exerciseById.get(lastSet.exerciseId)?.restSec ?? 0

  const isDismissed = lastSet?.id !== undefined && lastSet.id === dismissedSetId
  const isVisible = !isDismissed && lastSet !== undefined && seconds < MAX_REST_SECONDS

  const isRestAlarmEnabled = settings?.isRestAlarmEnabled ?? false

  useRestAlarm({
    restStartedAt: lastSet?.recordedAt ?? null,
    elapsedSeconds: seconds,
    targetSeconds,
    isEnabled: isRestAlarmEnabled,
    durationSec: settings?.restAlarmDurationSec ?? DEFAULT_REST_ALARM_DURATION_SEC,
  })

  // 目標に達するまでは画面を消させない。到達後は解放して電池の消費を抑える。
  useWakeLock(
    isVisible &&
      isRestAlarmEnabled &&
      targetSeconds > 0 &&
      seconds < targetSeconds + REST_ALARM_GRACE_SEC,
  )

  return {
    isVisible,
    seconds,
    targetSeconds,
    dismiss: () => setDismissedSetId(lastSet?.id ?? null),
  }
}
