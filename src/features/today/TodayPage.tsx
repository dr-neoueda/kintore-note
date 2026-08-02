import { useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PageHeader } from '@/components/PageHeader'
import { PlusIcon } from '@/components/icons'
import { getSettings } from '@/data/repositories/settingsRepository'
import {
  addSet,
  deleteSet,
  findPreviousSessionSets,
  listSetsByWorkout,
  updateSet,
} from '@/data/repositories/setRepository'
import { listTemplates } from '@/data/repositories/templateRepository'
import {
  getOrCreateWorkoutByDate,
  getWorkoutByDate,
  updateWorkout,
} from '@/data/repositories/workoutRepository'
import { formatDateLabel } from '@/domain/date'
import { suggestNextSession, type ProgressionSuggestion } from '@/domain/progression'
import { REST_ALARM_GRACE_SEC } from '@/domain/restAlarm'
import { describeProgression } from '@/domain/progressionText'
import type { ExerciseId, WorkoutSet } from '@/domain/types'
import { formatWeightKg } from '@/domain/weight'
import { summarizeWorkout } from '@/domain/workoutStats'
import { useExercises } from '@/hooks/useExercises'
import { useLastSessions } from '@/hooks/useLastSessions'
import { useRestTimer } from '@/hooks/useRestTimer'
import { useTodayKey } from '@/hooks/useTodayKey'
import { useWakeLock } from '@/hooks/useWakeLock'
import { ExercisePickerSheet } from './ExercisePickerSheet'
import { ExerciseSection } from './ExerciseSection'
import { RestTimerBar } from './RestTimerBar'
import { useRestAlarm } from './useRestAlarm'
import { SetEditorSheet } from './SetEditorSheet'
import { WorkoutNoteSheet } from './WorkoutNoteSheet'
import { buildInitialSetValues, type SetFormValues } from './setDefaults'
import styles from './TodayPage.module.css'

/** これを超えて経過した休憩は、記録・表示ともに意味を持たないため打ち切る。 */
const MAX_REST_SECONDS = 30 * 60

const EMPTY_SETS: readonly WorkoutSet[] = []
const EMPTY_STEPS: readonly number[] = []

interface EditorTarget {
  readonly exerciseId: ExerciseId
  readonly set: WorkoutSet | null
}

