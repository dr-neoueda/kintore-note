import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ProgressionHint } from '@/components/ProgressionHint'
import { ExternalLinkIcon } from '@/components/icons'
import { updateExerciseSettings } from '@/data/repositories/exerciseRepository'
import { getSettings } from '@/data/repositories/settingsRepository'
import { formatShortDateLabel } from '@/domain/date'
import { formatDuration } from '@/domain/duration'
import { buildExerciseSessions } from '@/domain/exerciseSessions'
import { buildExerciseProgress } from '@/domain/progress'
import { suggestNextSession } from '@/domain/progression'
import { describeProgression } from '@/domain/progressionText'
import { resolveReferenceLink } from '@/domain/reference'
import { formatSetSummary } from '@/domain/setFormat'
import { EQUIPMENT_LABELS, MUSCLE_ARCHITECTURE_LABELS } from '@/domain/types'
import { formatWeightKg } from '@/domain/weight'
import { useExercises } from '@/hooks/useExercises'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { ExerciseWeightChart } from '../charts/ExerciseWeightChart'
import {
  ExerciseSettingsSheet,
  type ExerciseSettingsValues,
} from './ExerciseSettingsSheet'
import styles from './ExerciseDetailPage.module.css'

export function ExerciseDetailPage() {
  const { exerciseId = '' } = useParams<{ exerciseId: string }>()
  const numericId = Number(exerciseId)

  const { exerciseById } = useExercises()
  const { allSets, dateByWorkoutId } = useWorkoutHistory()
  const settings = useLiveQuery(() => getSettings(), [])

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

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
  const referenceLink = resolveReferenceLink(exercise)

  const message =
    suggestion === null
      ? null
      : describeProgression({
          suggestion,
          target: exercise.target,
          dumbbellStepsKg: settings?.dumbbellStepsKg ?? [],
          isBodyweight,
        })

  const handleSaveSettings = async (values: ExerciseSettingsValues) => {
    await updateExerciseSettings(numericId, values)
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

        <a
          className={`btn btn-block ${styles.referenceButton}`}
          href={referenceLink.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLinkIcon size={18} />
          {referenceLink.isCustom ? 'フォームを確認' : 'YouTubeでフォームを検索'}
        </a>

        <section className={styles.card}>
          <div className={styles.targetRow}>
            <h2 className={styles.cardTitle}>この種目の設定</h2>
            <button
              type="button"
              className={styles.editButton}
              onClick={() => setIsSettingsOpen(true)}
            >
              変更
            </button>
          </div>

          <dl className={styles.settingList}>
            <div className={styles.settingRow}>
              <dt className={styles.settingLabel}>使う器具</dt>
              <dd className={styles.settingValue}>
                {EQUIPMENT_LABELS[exercise.equipment]}
                {exercise.equipment === 'dumbbell' &&
                  `（${exercise.dumbbellCount === 2 ? '両手に1個ずつ' : '片手ずつ'}）`}
              </dd>
            </div>
            <div className={styles.settingRow}>
              <dt className={styles.settingLabel}>筋の種類</dt>
              <dd className={styles.settingValue}>
                {MUSCLE_ARCHITECTURE_LABELS[exercise.muscleArchitecture]}
              </dd>
            </div>
            <div className={styles.settingRow}>
              <dt className={styles.settingLabel}>重量を上げる基準</dt>
              <dd className={styles.settingValue}>
                {exercise.target.repsMin}〜{exercise.target.repsMax}回 × {exercise.target.sets}
                セット
              </dd>
            </div>
            <div className={styles.settingRow}>
              <dt className={styles.settingLabel}>セット間の休憩</dt>
              <dd className={styles.settingValue}>{formatDuration(exercise.restSec)}</dd>
            </div>
            <div className={styles.settingRow}>
              <dt className={styles.settingLabel}>参考リンク</dt>
              <dd className={styles.settingValue}>
                {referenceLink.isCustom ? '保存済み' : '未設定（検索）'}
              </dd>
            </div>
          </dl>
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

      <ExerciseSettingsSheet
        isOpen={isSettingsOpen}
        title={exercise.name}
        initialValues={{
          equipment: exercise.equipment,
          dumbbellCount: exercise.dumbbellCount,
          muscleArchitecture: exercise.muscleArchitecture,
          target: exercise.target,
          restSec: exercise.restSec,
          referenceUrl: exercise.referenceUrl ?? '',
        }}
        onClose={() => setIsSettingsOpen(false)}
        onSubmit={handleSaveSettings}
      />
    </>
  )
}
