import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ChevronRightIcon } from '@/components/icons'
import { buildExerciseProgress } from '@/domain/progress'
import type { ExerciseId } from '@/domain/types'
import { useExercises } from '@/hooks/useExercises'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { ExerciseWeightChart } from './ExerciseWeightChart'
import { WeeklySetsCard } from './WeeklySetsCard'
import styles from './ChartsPage.module.css'

export function ChartsPage() {
  const { exerciseById, allExercises } = useExercises()
  const { allSets, dateByWorkoutId, isLoading } = useWorkoutHistory()

  const [selectedExerciseId, setSelectedExerciseId] = useState<ExerciseId | null>(null)

  // 記録が1件でもある種目だけを選択肢に出す
  const recordedExercises = useMemo(() => {
    const recordedIds = new Set(allSets.map((set) => set.exerciseId))
    return allExercises.filter(
      (exercise) => exercise.id !== undefined && recordedIds.has(exercise.id),
    )
  }, [allSets, allExercises])

  const activeExerciseId = selectedExerciseId ?? recordedExercises[0]?.id ?? null
  const activeExercise =
    activeExerciseId === null ? undefined : exerciseById.get(activeExerciseId)

  const progress = useMemo(() => {
    if (activeExercise?.id === undefined) return []
    const exerciseSets = allSets.filter((set) => set.exerciseId === activeExercise.id)
    return buildExerciseProgress(exerciseSets, dateByWorkoutId)
  }, [activeExercise, allSets, dateByWorkoutId])

  const bestWeight = progress.reduce((max, point) => Math.max(max, point.maxWeightKg), 0)
  const bestOneRepMax = progress.reduce(
    (max, point) => Math.max(max, point.estimatedOneRepMaxKg ?? 0),
    0,
  )

  if (isLoading) {
    return (
      <>
        <PageHeader title="グラフ" />
        <p className="empty-state">読み込み中…</p>
      </>
    )
  }

  if (recordedExercises.length === 0) {
    return (
      <>
        <PageHeader title="グラフ" />
        <div className={styles.content}>
          <WeeklySetsCard />
          <p className="empty-state">
            記録が貯まると、ここに種目ごとの推移が表示されます。
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="グラフ" />

      <div className={styles.content}>
        <WeeklySetsCard />

        <select
          value={activeExerciseId ?? ''}
          onChange={(event) => setSelectedExerciseId(Number(event.target.value))}
          aria-label="表示する種目"
        >
          {recordedExercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>重量の推移</h2>

          <div className={styles.best}>
            <div className={styles.bestMetric}>
              <div className={styles.bestValue}>{bestWeight} kg</div>
              <div className={styles.bestLabel}>自己ベスト重量</div>
            </div>
            <div className={styles.bestMetric}>
              <div className={styles.bestValue}>
                {bestOneRepMax > 0 ? `${bestOneRepMax} kg` : '—'}
              </div>
              <div className={styles.bestLabel}>推定1RMの最高</div>
            </div>
          </div>

          <ExerciseWeightChart points={progress} />

          {activeExerciseId !== null && (
            <Link to={`/exercises/${activeExerciseId}`} className={styles.detailLink}>
              この種目のカルテを見る
              <ChevronRightIcon size={16} />
            </Link>
          )}
        </section>

      </div>
    </>
  )
}
