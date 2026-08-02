import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Stepper } from '@/components/Stepper'
import { normalizeProgressionTarget } from '@/domain/progression'
import type { ProgressionTarget } from '@/domain/types'

interface TargetEditorSheetProps {
  readonly isOpen: boolean
  readonly title: string
  readonly initialTarget: ProgressionTarget
  readonly onClose: () => void
  readonly onSubmit: (target: ProgressionTarget) => void | Promise<void>
}

const REPS_LIMIT = 50
const SETS_LIMIT = 20

/**
 * 「何回できたら重量を上げるか」を決めるシート。
 * 下限は重量を上げた直後の目安、上限は次に上げる条件になる。
 */
export function TargetEditorSheet({
  isOpen,
  title,
  initialTarget,
  onClose,
  onSubmit,
}: TargetEditorSheetProps) {
  const [target, setTarget] = useState<ProgressionTarget>(initialTarget)

  useEffect(() => {
    if (!isOpen) return
    setTarget(initialTarget)
  }, [isOpen, initialTarget])

  const changeRepsMin = (delta: number) => {
    setTarget((current) => ({
      ...current,
      repsMin: Math.min(current.repsMax, Math.max(1, current.repsMin + delta)),
    }))
  }

  const changeRepsMax = (delta: number) => {
    setTarget((current) => {
      const repsMax = Math.min(REPS_LIMIT, Math.max(1, current.repsMax + delta))
      // 上限を下限より下げたときは、下限も一緒に下げる
      return { ...current, repsMax, repsMin: Math.min(current.repsMin, repsMax) }
    })
  }

  const changeSets = (delta: number) => {
    setTarget((current) => ({
      ...current,
      sets: Math.min(SETS_LIMIT, Math.max(1, current.sets + delta)),
    }))
  }

  const handleSubmit = async () => {
    await onSubmit(normalizeProgressionTarget(target))
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
      <div className="stack" style={{ gap: 'var(--space-5)' }}>
        <p className="text-sm text-dim">
          全{target.sets}セットで{target.repsMax}回できたら、次回は重量を1段階上げます。
          上げた直後は{target.repsMin}回を目安に仕切り直します。
        </p>

        <Stepper
          label="下限の回数"
          unit="回"
          value={String(target.repsMin)}
          onDecrement={() => changeRepsMin(-1)}
          onIncrement={() => changeRepsMin(1)}
          canDecrement={target.repsMin > 1}
          canIncrement={target.repsMin < target.repsMax}
        />

        <Stepper
          label="上限の回数（ここで重量を上げる）"
          unit="回"
          value={String(target.repsMax)}
          onDecrement={() => changeRepsMax(-1)}
          onIncrement={() => changeRepsMax(1)}
          canDecrement={target.repsMax > 1}
          canIncrement={target.repsMax < REPS_LIMIT}
        />

        <Stepper
          label="判定するセット数"
          unit="セット"
          value={String(target.sets)}
          onDecrement={() => changeSets(-1)}
          onIncrement={() => changeSets(1)}
          canDecrement={target.sets > 1}
          canIncrement={target.sets < SETS_LIMIT}
        />
      </div>
    </Sheet>
  )
}
