import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'
import styles from './AppShell.module.css'

/** 全画面共通のレイアウト。下部タブバーと本文領域を提供する。 */
export function AppShell() {
  return (
    <div className={styles.shell}>
      <main className={styles.main}>
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
