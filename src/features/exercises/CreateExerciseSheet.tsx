import { useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { createExercise } from '@/data/repositories/exerciseRepository'
import { defaultRestSecForMuscleGroup } from '@/domain/muscle'
import { formatDuration } from '@/domain/duration'
import type { ExerciseId, MuscleGroup } from '@/domain/types'
import {
  DISPLAYED_MUSCLE_GROUPS,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  type EquipmentType,
} from '@/domain/types'

/** 選べる器具。「その他」はマシンやバンドなど、重量を自分で入れるもの。 */
const EQUIPMENT_OPTIONS: readonly EquipmentType[] = ['dumbbell', 'bodyweight', 'other']
import { ValidationError } from '@/domain/validation'
import { useResetOnOpen } from '@/hooks/useResetOnOpen'
import styles from './CreateExerciseSheet.module.css'

interface CreateExerciseSheetProps {
  readonly isOpen: boolean
  /** 検索していた語をそのまま名前の初期値にする。 */
  readonly initialName?: string
  readonly onClose: () => void
  readonly onCreated: (exerciseId: ExerciseId) => void
}

/**
 * 種目を作るシート。
 *
 * 入力は「名前」と「部位」だけにする。
 * 回数の目安・休憩時間・筋の種類は部位から自動で決まり、
 * 必要ならあとから種目カルテで変更できる。
 */
export function CreateExerciseSheet({
  isOpen,
  initialName = '',
  onClose,
  onCreated,
}: CreateExerciseSheetProps) {
  const [name, setName] = useState(initialName)
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('chest')
  const [equipment, setEquipment] = useState<EquipmentType>('dumbbell')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useResetOnOpen(isOpen, () => {
    setName(initialName)
    setMuscleGroup('chest')
    setEquipment('dumbbell')
    setErrorMessage(null)
  })

  const handleCreate = async () => {
    setIsSaving(true)
    setErrorMessage(null)
    try {
      const exerciseId = await createExercise({ name, muscleGroup, equipment })
      onCreated(exerciseId)
      onClose()
    } catch (cause) {
      setErrorMessage(
        cause instanceof ValidationError ? cause.message : '種目を保存できませんでした',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet
      isOpen={isOpen}
      title="種目を作る"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={handleCreate}
          disabled={isSaving}
        >
          作成する
        </button>
      }
    >
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="new-exercise-name">
            種目名
          </label>
          <input
            id="new-exercise-name"
            type="text"
            placeholder="例: インクラインダンベルカール"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>部位</span>
          <div className={styles.chips}>
            {DISPLAYED_MUSCLE_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                className={
                  muscleGroup === group ? `${styles.chip} ${styles.chipSelected}` : styles.chip
                }
                onClick={() => setMuscleGroup(group)}
                aria-pressed={muscleGroup === group}
              >
                {MUSCLE_GROUP_LABELS[group]}
              </button>
            ))}
          </div>
          <p className={styles.note}>
            休憩時間は{formatDuration(defaultRestSecForMuscleGroup(muscleGroup))}
            、回数の目安は部位に応じて自動で設定されます。あとから種目カルテで変更できます。
          </p>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>使う器具</span>
          <div className={styles.chips}>
            {EQUIPMENT_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={
                  equipment === option ? `${styles.chip} ${styles.chipSelected}` : styles.chip
                }
                onClick={() => setEquipment(option)}
                aria-pressed={equipment === option}
              >
                {EQUIPMENT_LABELS[option]}
              </button>
            ))}
          </div>
          <p className={styles.note}>
            {equipment === 'bodyweight'
              ? '自重の種目は回数だけを記録します（重量は入力しません）。'
              : '両手に1個ずつか片手ずつかは、あとから種目カルテで変更できます。'}
          </p>
        </div>

        {errorMessage !== null && <p className="error-text">{errorMessage}</p>}
      </div>
    </Sheet>
  )
}
