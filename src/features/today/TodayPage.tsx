import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { BackupReminderBanner } from '@/components/BackupReminderBanner'
import { PageHeader } from '@/components/PageHeader'
import { getSettings } from '@/data/repositories/settingsRepository'
import { listTemplates } from '@/data/repositories/templateRepository'
import { formatDateLabel } from '@/domain/date'
import { REST_ALARM_GRACE_SEC } from '@/domain/restAlarm'
import { formatWeightKg } from '@/domain/weight'
import { useExercises } from '@/hooks/useExercises'
import { useLastSessions } from '@/hooks/useLastSessions'
import { useRestTimer } from '@/hooks/useRestTimer'
import { useTodayKey } from '@/hooks/useTodayKey'
import { useWakeLock } from '@/hooks/useWakeLock'
import { WorkoutEditorBody } from '../workout/WorkoutEditorBody'
import { useWorkoutEditor } from '../workout/useWorkoutEditor'
import { RestTimerBar } from './RestTimerBar'
import { useRestAlarm } from './useRestAlarm'
import styles from './TodayPage.module.css'

/** これを超えて経過した休憩は、記録・表示ともに意味を持たないため打ち切る。 */
const MAX_REST_SECONDS = 30 * 60

export function TodayPage() {
  const todayKey = useTodayKey()
  const { activeExercises, exerciseById } = useExercises()
  const lastSessionByExercise = useLastSessions()

  const settings = useLiveQuery(() => getSettings(), [])
  const templates = useLiveQuery(() => listTemplates(), [])

  const [isRestVisible, setIsRestVisible] = useState(true)

  /**
   * 記録時に残す休憩秒数。
   * 経過時間は編集フックの結果（直前のセット）から決まるため、
   * フックの引数に直接は渡せない。描画のたびに最新値を入れておく。
   */
  const restSecondsRef = useRef<number | null>(null)

  const editor = useWorkoutEditor({
    dateKey: todayKey,
    resolveRestSec: () => restSecondsRef.current,
    onSetRecorded: () => setIsRestVisible(true),
  })

  const { lastSet, workout, summary } = editor
  const restSeconds = useRestTimer(lastSet?.recordedAt ?? null)
  // 休憩の目安は、直前のセットに記録した値。
  // 持たない古いセットは「その種目」の設定で補う。
  const restTargetSec =
    lastSet === undefined
      ? 0
      : lastSet.restTargetSec ?? exerciseById.get(lastSet.exerciseId)?.restSec ?? 0

  restSecondsRef.current =
    lastSet !== undefined && restSeconds < MAX_REST_SECONDS ? restSeconds : null

  const shouldShowRestTimer =
    isRestVisible && lastSet !== undefined && restSeconds < MAX_REST_SECONDS

  const isRestAlarmEnabled = settings?.isRestAlarmEnabled ?? false

  useRestAlarm({
    restStartedAt: lastSet?.recordedAt ?? null,
    elapsedSeconds: restSeconds,
    targetSeconds: restTargetSec,
    isEnabled: isRestAlarmEnabled,
  })

  // 目標に達するまでは画面を消させない。到達後は解放して電池の消費を抑える。
  useWakeLock(
    shouldShowRestTimer &&
      isRestAlarmEnabled &&
      restTargetSec > 0 &&
      restSeconds < restTargetSec + REST_ALARM_GRACE_SEC,
  )

  const hasSections = editor.sectionExerciseIds.length > 0
  const hasTemplates = templates !== undefined && templates.length > 0

  return (
    <>
      <PageHeader title="ホーム" subtitle={formatDateLabel(todayKey)} />

      <div
        className={
          shouldShowRestTimer
            ? `${styles.content} ${styles.contentWithRestTimer}`
            : styles.content
        }
      >
        <BackupReminderBanner />

        <div className={styles.summary}>
          <div className={styles.metric}>
            <span className={styles.metricValue} data-testid="exercise-count">
              {summary.exerciseCount}
            </span>
            <span className={styles.metricLabel}>種目</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricValue} data-testid="set-count">
              {summary.workingSetCount}
            </span>
            <span className={styles.metricLabel}>セット</span>
          </div>
        </div>

        <button type="button" className={styles.noteButton} onClick={editor.openNote}>
          {workout?.bodyWeightKg != null && (
            <span className={styles.noteValue}>
              体重 {formatWeightKg(workout.bodyWeightKg)} kg
            </span>
          )}
          <span className={workout?.note ? styles.noteValue : undefined}>
            {workout?.note !== undefined && workout.note !== ''
              ? workout.note
              : '体重・メモを記録する'}
          </span>
        </button>

        {!hasSections && hasTemplates && (
          <>
            <span className={styles.sectionLabel}>メニューから始める</span>
            <div className={styles.templates}>
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={styles.templateChip}
                  onClick={() =>
                    editor.addExercises(template.items.map((item) => item.exerciseId))
                  }
                >
                  {template.name}
                </button>
              ))}
            </div>
          </>
        )}

        <WorkoutEditorBody
          editor={editor}
          activeExercises={activeExercises}
          showProgressionHints
          lastSessionByExercise={lastSessionByExercise}
          emptyMessage="種目を追加して、今日のトレーニングを記録しましょう。"
        />
      </div>

      {shouldShowRestTimer && (
        <RestTimerBar
          seconds={restSeconds}
          targetSeconds={restTargetSec}
          onDismiss={() => setIsRestVisible(false)}
        />
      )}
    </>
  )
}
