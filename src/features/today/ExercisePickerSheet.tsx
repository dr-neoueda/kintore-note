import { useMemo, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { CheckIcon } from '@/components/icons'
import type { Exercise, ExerciseId, MuscleGroup } from '@/domain/types'
import { MUSCLE_GROUP_LABELS } from '@/domain/types'
import styles from './ExercisePickerSheet.module.css'

interface ExercisePickerSheetProps {
  readonly isOpen: boolean
  readonly exercises: readonly Exercise[]
  /** 既に今日のメニューに入っている種目。重複追加を防ぐ。 */
  readonly addedExerciseIds: readonly ExerciseId[]
  readonly onClose: () => void
  readonly onSelect: (exerciseId: ExerciseId) => void
}

const MUSCLE_GROUP_ORDER: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'other',
]

export function ExercisePickerSheet({
  isOpen,
  exercises,
  addedExerciseIds,
  onClose,
  onSelect,
}: ExercisePickerSheetProps) {
  const [keyword, setKeyword] = useState('')

  const groups = useMemo(() => {
    const normalized = keyword.trim()
    const matched =
      normalized === ''
        ? exercises
        : exercises.filter((exercise) => exercise.name.includes(normalized))

    return MUSCLE_GROUP_ORDER.map((muscleGroup) => ({
      muscleGroup,
      items: matched.filter((exercise) => exercise.muscleGroup === muscleGroup),
    })).filter((group) => group.items.length > 0)
  }, [exercises, keyword])

  const handleSelect = (exerciseId: ExerciseId) => {
    onSelect(exerciseId)
    setKeyword('')
    onClose()
  }

  return (
    <Sheet isOpen={isOpen} title="種目を追加" onClose={onClose}>
      <input
        className={styles.search}
        type="search"
        inputMode="search"
        placeholder="種目名で絞り込む"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        aria-label="種目名で絞り込む"
      />

      {groups.length === 0 ? (
        <p className="empty-state">該当する種目がありません</p>
      ) : (
        groups.map(({ muscleGroup, items }) => (
          <section key={muscleGroup} className={styles.group}>
            <h3 className={styles.groupTitle}>{MUSCLE_GROUP_LABELS[muscleGroup]}</h3>
            {items.map((exercise) => {
              const isAdded =
                exercise.id !== undefined && addedExerciseIds.includes(exercise.id)

              return (
                <button
                  key={exercise.id}
                  type="button"
                  className={isAdded ? `${styles.item} ${styles.added}` : styles.item}
                  onClick={() => exercise.id !== undefined && handleSelect(exercise.id)}
                  disabled={isAdded}
                >
                  <span className={styles.itemName}>{exercise.name}</span>
                  {isAdded ? (
                    <CheckIcon size={18} />
                  ) : (
                    exercise.dumbbellCount === 2 && (
                      <span className={styles.itemMeta}>両手</span>
                    )
                  )}
                </button>
              )
            })}
          </section>
        ))
      )}
    </Sheet>
  )
}
