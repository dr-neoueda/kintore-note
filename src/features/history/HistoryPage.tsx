import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ChevronRightIcon } from '@/components/icons'
import { formatDateLabelWithYear, isValidDateKey, toDateKey } from '@/domain/date'
import { summarizeWorkout } from '@/domain/workoutStats'
import { useExercises } from '@/hooks/useExercises'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import styles from './HistoryPage.module.css'

const EMPTY_SETS = Object.freeze([])

export function HistoryPage() {
  const navigate = useNavigate()
  const { exerciseById } = useExercises()
  const { workouts, setsByWorkoutId, isLoading } = useWorkoutHistory()

  /** 記録し忘れた日を後から入力できるようにする。 */
  const openDate = (dateKey: string) => {
    if (!isValidDateKey(dateKey)) return
    navigate(`/history/${dateKey}`)
  }

  return (
    <>
      <PageHeader title="履歴" subtitle={`${workouts.length} 回のトレーニング`} />

      <div className={styles.content}>
        <div className={styles.datePicker}>
          <label className={styles.datePickerLabel} htmlFor="history-date">
            記録し忘れた日を入力する
          </label>
          <input
            id="history-date"
            type="date"
            max={toDateKey(new Date())}
            onChange={(event) => openDate(event.target.value)}
          />
        </div>

        {isLoading && <p className="empty-state">読み込み中…</p>}

        {!isLoading && workouts.length === 0 && (
          <p className="empty-state">まだ記録がありません。</p>
        )}

        {workouts.map((workout) => {
          const sets = workout.id === undefined ? EMPTY_SETS : setsByWorkoutId.get(workout.id) ?? EMPTY_SETS
          const summary = summarizeWorkout(sets, exerciseById)
          const exerciseNames = [...new Set(sets.map((set) => set.exerciseId))]
            .map((id) => exerciseById.get(id)?.name)
            .filter((name): name is string => name !== undefined)
            .join('、')

          return (
            <Link key={workout.id} to={`/history/${workout.date}`} className={styles.item}>
              <div className={styles.main}>
                <div className={styles.date}>{formatDateLabelWithYear(workout.date)}</div>
                <div className={styles.exercises}>
                  {exerciseNames === '' ? '記録なし' : exerciseNames}
                </div>
              </div>
              <div className={styles.stats}>
                <div className={styles.volume}>
                  {summary.totalVolumeKg.toLocaleString('ja-JP')} kg
                </div>
                <div className={styles.setCount}>{summary.workingSetCount} セット</div>
              </div>
              <span className={styles.chevron}>
                <ChevronRightIcon size={18} />
              </span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
