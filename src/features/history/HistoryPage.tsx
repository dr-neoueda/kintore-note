import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ChevronRightIcon } from '@/components/icons'
import { listAllCardioSessions } from '@/data/repositories/cardioRepository'
import { formatDateLabelWithYear, isValidDateKey } from '@/domain/date'
import { summarizeWorkout } from '@/domain/workoutStats'
import { useExercises } from '@/hooks/useExercises'
import { useTodayKey } from '@/hooks/useTodayKey'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { MonthCalendar } from './MonthCalendar'
import {
  buildTrainingDays,
  formatCardioSummary,
  sumCardioDistanceKm,
} from './trainingDays'
import styles from './HistoryPage.module.css'

export function HistoryPage() {
  const navigate = useNavigate()
  const todayKey = useTodayKey()
  const { exerciseById } = useExercises()
  const { workouts, setsByWorkoutId, isLoading } = useWorkoutHistory()
  const cardioSessions = useLiveQuery(() => listAllCardioSessions(), [])

  /** 走っただけの日も運動した日として扱う。筋トレの記録が無くても数える。 */
  const trainingDays = useMemo(
    () => buildTrainingDays({ workouts, setsByWorkoutId, cardioSessions: cardioSessions ?? [] }),
    [workouts, setsByWorkoutId, cardioSessions],
  )

  const recordedDates = useMemo(
    () => new Set(trainingDays.map((day) => day.date)),
    [trainingDays],
  )

  /** 記録し忘れた日を後から入力できるようにする。 */
  const openDate = (dateKey: string) => {
    if (!isValidDateKey(dateKey)) return
    navigate(`/history/${dateKey}`)
  }

  return (
    <>
      <PageHeader title="履歴" subtitle={`${trainingDays.length} 日ぶんの記録`} />

      <div className={styles.content}>
        <MonthCalendar
          todayKey={todayKey}
          recordedDates={recordedDates}
          onSelect={openDate}
        />

        {isLoading && <p className="empty-state">読み込み中…</p>}

        {!isLoading && trainingDays.length === 0 && (
          <p className="empty-state">まだ記録がありません。</p>
        )}

        {trainingDays.map((day) => {
          const summary = summarizeWorkout(day.sets)
          const exerciseNames = [...new Set(day.sets.map((set) => set.exerciseId))]
            .map((id) => exerciseById.get(id)?.name)
            .filter((name): name is string => name !== undefined)

          const cardioSummary = formatCardioSummary(day.cardioSessions)
          const contents = [...exerciseNames, cardioSummary]
            .filter((text) => text !== '')
            .join('、')

          const hasStrength = summary.workingSetCount > 0

          return (
            <Link key={day.date} to={`/history/${day.date}`} className={styles.item}>
              <div className={styles.main}>
                <div className={styles.date}>{formatDateLabelWithYear(day.date)}</div>
                <div className={styles.exercises}>
                  {contents === '' ? '記録なし' : contents}
                </div>
              </div>
              <div className={styles.stats}>
                {hasStrength ? (
                  <>
                    <div className={styles.setCount}>{summary.workingSetCount} セット</div>
                    <div className={styles.exerciseCount}>{summary.exerciseCount} 種目</div>
                  </>
                ) : (
                  <>
                    <div className={styles.setCount}>
                      {sumCardioDistanceKm(day.cardioSessions)} km
                    </div>
                    <div className={styles.exerciseCount}>有酸素</div>
                  </>
                )}
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
