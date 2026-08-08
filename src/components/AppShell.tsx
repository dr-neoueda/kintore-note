import { Outlet } from 'react-router-dom'
import { RestTimerBar } from '@/features/today/RestTimerBar'
import { useRestTimerState } from '@/features/today/useRestTimerState'
import { TabBar } from './TabBar'
import styles from './AppShell.module.css'

/**
 * 全画面共通のレイアウト。下部タブバーと本文領域を提供する。
 *
 * 休憩タイマーもここに置く。休憩中に履歴やグラフ、食事を見るのは普通の使い方で、
 * ホーム画面の中に置くと画面を移った瞬間に消えてしまうため。
 */
export function AppShell() {
  const restTimer = useRestTimerState()

  return (
    <div className={styles.shell}>
      <main className={restTimer.isVisible ? `${styles.main} ${styles.mainWithRestTimer}` : styles.main}>
        <Outlet />
      </main>

      {restTimer.isVisible && (
        <RestTimerBar
          seconds={restTimer.seconds}
          targetSeconds={restTimer.targetSeconds}
          onDismiss={restTimer.dismiss}
        />
      )}

      <TabBar />
    </div>
  )
}
