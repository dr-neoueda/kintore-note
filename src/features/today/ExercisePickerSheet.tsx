import { useMemo, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { CheckIcon } from '@/components/icons'
import { formatShortDateLabel } from '@/domain/date'
import type { ExerciseSessionSummary } from '@/domain/exerciseSessions'
import type { Exercise, ExerciseId, MuscleGroup } from '@/domain/types'
import { MUSCLE_GROUP_LABELS } from '@/domain/types'
import { formatWeightKg } from '@/domain/weight'
import styles from './ExercisePickerSheet.module.css'

interface ExercisePickerSheetProps {
  readonly isOpen: boolean
  readonly exercises: readonly Exercise[]
  /** 既に今日のメニューに入っている種目。重複追加を防ぐ。 */
  readonly addedExerciseIds: readonly ExerciseId[]
  /** 種目ごとの直近セッション。追加する前に前回の重量を思い出せるようにする。 */
  readonly lastSessionByExercise?: ReadonlyMap<ExerciseId, ExerciseSessionSummary>
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

/** 「前回 11.5kg（8/2）」のような補足を作る。 */
function formatLastSession(
  session: ExerciseSessionSummary | undefined,
  isBodyweight: boolean,
): string | null {
  if (session === undefined) return null

  const date = formatShortDateLabel(session.date)
  if (isBodyweight) {
    const topReps = Math.max(...session.sets.map((set) => set.reps))
    return `前回 ${topReps}回（${date}）`
  }
  return `前回 ${formatWeightKg(session.topWeightKg)}kg（${date}）`
}

export function ExercisePickerSheet({
  isOpen,
  exercises,
  addedExerciseIds,
  lastSessionByExercise,
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
              const lastSessionText = formatLastSession(
                exercise.id === undefined ? undefined : lastSessionByExercise?.get(exercise.id),
                exercise.equipment === 'bodyweight',
              )

              return (
                <button
                  key={exercise.id}
                  type="button"
                  className={isAdded ? `${styles.item} ${styles.added}` : styles.item}
                  onClick={() => exercise.id !== undefined && handleSelect(exercise.id)}
                  disabled={isAdded}
                >
                  <span className={styles.itemMain}>
                    <span className={styles.itemName}>{exercise.name}</span>
                    <span className={styles.itemLast}>
                      {lastSessionText ?? '記録なし'}
                    </span>
                  </span>
                  {isAdded ? (
                    <CheckIcon size={18} />
                  ) : (
                    exercise.dumbbellCount === 2 &&
                    exercise.equipment === 'dumbbell' && (
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
