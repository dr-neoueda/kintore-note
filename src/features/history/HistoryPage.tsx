import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ChevronRightIcon } from '@/components/icons'
import { formatDateLabelWithYear, isValidDateKey } from '@/domain/date'
import { summarizeWorkout } from '@/domain/workoutStats'
import { useExercises } from '@/hooks/useExercises'
import { useTodayKey } from '@/hooks/useTodayKey'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { MonthCalendar } from './MonthCalendar'
import styles from './HistoryPage.module.css'

const EMPTY_SETS = Object.freeze([])

export function HistoryPage() {
  const navigate = useNavigate()
  const todayKey = useTodayKey()
  const { exerciseById } = useExercises()
  const { workouts, setsByWorkoutId, isLoading } = useWorkoutHistory()

  const recordedDates = useMemo(
    () => new Set(workouts.map((workout) => workout.date)),
    [workouts],
  )

  /** 記録し忘れた日を後から入力できるようにする。 */
  const openDate = (dateKey: string) => {
    if (!isValidDateKey(dateKey)) return
    navigate(`/history/${dateKey}`)
  }

  return (
    <>
      <PageHeader title="履歴" subtitle={`${workouts.length} 回のトレーニング`} />

      <div className={styles.content}>
        <MonthCalendar
          todayKey={todayKey}
          recordedDates={recordedDates}
          onSelect={openDate}
        />

        {isLoading && <p className="empty-state">読み込み中…</p>}

        {!isLoading && workouts.length === 0 && (
          <p className="empty-state">まだ記録がありません。</p>
        )}

        {workouts.map((workout) => {
          const sets = workout.id === undefined ? EMPTY_SETS : setsByWorkoutId.get(workout.id) ?? EMPTY_SETS
          const summary = summarizeWorkout(sets)
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
                <div className={styles.setCount}>{summary.workingSetCount} セット</div>
                <div className={styles.exerciseCount}>{summary.exerciseCount} 種目</div>
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
