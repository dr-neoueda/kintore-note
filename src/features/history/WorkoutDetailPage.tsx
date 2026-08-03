import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { deleteWorkout } from '@/data/repositories/workoutRepository'
import { formatDateLabelWithYear, isValidDateKey } from '@/domain/date'
import { formatWeightKg } from '@/domain/weight'
import { useExercises } from '@/hooks/useExercises'
import { useLastSessions } from '@/hooks/useLastSessions'
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
            <div className={styles.metricValue}>
              {summary.totalVolumeKg.toLocaleString('ja-JP')} kg
            </div>
            <div className={styles.metricLabel}>総ボリューム</div>
          </div>
          <div className={styles.metric}>
            <div className={styles.metricValue}>{summary.workingSetCount}</div>
            <div className={styles.metricLabel}>セット</div>
          </div>
          {workout?.bodyWeightKg != null && (
            <div className={styles.metric}>
              <div className={styles.metricValue}>
                {formatWeightKg(workout.bodyWeightKg)} kg
              </div>
              <div className={styles.metricLabel}>体重</div>
            </div>
          )}
        </div>

        <button type="button" className={styles.noteButton} onClick={editor.openNote}>
          {workout?.note !== undefined && workout.note !== ''
            ? workout.note
            : '体重・メモを記録する'}
        </button>

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
