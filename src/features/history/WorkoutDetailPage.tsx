import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { getMeasurementByDate } from '@/data/repositories/measurementRepository'
import { deleteWorkout } from '@/data/repositories/workoutRepository'
import { formatDateLabelWithYear, isValidDateKey } from '@/domain/date'
import { formatWeightKg } from '@/domain/weight'
import { useExercises } from '@/hooks/useExercises'
import { useLastSessions } from '@/hooks/useLastSessions'
import { CardioSection } from '../cardio/CardioSection'
import { useDailyEnergy } from '../today/useDailyEnergy'
import { WorkoutEditorBody } from '../workout/WorkoutEditorBody'
import { useWorkoutEditor } from '../workout/useWorkoutEditor'
import styles from './WorkoutDetailPage.module.css'

export function WorkoutDetailPage() {
  const { date = '' } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const { activeExercises } = useExercises()
  const lastSessionByExercise = useLastSessions()

  const editor = useWorkoutEditor({ dateKey: date })
  const { workout, summary } = editor

  const measurement = useLiveQuery(
    () => (isValidDateKey(date) ? getMeasurementByDate(date) : Promise.resolve(undefined)),
    [date],
  )
  // その日に測っていなくても、直近の体重があれば消費を出せる
  const energy = useDailyEnergy(date, editor.sets)
  const weightKg = energy.weightKg

  const handleDeleteWorkout = async () => {
    if (workout?.id === undefined) return

    const isConfirmed = window.confirm(
      `${formatDateLabelWithYear(date)} の記録をすべて削除します。よろしいですか？`,
    )
    if (!isConfirmed) return

    await deleteWorkout(workout.id)
    navigate('/history', { replace: true })
  }

  if (!isValidDateKey(date)) {
    return (
      <>
        <PageHeader title="記録" showBack />
        <p className="empty-state">日付が正しくありません。</p>
      </>
    )
  }

  return (
    <>
      <PageHeader title={formatDateLabelWithYear(date)} showBack />

      <div className={styles.content}>
        <div className={styles.summary}>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{summary.exerciseCount}</div>
            <div className={styles.metricLabel}>種目</div>
          </div>
          {energy.activeKcal > 0 && (
            <div className={styles.metric}>
              <div className={styles.metricValue} data-testid="active-kcal">
                {energy.activeKcal}
              </div>
              <div className={styles.metricLabel}>kcal</div>
            </div>
          )}
          <div className={styles.metric}>
            <div className={styles.metricValue}>{summary.workingSetCount}</div>
            <div className={styles.metricLabel}>セット</div>
          </div>
          {measurement !== undefined && (
            <div className={styles.metric}>
              <div className={styles.metricValue}>
                {formatWeightKg(measurement.weightKg)} kg
              </div>
              <div className={styles.metricLabel}>体重</div>
            </div>
          )}
        </div>

        <button
          type="button"
          className={styles.noteButton}
          aria-label="メモを記録"
          onClick={editor.openNote}
        >
          {workout?.note !== undefined && workout.note !== '' ? workout.note : 'メモを記録'}
        </button>

        <CardioSection date={date} weightKg={weightKg ?? null} />

        <WorkoutEditorBody
          editor={editor}
          activeExercises={activeExercises}
          showProgressionHints={false}
          lastSessionByExercise={lastSessionByExercise}
          emptyMessage="この日の記録はまだありません。種目を追加すると、後からでも記録できます。"
        />

        {workout !== undefined && (
          <button
            type="button"
            className={`btn btn-danger btn-block ${styles.danger}`}
            onClick={handleDeleteWorkout}
          >
            この日の記録を削除
          </button>
        )}
      </div>
    </>
  )
}
