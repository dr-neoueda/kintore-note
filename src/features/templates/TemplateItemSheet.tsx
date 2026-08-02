import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Stepper } from '@/components/Stepper'
import type { Exercise, TemplateItem } from '@/domain/types'
import { formatWeightKg, snapToStep, stepWeight } from '@/domain/weight'
import styles from './TemplateItemSheet.module.css'

interface TemplateItemSheetProps {
  readonly isOpen: boolean
  readonly exercise: Exercise
  readonly initialItem: TemplateItem
  readonly dumbbellStepsKg: readonly number[]
  readonly onClose: () => void
  readonly onSubmit: (item: TemplateItem) => void
}

const TARGET_SETS_MIN = 1
const TARGET_SETS_MAX = 20
const TARGET_REPS_MIN = 1
const TARGET_REPS_MAX = 100

/**
 * テンプレート1種目分の目標値を編集するシート。
 * 記録画面と同じ ± ボタンで、実際に設定できるダンベルの段階から選ぶ。
 */
export function TemplateItemSheet({
  isOpen,
  exercise,
  initialItem,
  dumbbellStepsKg,
  onClose,
  onSubmit,
}: TemplateItemSheetProps) {
  const [item, setItem] = useState<TemplateItem>(initialItem)

  useEffect(() => {
    if (!isOpen) return
    setItem(initialItem)
  }, [isOpen, initialItem])

  const isBodyweight = exercise.equipment === 'bodyweight'
  const hasTargetWeight = !isBodyweight && item.targetWeightKg !== null

  const changeWeight = (direction: 'up' | 'down') => {
    setItem((current) => ({
      ...current,
      targetWeightKg: stepWeight(current.targetWeightKg ?? 0, direction, dumbbellStepsKg),
    }))
  }

  /** 「指定なし」と重量指定を切り替える。指定に戻すときは最も軽い段階から始める。 */
  const toggleTargetWeight = () => {
    setItem((current) => ({
      ...current,
      targetWeightKg: current.targetWeightKg === null ? dumbbellStepsKg[0] ?? 0 : null,
    }))
  }

  const changeReps = (delta: number) => {
    setItem((current) => ({
      ...current,
      targetReps: Math.min(TARGET_REPS_MAX, Math.max(TARGET_REPS_MIN, current.targetReps + delta)),
    }))
  }

  const changeSets = (delta: number) => {
    setItem((current) => ({
      ...current,
      targetSets: Math.min(TARGET_SETS_MAX, Math.max(TARGET_SETS_MIN, current.targetSets + delta)),
    }))
  }

  const handleSubmit = () => {
    onSubmit({
      ...item,
      targetWeightKg:
        isBodyweight || item.targetWeightKg === null
          ? null
          : snapToStep(item.targetWeightKg, dumbbellStepsKg),
    })
    onClose()
  }

  const lightest = dumbbellStepsKg[0]
  const heaviest = dumbbellStepsKg[dumbbellStepsKg.length - 1]

  return (
    <Sheet
      isOpen={isOpen}
      title={exercise.name}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary btn-block" onClick={handleSubmit}>
          決定
        </button>
      }
    >
      <div className={styles.form}>
        {isBodyweight ? (
          <p className={styles.note}>自重種目のため回数とセット数のみ設定します。</p>
        ) : (
          <div>
            <span className={styles.fieldLabel}>目標重量</span>
            <div className={styles.chips}>
              <button
                type="button"
                className={
                  item.targetWeightKg === null
                    ? `${styles.chip} ${styles.chipSelected}`
                    : styles.chip
                }
                onClick={toggleTargetWeight}
                aria-pressed={item.targetWeightKg === null}
              >
                指定なし
              </button>
            </div>
            {hasTargetWeight && (
              <Stepper
                label="目標重量"
                hideLabel
                unit="kg"
                value={formatWeightKg(item.targetWeightKg ?? 0)}
                onDecrement={() => changeWeight('down')}
                onIncrement={() => changeWeight('up')}
                canDecrement={lightest === undefined || (item.targetWeightKg ?? 0) > lightest}
                canIncrement={heaviest === undefined || (item.targetWeightKg ?? 0) < heaviest}
              />
            )}
          </div>
        )}

        <Stepper
          label="目標回数"
          unit="回"
          value={String(item.targetReps)}
          onDecrement={() => changeReps(-1)}
          onIncrement={() => changeReps(1)}
          canDecrement={item.targetReps > TARGET_REPS_MIN}
          canIncrement={item.targetReps < TARGET_REPS_MAX}
        />

        <Stepper
          label="目標セット数"
          unit="セット"
          value={String(item.targetSets)}
          onDecrement={() => changeSets(-1)}
          onIncrement={() => changeSets(1)}
          canDecrement={item.targetSets > TARGET_SETS_MIN}
          canIncrement={item.targetSets < TARGET_SETS_MAX}
        />
      </div>
    </Sheet>
  )
}
