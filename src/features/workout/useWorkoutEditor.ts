import { useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '@/data/repositories/settingsRepository'
import {
  addSet,
  deleteSet,
  findPreviousSessionSets,
  listSetsByWorkout,
  updateSet,
} from '@/data/repositories/setRepository'
import {
  getOrCreateWorkoutByDate,
  getWorkoutByDate,
  updateWorkout,
} from '@/data/repositories/workoutRepository'
import { buildRecordedAt, startOfDayIso, type DateKey } from '@/domain/date'
import { suggestNextSession, type ProgressionSuggestion } from '@/domain/progression'
import type { Exercise, ExerciseId, ExerciseMap, Workout, WorkoutSet } from '@/domain/types'
import { summarizeWorkout, type WorkoutSummary } from '@/domain/workoutStats'
import { useExercises } from '@/hooks/useExercises'
import { buildInitialSetValues, type SetFormValues } from './setDefaults'

const EMPTY_SETS: readonly WorkoutSet[] = []
const EMPTY_STEPS: readonly number[] = []
const EMPTY_PREVIOUS: ReadonlyMap<ExerciseId, WorkoutSet[]> = new Map()

export interface EditorTarget {
  readonly exerciseId: ExerciseId
  readonly set: WorkoutSet | null
}

export interface WorkoutNoteValues {
  readonly note: string
}

export interface UseWorkoutEditorParams {
  /** 編集対象の日付。今日でも過去の日でもよい。 */
  readonly dateKey: DateKey
  /** 新しいセットに記録する休憩秒数。ホーム画面のタイマーが渡す。 */
  readonly resolveRestSec?: () => number | null
  /** セットを新規に記録した直後に呼ばれる。 */
  readonly onSetRecorded?: () => void
}

export interface WorkoutEditor {
  readonly exerciseById: ExerciseMap
  readonly workout: Workout | undefined
  readonly sets: readonly WorkoutSet[]
  readonly setsByExercise: ReadonlyMap<ExerciseId, WorkoutSet[]>
  /** 画面に並べる種目。記録済みが先、未記録が後。 */
  readonly sectionExerciseIds: readonly ExerciseId[]
  readonly previousSetsByExercise: ReadonlyMap<ExerciseId, WorkoutSet[]>
  readonly suggestionByExercise: ReadonlyMap<ExerciseId, ProgressionSuggestion>
  readonly summary: WorkoutSummary
  readonly dumbbellStepsKg: readonly number[]
  readonly lastSet: WorkoutSet | undefined

  readonly editorTarget: EditorTarget | null
  readonly editorExercise: Exercise | undefined
  readonly editorInitialValues: SetFormValues
  readonly openSetEditor: (exerciseId: ExerciseId, set: WorkoutSet | null) => void
  readonly closeSetEditor: () => void
  readonly submitSet: (values: SetFormValues) => Promise<void>
  readonly deleteEditingSet: () => Promise<void>

  readonly isPickerOpen: boolean
  readonly openPicker: () => void
  readonly closePicker: () => void
  readonly addExercise: (exerciseId: ExerciseId) => void
  readonly addExercises: (exerciseIds: readonly ExerciseId[]) => void
  readonly removeExercise: (exerciseId: ExerciseId) => void

  readonly isNoteOpen: boolean
  readonly openNote: () => void
  readonly closeNote: () => void
  readonly saveNote: (values: WorkoutNoteValues) => Promise<void>
}

const EMPTY_FORM_VALUES: SetFormValues = {
  weightKg: 0,
  reps: 0,
  rpe: null,
  isWarmup: false,
  restTargetSec: 0,
}

/**
 * 1日分のワークアウトを編集するための状態と操作。
 *
 * ホーム（今日）と履歴（過去の日）で同じ編集ができるよう、
 * 日付を差し替えられる形で共通化している。
 * ワークアウトのレコードは、最初のセットを記録した時点で作る。
 */
export function useWorkoutEditor({
  dateKey,
  resolveRestSec,
  onSetRecorded,
}: UseWorkoutEditorParams): WorkoutEditor {
  const { exerciseById } = useExercises()

  const settings = useLiveQuery(() => getSettings(), [])
  const workout = useLiveQuery(() => getWorkoutByDate(dateKey), [dateKey])
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

  const setsByExercise = useMemo(() => {
    const grouped = new Map<ExerciseId, WorkoutSet[]>()
    for (const set of sets) {
      const current = grouped.get(set.exerciseId)
      if (current === undefined) grouped.set(set.exerciseId, [set])
      else current.push(set)
    }
    return grouped
  }, [sets])

  const sectionExerciseIds = useMemo(() => {
    const recorded = [...new Set(sets.map((set) => set.exerciseId))]
    const extra = pendingExerciseIds.filter((id) => !recorded.includes(id))
    return [...recorded, ...extra]
  }, [sets, pendingExerciseIds])

  const sectionKey = sectionExerciseIds.join(',')
  // 編集している日より後の記録は「前回」ではない
  const dayStartIso = startOfDayIso(dateKey)
  const loadedPrevious = useLiveQuery(async () => {
    const entries = await Promise.all(
      sectionExerciseIds.map(
        async (exerciseId) =>
          [
            exerciseId,
            await findPreviousSessionSets(exerciseId, workoutId ?? -1, dayStartIso),
          ] as const,
      ),
    )
    return new Map<ExerciseId, WorkoutSet[]>(entries)
    // sectionKey は sectionExerciseIds を安定した文字列にしたもの
  }, [sectionKey, workoutId, dayStartIso])
  const previousSetsByExercise = loadedPrevious ?? EMPTY_PREVIOUS

  const summary = useMemo(() => summarizeWorkout(sets), [sets])
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
          previousSets: previousSetsByExercise.get(exerciseId) ?? EMPTY_SETS,
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
    if (editorTarget === null) return EMPTY_FORM_VALUES

    const suggestion = suggestionByExercise.get(editorTarget.exerciseId)
    if (suggestion === undefined) return EMPTY_FORM_VALUES

    return buildInitialSetValues({
      existingSet: editorTarget.set,
      setsInSession: setsByExercise.get(editorTarget.exerciseId) ?? EMPTY_SETS,
      suggestion,
      exerciseRestSec: exerciseById.get(editorTarget.exerciseId)?.restSec ?? 0,
    })
  }, [editorTarget, setsByExercise, suggestionByExercise, exerciseById])

  const addExercise = useCallback((exerciseId: ExerciseId) => {
    setPendingExerciseIds((current) =>
      current.includes(exerciseId) ? current : [...current, exerciseId],
    )
  }, [])

  const addExercises = useCallback((exerciseIds: readonly ExerciseId[]) => {
    setPendingExerciseIds((current) => [
      ...current,
      ...exerciseIds.filter((id) => !current.includes(id)),
    ])
  }, [])

  const removeExercise = useCallback((exerciseId: ExerciseId) => {
    setPendingExerciseIds((current) => current.filter((id) => id !== exerciseId))
  }, [])

  const submitSet = async (values: SetFormValues) => {
    if (editorTarget === null) return

    if (editorTarget.set?.id !== undefined) {
      await updateSet(editorTarget.set.id, values)
      return
    }

    const now = new Date()
    const targetWorkout = await getOrCreateWorkoutByDate(dateKey, now.toISOString())
    if (targetWorkout.id === undefined) {
      throw new Error('ワークアウトを作成できませんでした')
    }

    await addSet({
      workoutId: targetWorkout.id,
      exerciseId: editorTarget.exerciseId,
      weightKg: values.weightKg,
      reps: values.reps,
      rpe: values.rpe,
      restSec: resolveRestSec?.() ?? null,
      restTargetSec: values.restTargetSec,
      isWarmup: values.isWarmup,
      // 過去の日付を後から入力しても実施順が壊れないようにする
      recordedAt: buildRecordedAt(dateKey, now),
    })

    onSetRecorded?.()
  }

  const deleteEditingSet = async () => {
    if (editorTarget?.set?.id === undefined) return
    await deleteSet(editorTarget.set.id)
  }

  const saveNote = async (values: WorkoutNoteValues) => {
    const hasContent = values.note !== ''
    // 空のまま保存されたときに、記録の無い日を作ってしまわないようにする
    if (!hasContent && workout === undefined) return

    const targetWorkout = await getOrCreateWorkoutByDate(dateKey, new Date().toISOString())
    if (targetWorkout.id === undefined) return
    await updateWorkout(targetWorkout.id, values)
  }

  return {
    exerciseById,
    workout,
    sets,
    setsByExercise,
    sectionExerciseIds,
    previousSetsByExercise,
    suggestionByExercise,
    summary,
    dumbbellStepsKg,
    lastSet: sets[sets.length - 1],

    editorTarget,
    editorExercise,
    editorInitialValues,
    openSetEditor: useCallback(
      (exerciseId: ExerciseId, set: WorkoutSet | null) => setEditorTarget({ exerciseId, set }),
      [],
    ),
    closeSetEditor: useCallback(() => setEditorTarget(null), []),
    submitSet,
    deleteEditingSet,

    isPickerOpen,
    openPicker: useCallback(() => setIsPickerOpen(true), []),
    closePicker: useCallback(() => setIsPickerOpen(false), []),
    addExercise,
    addExercises,
    removeExercise,

    isNoteOpen,
    openNote: useCallback(() => setIsNoteOpen(true), []),
    closeNote: useCallback(() => setIsNoteOpen(false), []),
    saveNote,
  }
}
