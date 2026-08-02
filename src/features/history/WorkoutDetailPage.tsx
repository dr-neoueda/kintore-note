import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { getSettings } from '@/data/repositories/settingsRepository'
import {
  deleteSet,
  findPreviousSessionSets,
  listSetsByWorkout,
  updateSet,
} from '@/data/repositories/setRepository'
import { deleteWorkout, getWorkoutByDate } from '@/data/repositories/workoutRepository'
import { formatDateLabelWithYear } from '@/domain/date'
import type { ExerciseId, WorkoutSet } from '@/domain/types'
import { formatWeightKg } from '@/domain/weight'
import { summarizeWorkout } from '@/domain/workoutStats'
import { useExercises } from '@/hooks/useExercises'
import { ExerciseSection } from '../today/ExerciseSection'
import { SetEditorSheet } from '../today/SetEditorSheet'
import { buildInitialSetValues, type SetFormValues } from '../today/setDefaults'
import styles from './WorkoutDetailPage.module.css'

const EMPTY_SETS: readonly WorkoutSet[] = []

export function WorkoutDetailPage() {
  const { date = '' } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const { exerciseById } = useExercises()

  const settings = useLiveQuery(() => getSettings(), [])
  const workout = useLiveQuery(() => getWorkoutByDate(date), [date])
  const workoutId = workout?.id

  const loadedSets = useLiveQuery(
    () => (workoutId === undefined ? Promise.resolve([]) : listSetsByWorkout(workoutId)),
    [workoutId],
  )
  const sets = loadedSets ?? EMPTY_SETS

  const [editingSet, setEditingSet] = useState<WorkoutSet | null>(null)

  const setsByExercise = useMemo(() => {
    const grouped = new Map<ExerciseId, WorkoutSet[]>()
    for (const set of sets) {
      const current = grouped.get(set.exerciseId)
      if (current === undefined) grouped.set(set.exerciseId, [set])
      else current.push(set)
    }
    return grouped
  }, [sets])

  const previousSets = useLiveQuery(
    () =>
      editingSet === null
        ? Promise.resolve([])
        : findPreviousSessionSets(editingSet.exerciseId, editingSet.workoutId),
    [editingSet?.exerciseId, editingSet?.workoutId],
  )

  const summary = useMemo(() => summarizeWorkout(sets, exerciseById), [sets, exerciseById])

  const editorInitialValues = useMemo<SetFormValues>(
    () =>
      buildInitialSetValues({
        existingSet: editingSet,
        setsInSession: EMPTY_SETS,
        previousSets: EMPTY_SETS,
        dumbbellStepsKg: settings?.dumbbellStepsKg ?? [],
      }),
    [editingSet, settings?.dumbbellStepsKg],
  )

  const handleUpdateSet = async (values: SetFormValues) => {
    if (editingSet?.id === undefined) return
    await updateSet(editingSet.id, values)
  }

  const handleDeleteSet = async () => {
    if (editingSet?.id === undefined) return
    await deleteSet(editingSet.id)
  }

  const handleDeleteWorkout = async () => {
    if (workoutId === undefined) return
    const isConfirmed = window.confirm(
      `${formatDateLabelWithYear(date)} の記録をすべて削除します。よろしいですか？`,
    )
    if (!isConfirmed) return

    await deleteWorkout(workoutId)
    navigate('/history', { replace: true })
  }

  const editingExercise =
    editingSet === null ? undefined : exerciseById.get(editingSet.exerciseId)

  if (workout === undefined) {
    return (
      <>
        <PageHeader title="記録" showBack />
        <p className="empty-state">この日の記録は見つかりませんでした。</p>
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
          {workout.bodyWeightKg !== null && (
            <div className={styles.metric}>
              <div className={styles.metricValue}>
                {formatWeightKg(workout.bodyWeightKg)} kg
              </div>
              <div className={styles.metricLabel}>体重</div>
            </div>
          )}
        </div>

        {workout.note !== '' && <p className={styles.note}>{workout.note}</p>}

        {[...setsByExercise.entries()].map(([exerciseId, exerciseSets]) => {
          const exercise = exerciseById.get(exerciseId)
          if (exercise === undefined) return null

          return (
            <ExerciseSection
              key={exerciseId}
              exercise={exercise}
              sets={exerciseSets}
              previousSets={EMPTY_SETS}
              onAddSet={() => {
                const lastSet = exerciseSets[exerciseSets.length - 1]
                if (lastSet !== undefined) setEditingSet(lastSet)
              }}
              onEditSet={(set) => setEditingSet(set)}
            />
          )
        })}

        {sets.length === 0 && <p className="empty-state">この日はセットの記録がありません。</p>}

        <button
          type="button"
          className={`btn btn-danger btn-block ${styles.danger}`}
          onClick={handleDeleteWorkout}
        >
          この日の記録を削除
        </button>
      </div>

      {editingSet !== null && editingExercise !== undefined && (
        <SetEditorSheet
          isOpen
          exercise={editingExercise}
          initialValues={editorInitialValues}
          dumbbellStepsKg={settings?.dumbbellStepsKg ?? []}
          previousSets={previousSets ?? EMPTY_SETS}
          isEditing
          onClose={() => setEditingSet(null)}
          onSubmit={handleUpdateSet}
          onDelete={handleDeleteSet}
        />
      )}
    </>
  )
}
