import type { ProgressionMessage } from '@/domain/progressionText'
import styles from './ProgressionHint.module.css'

interface ProgressionHintProps {
  readonly message: ProgressionMessage
  /** 重量を上げる回など、注目させたいときに罫線を濃くする。 */
  readonly isHighlighted?: boolean
}

/** 「今回どうすべきか」を1行で示す。 */
export function ProgressionHint({ message, isHighlighted = false }: ProgressionHintProps) {
  return (
    <div className={isHighlighted ? `${styles.hint} ${styles.highlighted}` : styles.hint}>
      <div className={styles.headline}>{message.headline}</div>
      {message.detail !== null && <div className={styles.detail}>{message.detail}</div>}
    </div>
  )
}
