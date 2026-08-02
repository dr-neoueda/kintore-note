import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { ChevronRightIcon, PlusIcon } from '@/components/icons'
import {
  createExercise,
  setExerciseArchived,
} from '@/data/repositories/exerciseRepository'
import { DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP } from '@/domain/muscle'
import type {
  DumbbellCount,
  EquipmentType,
  MuscleArchitecture,
  MuscleGroup,
} from '@/domain/types'
import {
  EQUIPMENT_LABELS,
  MUSCLE_ARCHITECTURE_LABELS,
  MUSCLE_GROUP_LABELS,
} from '@/domain/types'
import { ValidationError } from '@/domain/validation'
import { useExercises } from '@/hooks/useExercises'
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

const EQUIPMENT_ORDER: readonly EquipmentType[] = ['dumbbell', 'bodyweight', 'other']

const ARCHITECTURE_ORDER: readonly MuscleArchitecture[] = ['parallel', 'pennate']

export function ExerciseManagerPage() {
  const { allExercises } = useExercises()

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('chest')
  const [equipment, setEquipment] = useState<EquipmentType>('dumbbell')
  const [dumbbellCount, setDumbbellCount] = useState<DumbbellCount>(2)
  const [muscleArchitecture, setMuscleArchitecture] = useState<MuscleArchitecture>(
    DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP.chest,
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  /** 部位を変えたら、その部位で代表的な筋の分類に合わせる。 */
  const handleMuscleGroupChange = (group: MuscleGroup) => {
    setMuscleGroup(group)
    setMuscleArchitecture(DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP[group])
  }

  const groups = useMemo(
    () =>
      MUSCLE_GROUP_ORDER.map((group) => ({
        muscleGroup: group,
        items: allExercises.filter((exercise) => exercise.muscleGroup === group),
      })).filter((group) => group.items.length > 0),
    [allExercises],
  )

  const resetForm = () => {
    setName('')
    setMuscleGroup('chest')
    setEquipment('dumbbell')
    setDumbbellCount(2)
    setMuscleArchitecture(DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP.chest)
    setErrorMessage(null)
  }

  const handleCreate = async () => {
    setErrorMessage(null)
    try {
      await createExercise({ name, muscleGroup, equipment, dumbbellCount, muscleArchitecture })
      resetForm()
      setIsSheetOpen(false)
    } catch (cause) {
      setErrorMessage(
        cause instanceof ValidationError
          ? cause.message
          : '同じ名前の種目が既にあるか、保存に失敗しました',
      )
    }
  }

  return (
    <>
      <PageHeader title="種目の管理" showBack />

      <div className={styles.content}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={() => setIsSheetOpen(true)}
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
          過去の記録が参照しているため、種目は削除ではなく「隠す」で一覧から外します。
        </p>
      </div>

      <Sheet
        isOpen={isSheetOpen}
        title="種目を作る"
        onClose={() => {
          resetForm()
          setIsSheetOpen(false)
        }}
        footer={
          <button type="button" className="btn btn-primary btn-block" onClick={handleCreate}>
            作成する
          </button>
        }
      >
        <div className="stack">
          <div className={styles.field}>
            <label className={styles.label} htmlFor="exercise-name">
              種目名
            </label>
            <input
              id="exercise-name"
              type="text"
              placeholder="例: インクラインダンベルプレス"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="exercise-muscle">
              部位
            </label>
            <select
              id="exercise-muscle"
              value={muscleGroup}
              onChange={(event) => handleMuscleGroupChange(event.target.value as MuscleGroup)}
            >
              {MUSCLE_GROUP_ORDER.map((group) => (
                <option key={group} value={group}>
                  {MUSCLE_GROUP_LABELS[group]}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="exercise-architecture">
              筋の種類
            </label>
            <select
              id="exercise-architecture"
              value={muscleArchitecture}
              onChange={(event) =>
                setMuscleArchitecture(event.target.value as MuscleArchitecture)
              }
            >
              {ARCHITECTURE_ORDER.map((architecture) => (
                <option key={architecture} value={architecture}>
                  {MUSCLE_ARCHITECTURE_LABELS[architecture]}
                </option>
              ))}
            </select>
            <p className="text-xs text-dim">
              回数の目標が決まります。平行筋は 10〜15回、羽状筋は 8〜12回。
            </p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="exercise-equipment">
              使う器具
            </label>
            <select
              id="exercise-equipment"
              value={equipment}
              onChange={(event) => setEquipment(event.target.value as EquipmentType)}
            >
              {EQUIPMENT_ORDER.map((type) => (
                <option key={type} value={type}>
                  {EQUIPMENT_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {equipment === 'dumbbell' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="exercise-dumbbell-count">
                同時に使うダンベルの数
              </label>
              <select
                id="exercise-dumbbell-count"
                value={dumbbellCount}
                onChange={(event) =>
                  setDumbbellCount(Number(event.target.value) === 2 ? 2 : 1)
                }
              >
                <option value={2}>2個（両手に1個ずつ）</option>
                <option value={1}>1個（片手ずつ・両手で1個）</option>
              </select>
              <p className="text-xs text-dim">
                総ボリュームの計算に使います。ワンハンドロウやプルオーバーは1個です。
              </p>
            </div>
          )}

          {errorMessage !== null && <p className={styles.error}>{errorMessage}</p>}
        </div>
      </Sheet>
    </>
  )
}