export function TodayPage() {
  const todayKey = useTodayKey()
  const { exerciseById, activeExercises } = useExercises()
  const lastSessionByExercise = useLastSessions()

  const settings = useLiveQuery(() => getSettings(), [])
  const templates = useLiveQuery(() => listTemplates(), [])
  const workout = useLiveQuery(() => getWorkoutByDate(todayKey), [todayKey])
  const workoutId = workout?.id

  const loadedSets = useLiveQuery(
    () => (workoutId === undefined ? Promise.resolve([]) : listSetsByWorkout(workoutId)),
    [workoutId],
  )
  const sets = loadedSets ?? EMPTY_SETS

  const [pendingExerciseIds, setPendingExerciseIds] = useState<readonly ExerciseId[]>([])
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isNoteOpen, setIsNoteOpen] = useState(false)
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null)
  const [isRestVisible, setIsRestVisible] = useState(true)

  const setsByExercise = useMemo(() => {
    const grouped = new Map<ExerciseId, WorkoutSet[]>()
    for (const set of sets) {
      const current = grouped.get(set.exerciseId)
      if (current === undefined) grouped.set(set.exerciseId, [set])
      else current.push(set)
    }
    return grouped
  }, [sets])

  // 記録済みの種目を先に、まだセットが無い種目を後ろに並べる
  const sectionExerciseIds = useMemo(() => {
    const recorded = [...new Set(sets.map((set) => set.exerciseId))]
    const extra = pendingExerciseIds.filter((id) => !recorded.includes(id))
    return [...recorded, ...extra]
  }, [sets, pendingExerciseIds])

  const sectionKey = sectionExerciseIds.join(',')
  const previousSetsByExercise = useLiveQuery(async () => {
    const entries = await Promise.all(
      sectionExerciseIds.map(
        async (exerciseId) =>
          [exerciseId, await findPreviousSessionSets(exerciseId, workoutId ?? -1)] as const,
      ),
    )
    return new Map<ExerciseId, WorkoutSet[]>(entries)
    // sectionKey は sectionExerciseIds を安定した文字列にしたもの
  }, [sectionKey, workoutId])

  const summary = useMemo(() => summarizeWorkout(sets, exerciseById), [sets, exerciseById])

  const lastSet = sets[sets.length - 1]
  const restSeconds = useRestTimer(lastSet?.recordedAt ?? null)
  // 休憩の目安は「直前に行った種目」の設定に従う
  const restTargetSec =
    lastSet === undefined ? 0 : exerciseById.get(lastSet.exerciseId)?.restSec ?? 0

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

  const dumbbellStepsKg = settings?.dumbbellStepsKg ?? EMPTY_STEPS

  // 前回の実績から「今回は何kgでやるか」を種目ごとに決める
  const suggestionByExercise = useMemo(() => {
    const suggestions = new Map<ExerciseId, ProgressionSuggestion>()
    for (const exerciseId of sectionExerciseIds) {
      const exercise = exerciseById.get(exerciseId)
      if (exercise === undefined) continue

      suggestions.set(
        exerciseId,
        suggestNextSession({
          previousSets: previousSetsByExercise?.get(exerciseId) ?? EMPTY_SETS,
          target: exercise.target,
          dumbbellStepsKg,
          isBodyweight: exercise.equipment === 'bodyweight',
        }),
      )
    }
    return suggestions
    // sectionKey は sectionExerciseIds を安定した文字列にしたもの
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey, exerciseById, previousSetsByExercise, dumbbellStepsKg])

  const editorExercise =
    editorTarget === null ? undefined : exerciseById.get(editorTarget.exerciseId)

  const editorInitialValues = useMemo<SetFormValues>(() => {
    if (editorTarget === null) {
      return { weightKg: 0, reps: 0, rpe: null, isWarmup: false }
    }
    const suggestion = suggestionByExercise.get(editorTarget.exerciseId)
    if (suggestion === undefined) {
      return { weightKg: 0, reps: 0, rpe: null, isWarmup: false }
    }

    return buildInitialSetValues({
      existingSet: editorTarget.set,
      setsInSession: setsByExercise.get(editorTarget.exerciseId) ?? EMPTY_SETS,
      suggestion,
    })
  }, [editorTarget, setsByExercise, suggestionByExercise])

  const handleAddExercise = useCallback((exerciseId: ExerciseId) => {
    setPendingExerciseIds((current) =>
      current.includes(exerciseId) ? current : [...current, exerciseId],
    )
  }, [])

  const handleRemoveExercise = useCallback((exerciseId: ExerciseId) => {
    setPendingExerciseIds((current) => current.filter((id) => id !== exerciseId))
  }, [])

  const handleApplyTemplate = useCallback((exerciseIds: readonly ExerciseId[]) => {
    setPendingExerciseIds((current) => [
      ...current,
      ...exerciseIds.filter((id) => !current.includes(id)),
    ])
  }, [])

  const handleSubmitSet = async (values: SetFormValues) => {
    if (editorTarget === null) return

    const nowIso = new Date().toISOString()

    if (editorTarget.set?.id !== undefined) {
      await updateSet(editorTarget.set.id, values)
      return
    }

    const todayWorkout = await getOrCreateWorkoutByDate(todayKey, nowIso)
    if (todayWorkout.id === undefined) {
      throw new Error('ワークアウトを作成できませんでした')
    }

    await addSet({
      workoutId: todayWorkout.id,
      exerciseId: editorTarget.exerciseId,
      weightKg: values.weightKg,
      reps: values.reps,
      rpe: values.rpe,
      restSec: lastSet !== undefined && restSeconds < MAX_REST_SECONDS ? restSeconds : null,
      isWarmup: values.isWarmup,
      recordedAt: nowIso,
    })

    setIsRestVisible(true)
  }

  const handleDeleteSet = async () => {
    if (editorTarget?.set?.id === undefined) return
    await deleteSet(editorTarget.set.id)
  }

  const handleSaveNote = async (values: {
    note: string
    bodyWeightKg: number | null
  }) => {
    const nowIso = new Date().toISOString()
    const todayWorkout = await getOrCreateWorkoutByDate(todayKey, nowIso)
    if (todayWorkout.id === undefined) return
    await updateWorkout(todayWorkout.id, values)
  }

  const hasSections = sectionExerciseIds.length > 0

  return (
    <>
      <PageHeader title="ホーム" subtitle={formatDateLabel(todayKey)} />

      <div
        className={
          shouldShowRestTimer ? `${styles.content} ${styles.contentWithRestTimer}` : styles.content
        }
      >
        <div className={styles.summary}>
          <div className={styles.volume}>
            <div>
              <span className={styles.volumeValue} data-testid="total-volume">
                {summary.totalVolumeKg.toLocaleString('ja-JP')}
              </span>
              <span className={styles.volumeUnit}>kg</span>
            </div>
            <div className={styles.volumeLabel}>総ボリューム</div>
          </div>
          <div className={styles.counts}>
            <div>{summary.exerciseCount} 種目</div>
            <div>{summary.workingSetCount} セット</div>
          </div>
        </div>

        <button type="button" className={styles.noteButton} onClick={() => setIsNoteOpen(true)}>
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

        {!hasSections && templates !== undefined && templates.length > 0 && (
          <>
            <span className={styles.sectionLabel}>メニューから始める</span>
            <div className={styles.templates}>
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={styles.templateChip}
                  onClick={() =>
                    handleApplyTemplate(template.items.map((item) => item.exerciseId))
                  }
                >
                  {template.name}
                </button>
              ))}
            </div>
          </>
        )}

        {sectionExerciseIds.map((exerciseId) => {
          const exercise = exerciseById.get(exerciseId)
          if (exercise === undefined) return null

          const exerciseSets = setsByExercise.get(exerciseId) ?? EMPTY_SETS
          const suggestion = suggestionByExercise.get(exerciseId)

          return (
            <ExerciseSection
              key={exerciseId}
              exercise={exercise}
              sets={exerciseSets}
              previousSets={previousSetsByExercise?.get(exerciseId) ?? EMPTY_SETS}
              message={
                suggestion === undefined
                  ? undefined
                  : describeProgression({
                      suggestion,
                      target: exercise.target,
                      dumbbellStepsKg,
                      isBodyweight: exercise.equipment === 'bodyweight',
                    })
              }
              isHighlighted={suggestion?.action === 'increase'}
              onAddSet={() => setEditorTarget({ exerciseId, set: null })}
              onEditSet={(set) => setEditorTarget({ exerciseId, set })}
              onRemove={
                exerciseSets.length === 0
                  ? () => handleRemoveExercise(exerciseId)
                  : undefined
              }
            />
          )
        })}

        {!hasSections && (
          <p className="empty-state">
            種目を追加して、今日のトレーニングを記録しましょう。
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setIsPickerOpen(true)}
        >
          <PlusIcon size={20} />
          種目を追加
        </button>
      </div>

      {shouldShowRestTimer && (
        <RestTimerBar
          seconds={restSeconds}
          targetSeconds={restTargetSec}
          onDismiss={() => setIsRestVisible(false)}
        />
      )}

      <ExercisePickerSheet
        isOpen={isPickerOpen}
        exercises={activeExercises}
        addedExerciseIds={sectionExerciseIds}
        lastSessionByExercise={lastSessionByExercise}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAddExercise}
      />

      {editorTarget !== null && editorExercise !== undefined && (
        <SetEditorSheet
          isOpen
          exercise={editorExercise}
          initialValues={editorInitialValues}
          dumbbellStepsKg={dumbbellStepsKg}
          previousSets={previousSetsByExercise?.get(editorTarget.exerciseId) ?? EMPTY_SETS}
          isEditing={editorTarget.set !== null}
          onClose={() => setEditorTarget(null)}
          onSubmit={handleSubmitSet}
          onDelete={editorTarget.set !== null ? handleDeleteSet : undefined}
        />
      )}

      <WorkoutNoteSheet
        isOpen={isNoteOpen}
        initialValues={{
          note: workout?.note ?? '',
          bodyWeightKg: workout?.bodyWeightKg ?? null,
        }}
        onClose={() => setIsNoteOpen(false)}
        onSubmit={handleSaveNote}
      />
    </>
  )
}
