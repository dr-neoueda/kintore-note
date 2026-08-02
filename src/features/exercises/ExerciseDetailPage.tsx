import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ProgressionHint } from '@/components/ProgressionHint'
import { updateExerciseTarget } from '@/data/repositories/exerciseRepository'
import { getSettings } from '@/data/repositories/settingsRepository'
import { formatShortDateLabel } from '@/domain/date'
import { buildExerciseSessions } from '@/domain/exerciseSessions'
import { buildExerciseProgress } from '@/domain/progress'
import { suggestNextSession } from '@/domain/progression'
import { describeProgression } from '@/domain/progressionText'
import { formatSetSummary } from '@/domain/setFormat'
import type { ProgressionTarget } from '@/domain/types'
import { formatWeightKg } from '@/domain/weight'
import { useExercises } from '@/hooks/useExercises'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { ExerciseWeightChart } from '../charts/ExerciseWeightChart'
import { TargetEditorSheet } from './TargetEditorSheet'
import styles from './ExerciseDetailPage.module.css'

export function ExerciseDetailPage() {
  const { exerciseId = '' } = useParams<{ exerciseId: string }>()
  const numericId = Number(exerciseId)

  const { exerciseById } = useExercises()
  const { allSets, dateByWorkoutId } = useWorkoutHistory()
  const settings = useLiveQuery(() => getSettings(), [])

  const [isTargetOpen, setIsTargetOpen] = useState(false)

  const exercise = exerciseById.get(numericId)

  const exerciseSets = useMemo(
    () => allSets.filter((set) => set.exerciseId === numericId),
    [allSets, numericId],
  )

  const sessions = useMemo(
    () => buildExerciseSessions(exerciseSets, dateByWorkoutId),
    [exerciseSets, dateByWorkoutId],
  )

  const progress = useMemo(() => {
    if (exercise === undefined) return []
    return buildExerciseProgress(exerciseSets, exercise.dumbbellCount, dateByWorkoutId)
  }, [exercise, exerciseSets, dateByWorkoutId])

  const suggestion = useMemo(() => {
    if (exercise === undefined) return null
    return suggestNextSession({
      previousSets: sessions[0]?.sets ?? [],
      target: exercise.target,
      dumbbellStepsKg: settings?.dumbbellStepsKg ?? [],
      isBodyweight: exercise.equipment === 'bodyweight',
    })
  }, [exercise, sessions, settings?.dumbbellStepsKg])

  if (exercise === undefined) {
    return (
      <>
        <PageHeader title="種目" showBack />
        <p className="empty-state">この種目は見つかりませんでした。</p>
      </>
    )
  }

  const isBodyweight = exercise.equipment === 'bodyweight'
  const bestWeightKg = sessions.reduce((max, session) => Math.max(max, session.topWeightKg), 0)

  const message =
    suggestion === null
      ? null
      : describeProgression({
          suggestion,
          target: exercise.target,
          dumbbellStepsKg: settings?.dumbbellStepsKg ?? [],
          isBodyweight,
        })

  const handleSaveTarget = async (target: ProgressionTarget) => {
    await updateExerciseTarget(numericId, target)
  }

  return (
    <>
      <PageHeader title={exercise.name} showBack />

      <div className={styles.content}>
        <section className={styles.card}>
          <div className={styles.metrics}>
            <div className={styles.metric}>
              <div className={styles.metricValue}>
                {suggestion === null || isBodyweight
                  ? '—'
                  : `${formatWeightKg(suggestion.weightKg)} kg`}
              </div>
              <div className={styles.metricLabel}>今回の推奨</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricValue}>
                {isBodyweight || bestWeightKg === 0 ? '—' : `${formatWeightKg(bestWeightKg)} kg`}
              </div>
              <div className={styles.metricLabel}>自己ベスト</div>
            </div>
          </div>

          {message !== null && (
            <ProgressionHint
              message={message}
              isHighlighted={suggestion?.action === 'increase'}
            />
          )}
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>重量を上げる基準</h2>
          <div className={styles.targetRow}>
            <span className={styles.targetValue}>
              {exercise.target.repsMin}〜{exercise.target.repsMax}回 × {exercise.target.sets}
              セット
            </span>
            <button
              type="button"
              className={styles.editButton}
              onClick={() => setIsTargetOpen(true)}
            >
              変更
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>履歴</h2>
          {sessions.length === 0 ? (
            <p className="empty-state">まだ記録がありません。</p>
          ) : (
            <div className={styles.sessionList}>
              {sessions.map((session) => (
                <div key={session.workoutId} className={styles.session}>
                  <span className={styles.sessionDate}>
                    {formatShortDateLabel(session.date)}
                  </span>
                  <span className={styles.sessionSets}>{formatSetSummary(session.sets)}</span>
                  {session.isWeightIncreased && (
                    <span className={styles.increasedMark} aria-label="前回より増量">
                      ↑
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {progress.length > 0 && (
          <section className={styles.chartCard}>
            <h2 className={styles.cardTitle}>重量の推移</h2>
            <ExerciseWeightChart points={progress} />
          </section>
        )}
      </div>

      <TargetEditorSheet
        isOpen={isTargetOpen}
        title={`${exercise.name}の目標`}
        initialTarget={exercise.target}
        onClose={() => setIsTargetOpen(false)}
        onSubmit={handleSaveTarget}
      />
    </>
  )
}
