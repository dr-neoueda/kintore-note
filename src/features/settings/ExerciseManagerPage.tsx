import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { ChevronRightIcon, PlusIcon } from '@/components/icons'
import { setExerciseArchived } from '@/data/repositories/exerciseRepository'
import type { MuscleGroup } from '@/domain/types'
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS } from '@/domain/types'
import { useExercises } from '@/hooks/useExercises'
import { CreateExerciseSheet } from '../exercises/CreateExerciseSheet'
import styles from './ExerciseManagerPage.module.css'

const MUSCLE_GROUP_ORDER: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'other',
]

export function ExerciseManagerPage() {
  const { allExercises } = useExercises()

  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const groups = useMemo(
    () =>
      MUSCLE_GROUP_ORDER.map((group) => ({
        muscleGroup: group,
        items: allExercises.filter((exercise) => exercise.muscleGroup === group),
      })).filter((group) => group.items.length > 0),
    [allExercises],
  )

  return (
    <>
      <PageHeader title="種目の管理" showBack />

      <div className={styles.content}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setIsCreateOpen(true)}
        >
          <PlusIcon size={20} />
          種目を作る
        </button>

        {groups.map(({ muscleGroup: group, items }) => (
          <section key={group} className={styles.group}>
            <h2 className={styles.groupTitle}>{MUSCLE_GROUP_LABELS[group]}</h2>
            {items.map((exercise) => (
              <div
                key={exercise.id}
                className={
                  exercise.isArchived ? `${styles.item} ${styles.archived}` : styles.item
                }
              >
                <Link to={`/exercises/${exercise.id}`} className={styles.name}>
                  {exercise.name}
                  <ChevronRightIcon size={14} />
                </Link>
                <span className={styles.meta}>
                  {exercise.equipment === 'dumbbell' && exercise.dumbbellCount === 2
                    ? '両手'
                    : EQUIPMENT_LABELS[exercise.equipment]}
                </span>
                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() =>
                    exercise.id !== undefined &&
                    void setExerciseArchived(exercise.id, !exercise.isArchived)
                  }
                >
                  {exercise.isArchived ? '戻す' : '隠す'}
                </button>
              </div>
            ))}
          </section>
        ))}

        <p className="text-sm text-dim">
          種目名をタップするとカルテが開き、器具や両手・片手の別、回数の目安、休憩時間を変更できます。
          過去の記録が参照しているため、種目は削除ではなく「隠す」で一覧から外します。
        </p>
      </div>

      <CreateExerciseSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => setIsCreateOpen(false)}
      />
    </>
  )
}
