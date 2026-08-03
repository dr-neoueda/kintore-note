import { useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Stepper } from '@/components/Stepper'
import { TrashIcon } from '@/components/icons'
import { formatSetSummary } from '@/domain/setFormat'
import type { Exercise, WorkoutSet } from '@/domain/types'
import { RPE_MAX, RPE_MIN } from '@/domain/types'
import { ValidationError } from '@/domain/validation'
import { formatWeightKg, stepWeight } from '@/domain/weight'
import { useResetOnOpen } from '@/hooks/useResetOnOpen'
import { unlockAlarmAudio } from './audioAlarm'
import type { SetFormValues } from './setDefaults'
import styles from './SetEditorSheet.module.css'

interface SetEditorSheetProps {
  readonly isOpen: boolean
  readonly exercise: Exercise
  readonly initialValues: SetFormValues
  readonly dumbbellStepsKg: readonly number[]
  readonly previousSets: readonly WorkoutSet[]
  readonly isEditing: boolean
  readonly onClose: () => void
  readonly onSubmit: (values: SetFormValues) => Promise<void>
  readonly onDelete?: () => Promise<void>
}

const REPS_MIN = 1
const REPS_MAX = 100
const RPE_OPTIONS: readonly number[] = Array.from(
  { length: RPE_MAX - RPE_MIN + 1 },
  (_, index) => RPE_MIN + index,
)

export function SetEditorSheet({
  isOpen,
  exercise,
  initialValues,
  dumbbellStepsKg,
  previousSets,
  isEditing,
  onClose,
  onSubmit,
  onDelete,
}: SetEditorSheetProps) {
  const [values, setValues] = useState<SetFormValues>(initialValues)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // シートを開いたときだけ初期値へ戻す
  useResetOnOpen(isOpen, () => {
    setValues(initialValues)
    setErrorMessage(null)
  })

  const isBodyweight = exercise.equipment === 'bodyweight'
  const previousSummary = formatSetSummary(previousSets)

  const changeWeight = (direction: 'up' | 'down') => {
    setValues((current) => ({
      ...current,
      weightKg: stepWeight(current.weightKg, direction, dumbbellStepsKg),
    }))
  }

  const changeReps = (delta: number) => {
    setValues((current) => ({
      ...current,
      reps: Math.min(REPS_MAX, Math.max(REPS_MIN, current.reps + delta)),
    }))
  }

  const selectRpe = (rpe: number | null) => {
    setValues((current) => ({ ...current, rpe: current.rpe === rpe ? null : rpe }))
  }

  const toggleWarmup = () => {
    setValues((current) => ({ ...current, isWarmup: !current.isWarmup }))
  }

  const handleSubmit = async () => {
    // iOS は利用者の操作を起点にしないと音を鳴らせないため、ここで解錠しておく
    void unlockAlarmAudio()

    setIsSaving(true)
    setErrorMessage(null)
    try {
      // 画面に出ている値をそのまま保存する。
      // 段階に丸めると、ダンベルの設定を変えたあとに既存セットの重量が
      // 表示と違う値で書き換わってしまう。
      await onSubmit({ ...values, weightKg: isBodyweight ? 0 : values.weightKg })
      onClose()
    } catch (cause) {
      setErrorMessage(
        cause instanceof ValidationError ? cause.message : '保存できませんでした',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (onDelete === undefined) return
    setIsSaving(true)
    try {
      await onDelete()
      onClose()
    } catch {
      setErrorMessage('削除できませんでした')
    } finally {
      setIsSaving(false)
    }
  }

  const lightest = dumbbellStepsKg[0]
  const heaviest = dumbbellStepsKg[dumbbellStepsKg.length - 1]

  return (
    <Sheet
      isOpen={isOpen}
      title={exercise.name}
      onClose={onClose}
      footer={
        <div className={styles.footerActions}>
          {onDelete !== undefined && (
            <button
              type="button"
              className={`btn btn-danger ${styles.deleteButton}`}
              onClick={handleDelete}
              disabled={isSaving}
              aria-label="このセットを削除"
            >
              <TrashIcon size={20} />
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isEditing ? '更新する' : '記録する'}
          </button>
        </div>
      }
    >
      <div className={styles.form}>
        {previousSummary !== '' && (
          <p className={styles.previous}>
            前回： <span className={styles.previousValue}>{previousSummary}</span>
          </p>
        )}

        {isBodyweight ? (
          <p className={styles.bodyweightNote}>自重種目のため回数のみ記録します。</p>
        ) : (
          <Stepper
            label="重量"
            unit="kg"
            value={formatWeightKg(values.weightKg)}
            onDecrement={() => changeWeight('down')}
            onIncrement={() => changeWeight('up')}
            canDecrement={lightest === undefined || values.weightKg > lightest}
            canIncrement={heaviest === undefined || values.weightKg < heaviest}
          />
        )}

        <Stepper
          label="回数"
          unit="回"
          value={String(values.reps)}
          onDecrement={() => changeReps(-1)}
          onIncrement={() => changeReps(1)}
          canDecrement={values.reps > REPS_MIN}
          canIncrement={values.reps < REPS_MAX}
        />

        <div>
          <span className={styles.fieldLabel}>RPE（きつさ・任意）</span>
          <div className={styles.chips}>
            {RPE_OPTIONS.map((rpe) => (
              <button
                key={rpe}
                type="button"
                className={
                  values.rpe === rpe ? `${styles.chip} ${styles.chipSelected}` : styles.chip
                }
                onClick={() => selectRpe(rpe)}
                aria-pressed={values.rpe === rpe}
              >
                {rpe}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className={styles.fieldLabel}>セットの種類</span>
          <div className={styles.chips}>
            <button
              type="button"
              className={
                values.isWarmup ? `${styles.chip} ${styles.chipSelected}` : styles.chip
              }
              onClick={toggleWarmup}
              aria-pressed={values.isWarmup}
            >
              ウォームアップ
            </button>
          </div>
        </div>

        {errorMessage !== null && <p className={styles.error}>{errorMessage}</p>}
      </div>
    </Sheet>
  )
}
