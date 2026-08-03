import { PlusIcon } from '@/components/icons'
import { describeProgression } from '@/domain/progressionText'
import type { ExerciseSessionSummary } from '@/domain/exerciseSessions'
import type { Exercise, ExerciseId, WorkoutSet } from '@/domain/types'
import { ExercisePickerSheet } from './ExercisePickerSheet'
import { ExerciseSection } from './ExerciseSection'
import { SetEditorSheet } from './SetEditorSheet'
import { WorkoutNoteSheet } from './WorkoutNoteSheet'
import type { WorkoutEditor } from './useWorkoutEditor'

const EMPTY_SETS: readonly WorkoutSet[] = []

interface WorkoutEditorBodyProps {
  readonly editor: WorkoutEditor
  readonly activeExercises: readonly Exercise[]
  /**
   * 「今回は何kgでやるか」の提案を出すか。
   * 過去の日を後から入力する場面では、これから行う提案は意味を持たないため出さない。
   */
  readonly showProgressionHints: boolean
  readonly lastSessionByExercise?: ReadonlyMap<ExerciseId, ExerciseSessionSummary>
  readonly emptyMessage: string
}

/**
 * 種目ごとのセット一覧と、追加・編集用のシート。
 * ホーム（今日）と履歴（過去の日）で同じものを使う。
 */
export function WorkoutEditorBody({
  editor,
  activeExercises,
  showProgressionHints,
  lastSessionByExercise,
  emptyMessage,
}: WorkoutEditorBodyProps) {
  const hasSections = editor.sectionExerciseIds.length > 0

  return (
    <>
      {editor.sectionExerciseIds.map((exerciseId) => {
        const exercise = editor.exerciseById.get(exerciseId)
        if (exercise === undefined) return null

        const exerciseSets = editor.setsByExercise.get(exerciseId) ?? EMPTY_SETS
        const suggestion = editor.suggestionByExercise.get(exerciseId)

        return (
          <ExerciseSection
            key={exerciseId}
            exercise={exercise}
            sets={exerciseSets}
            previousSets={editor.previousSetsByExercise.get(exerciseId) ?? EMPTY_SETS}
            message={
              !showProgressionHints || suggestion === undefined
                ? undefined
                : describeProgression({
                    suggestion,
                    target: exercise.target,
                    dumbbellStepsKg: editor.dumbbellStepsKg,
                    isBodyweight: exercise.equipment === 'bodyweight',
                  })
            }
            isHighlighted={showProgressionHints && suggestion?.action === 'increase'}
            onAddSet={() => editor.openSetEditor(exerciseId, null)}
            onEditSet={(set) => editor.openSetEditor(exerciseId, set)}
            onRemove={
              exerciseSets.length === 0 ? () => editor.removeExercise(exerciseId) : undefined
            }
          />
        )
      })}

      {!hasSections && <p className="empty-state">{emptyMessage}</p>}

      <button type="button" className="btn btn-primary btn-block" onClick={editor.openPicker}>
        <PlusIcon size={20} />
        種目を追加
      </button>

      <ExercisePickerSheet
        isOpen={editor.isPickerOpen}
        exercises={activeExercises}
        addedExerciseIds={editor.sectionExerciseIds}
        lastSessionByExercise={lastSessionByExercise}
        onClose={editor.closePicker}
        onSelect={editor.addExercise}
      />

      {editor.editorTarget !== null && editor.editorExercise !== undefined && (
        <SetEditorSheet
          isOpen
          exercise={editor.editorExercise}
          initialValues={editor.editorInitialValues}
          dumbbellStepsKg={editor.dumbbellStepsKg}
          previousSets={
            editor.previousSetsByExercise.get(editor.editorTarget.exerciseId) ?? EMPTY_SETS
          }
          isEditing={editor.editorTarget.set !== null}
          onClose={editor.closeSetEditor}
          onSubmit={editor.submitSet}
          onDelete={
            editor.editorTarget.set !== null ? editor.deleteEditingSet : undefined
          }
        />
      )}

      <WorkoutNoteSheet
        isOpen={editor.isNoteOpen}
        initialValues={{
          note: editor.workout?.note ?? '',
          bodyWeightKg: editor.workout?.bodyWeightKg ?? null,
        }}
        onClose={editor.closeNote}
        onSubmit={editor.saveNote}
      />
    </>
  )
}
