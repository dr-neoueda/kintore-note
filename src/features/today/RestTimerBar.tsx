import { CloseIcon, TimerIcon } from '@/components/icons'
import { formatDuration } from '@/domain/duration'
import styles from './RestTimerBar.module.css'

interface RestTimerBarProps {
  readonly seconds: number
  readonly targetSeconds: number
  readonly onDismiss: () => void
}

/**
 * 直前のセットからの経過時間を表示する。
 *
 * iOS の Web アプリでは画面を消している間に通知を鳴らせないため、
 * 「戻ってきたときに正しい経過時間が見える」ことを重視している。
 */
export function RestTimerBar({ seconds, targetSeconds, onDismiss }: RestTimerBarProps) {
  const hasReachedTarget = targetSeconds > 0 && seconds >= targetSeconds
  const progressPercent =
    targetSeconds > 0 ? Math.min(100, (seconds / targetSeconds) * 100) : 0

  return (
    <div
      className={hasReachedTarget ? `${styles.bar} ${styles.reached}` : styles.bar}
      role="status"
      aria-live="off"
    >
      <span className={styles.icon}>
        <TimerIcon size={20} />
      </span>

      <div>
        <div className={styles.label}>休憩</div>
        <div className={styles.time}>{formatDuration(seconds)}</div>
      </div>

      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${progressPercent}%` }} />
      </div>

      <button
        type="button"
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label="休憩タイマーを閉じる"
      >
        <CloseIcon size={18} />
      </button>
    </div>
  )
}
