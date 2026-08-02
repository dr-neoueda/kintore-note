import { CloseIcon, PlusIcon } from '@/components/icons'
import { formatSetSummary } from '@/domain/setFormat'
import type { Exercise, WorkoutSet } from '@/domain/types'
import { formatWeightKg } from '@/domain/weight'
import styles from './ExerciseSection.module.css'

interface ExerciseSectionProps {
  readonly exercise: Exercise
  readonly sets: readonly WorkoutSet[]
  readonly previousSets: readonly WorkoutSet[]
  readonly onAddSet: () => void
  readonly onEditSet: (set: WorkoutSet) => void
  /** セットが1件も無いときだけ、今日のメニューから外せる。 */
  readonly onRemove?: () => void
}

function formatSetValue(set: WorkoutSet, isBodyweight: boolean): string {
  if (isBodyweight) return `${set.reps} 回`
  return `${formatWeightKg(set.weightKg)} kg × ${set.reps}`
}

export function ExerciseSection({
  exercise,
  sets,
  previousSets,
  onAddSet,
  onEditSet,
  onRemove,
}: ExerciseSectionProps) {
  const isBodyweight = exercise.equipment === 'bodyweight'
  const previousSummary = formatSetSummary(previousSets)

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.name}>{exercise.name}</h2>
        {onRemove !== undefined && (
          <button
            type="button"
            className={styles.remove}
            onClick={onRemove}
            aria-label={`${exercise.name}を今日のメニューから外す`}
          >
            <CloseIcon size={18} />
          </button>
        )}
      </div>

      <p className={styles.previous}>
        {previousSummary === '' ? '前回の記録はありません' : `前回： ${previousSummary}`}
      </p>

      {sets.length > 0 && (
        <ul className={styles.setList}>
          {sets.map((set, index) => (
            <li key={set.id}>
              <button
                type="button"
                className={styles.setRow}
                onClick={() => onEditSet(set)}
                aria-label={`${index + 1}セット目を編集`}
              >
                <span className={styles.setIndex}>{index + 1}</span>
                <span className={styles.setMain}>{formatSetValue(set, isBodyweight)}</span>
                {set.isWarmup && (
                  <span className={`${styles.setBadge} ${styles.warmupBadge}`}>W/U</span>
                )}
                {set.rpe !== null && (
                  <span className={`${styles.setBadge} ${styles.rpeBadge}`}>
                    RPE {set.rpe}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className={styles.addButton} onClick={onAddSet}>
        <PlusIcon size={18} />
        セットを追加
      </button>
    </section>
  )
}
