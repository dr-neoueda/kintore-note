import { MinusIcon, PlusIcon } from './icons'
import styles from './Stepper.module.css'

interface StepperProps {
  readonly label: string
  readonly value: string
  readonly unit?: string
  readonly onDecrement: () => void
  readonly onIncrement: () => void
  readonly canDecrement?: boolean
  readonly canIncrement?: boolean
}

/**
 * 大きな ± ボタンで値を増減させるコントロール。
 * 数値キーボードを開かずに片手で操作できることを狙う。
 */
export function Stepper({
  label,
  value,
  unit,
  onDecrement,
  onIncrement,
  canDecrement = true,
  canIncrement = true,
}: StepperProps) {
  return (
    <div className={styles.wrapper}>
      <span className={styles.label}>{label}</span>
      <div className={styles.control}>
        <button
          type="button"
          className={styles.button}
          onClick={onDecrement}
          disabled={!canDecrement}
          aria-label={`${label}を下げる`}
        >
          <MinusIcon size={26} />
        </button>

        <div className={styles.value} aria-live="polite">
          <span className={styles.number}>{value}</span>
          {unit !== undefined && <span className={styles.unit}>{unit}</span>}
        </div>

        <button
          type="button"
          className={styles.button}
          onClick={onIncrement}
          disabled={!canIncrement}
          aria-label={`${label}を上げる`}
        >
          <PlusIcon size={26} />
        </button>
      </div>
    </div>
  )
}
