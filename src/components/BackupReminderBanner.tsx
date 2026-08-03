import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { getSettings } from '@/data/repositories/settingsRepository'
import { countWorkouts } from '@/data/repositories/workoutRepository'
import { isBackupOverdue } from '@/domain/backup'
import { ChevronRightIcon, WarningIcon } from './icons'
import styles from './BackupReminderBanner.module.css'

/**
 * バックアップの督促。
 *
 * 記録は端末内にしか無いため、失うと取り返せない。
 * 設定画面の中だけに出しても気づけないので、普段見るホーム画面に出す。
 * 守るべき記録がまだ無いうちは出さない。
 */
export function BackupReminderBanner() {
  const settings = useLiveQuery(() => getSettings(), [])
  const workoutCount = useLiveQuery(() => countWorkouts(), [])

  if (settings === undefined || workoutCount === undefined) return null
  if (workoutCount === 0) return null
  if (!isBackupOverdue(settings.lastBackupAt, settings.backupReminderDays, Date.now())) {
    return null
  }

  const detail =
    settings.lastBackupAt === null
      ? 'まだ一度も書き出していません。記録は端末内にしかありません。'
      : `最後の書き出しから${settings.backupReminderDays}日以上たっています。`

  return (
    <Link to="/settings" className={styles.banner}>
      <span className={styles.icon}>
        <WarningIcon size={20} />
      </span>
      <span className={styles.body}>
        <span className={styles.title}>バックアップを書き出しましょう</span>
        <span className={styles.detail}>{detail}</span>
      </span>
      <span className={styles.chevron}>
        <ChevronRightIcon size={18} />
      </span>
    </Link>
  )
}
