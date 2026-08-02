import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Stepper } from '@/components/Stepper'
import { formatDuration } from '@/domain/duration'
import { defaultTargetForArchitecture } from '@/domain/muscle'
import { normalizeProgressionTarget } from '@/domain/progression'
import type { MuscleArchitecture, ProgressionTarget } from '@/domain/types'
import { MUSCLE_ARCHITECTURE_LABELS } from '@/domain/types'
import styles from './ExerciseSettingsSheet.module.css'

export interface ExerciseSettingsValues {
  readonly muscleArchitecture: MuscleArchitecture
  readonly target: ProgressionTarget
  readonly restSec: number
}

interface ExerciseSettingsSheetProps {
  readonly isOpen: boolean
  readonly title: string
  readonly initialValues: ExerciseSettingsValues
  readonly onClose: () => void
  readonly onSubmit: (values: ExerciseSettingsValues) => void | Promise<void>
}

const REPS_LIMIT = 50
const SETS_LIMIT = 20
const REST_STEP_SEC = 15
const REST_LIMIT_SEC = 600

const ARCHITECTURE_OPTIONS: readonly MuscleArchitecture[] = ['parallel', 'pennate']

/**
 * 種目ごとの設定シート。
 * 筋の構造を変えると、その構造の既定の回数レンジに合わせて目標も切り替える。
 */
export function ExerciseSettingsSheet({
  isOpen,
  title,
  initialValues,
  onClose,
  onSubmit,
}: ExerciseSettingsSheetProps) {
  const [values, setValues] = useState<ExerciseSettingsValues>(initialValues)

  useEffect(() => {
    if (!isOpen) return
    setValues(initialValues)
  }, [isOpen, initialValues])

  const selectArchitecture = (muscleArchitecture: MuscleArchitecture) => {
    setValues((current) => ({
      ...current,
      muscleArchitecture,
      // 分類に合わせて既定の回数レンジへ切り替える。必要なら下のステッパーで調整できる
      target: defaultTargetForArchitecture(muscleArchitecture),
    }))
  }

  const changeRepsMin = (delta: number) => {
    setValues((current) => ({
      ...current,
      target: {
        ...current.target,
        repsMin: Math.min(current.target.repsMax, Math.max(1, current.target.repsMin + delta)),
      },
    }))
  }

  const changeRepsMax = (delta: number) => {
    setValues((current) => {
      const repsMax = Math.min(REPS_LIMIT, Math.max(1, current.target.repsMax + delta))
      return {
        ...current,
        target: {
          ...current.target,
          repsMax,
          // 上限を下限より下げたときは、下限も一緒に下げる
          repsMin: Math.min(current.target.repsMin, repsMax),
        },
      }
    })
  }

  const changeSets = (delta: number) => {
    setValues((current) => ({
      ...current,
      target: {
        ...current.target,
        sets: Math.min(SETS_LIMIT, Math.max(1, current.target.sets + delta)),
      },
    }))
  }

  const changeRest = (delta: number) => {
    setValues((current) => ({
      ...current,
      restSec: Math.min(REST_LIMIT_SEC, Math.max(0, current.restSec + delta)),
    }))
  }

  const handleSubmit = async () => {
    await onSubmit({ ...values, target: normalizeProgressionTarget(values.target) })
    onClose()
  }

  return (
    <Sheet
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary btn-block" onClick={handleSubmit}>
          決定
        </button>
      }
    >
      <div className={styles.form}>
        <div>
          <span className={styles.fieldLabel}>筋の種類</span>
          <div className={styles.chips}>
            {ARCHITECTURE_OPTIONS.map((architecture) => (
              <button
                key={architecture}
                type="button"
                className={
                  values.muscleArchitecture === architecture
                    ? `${styles.chip} ${styles.chipSelected}`
                    : styles.chip
                }
                onClick={() => selectArchitecture(architecture)}
                aria-pressed={values.muscleArchitecture === architecture}
              >
                {MUSCLE_ARCHITECTURE_LABELS[architecture]}
              </button>
            ))}
          </div>
          <p className={styles.note}>
            平行筋は 10〜15回、羽状筋は 8〜12回 を既定にします。
            選び直すと回数レンジもその既定に戻ります。
          </p>
        </div>

        <p className={styles.summary}>
          全{values.target.sets}セットで{values.target.repsMax}回できたら、次回は重量を1段階上げます。
          上げた直後は{values.target.repsMin}回を目安に仕切り直します。
        </p>

        <Stepper
          label="下限の回数"
          unit="回"
          value={String(values.target.repsMin)}
          onDecrement={() => changeRepsMin(-1)}
          onIncrement={() => changeRepsMin(1)}
          canDecrement={values.target.repsMin > 1}
          canIncrement={values.target.repsMin < values.target.repsMax}
        />

        <Stepper
          label="上限の回数（ここで重量を上げる）"
          unit="回"
          value={String(values.target.repsMax)}
          onDecrement={() => changeRepsMax(-1)}
          onIncrement={() => changeRepsMax(1)}
          canDecrement={values.target.repsMax > 1}
          canIncrement={values.target.repsMax < REPS_LIMIT}
        />

        <Stepper
          label="判定するセット数"
          unit="セット"
          value={String(values.target.sets)}
          onDecrement={() => changeSets(-1)}
          onIncrement={() => changeSets(1)}
          canDecrement={values.target.sets > 1}
          canIncrement={values.target.sets < SETS_LIMIT}
        />

        <div>
          <Stepper
            label="セット間の休憩"
            value={formatDuration(values.restSec)}
            onDecrement={() => changeRest(-REST_STEP_SEC)}
            onIncrement={() => changeRest(REST_STEP_SEC)}
            canDecrement={values.restSec > 0}
            canIncrement={values.restSec < REST_LIMIT_SEC}
          />
          <p className={styles.note}>
            この時間に達するとタイマーの表示が変わります。
            多関節・大筋群では2分以上とる方が、総挙上量を保てるぶん筋肥大に有利とされています。
          </p>
        </div>
      </div>
    </Sheet>
  )
}
