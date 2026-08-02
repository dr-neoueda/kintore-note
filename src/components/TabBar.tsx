import { NavLink } from 'react-router-dom'
import { CalendarIcon, ChartIcon, DumbbellIcon, ListIcon, SlidersIcon } from './icons'
import styles from './TabBar.module.css'

interface TabDefinition {
  readonly to: string
  readonly label: string
  readonly Icon: typeof DumbbellIcon
}

const TABS: readonly TabDefinition[] = [
  { to: '/', label: '今日', Icon: DumbbellIcon },
  { to: '/history', label: '履歴', Icon: CalendarIcon },
  { to: '/charts', label: 'グラフ', Icon: ChartIcon },
  { to: '/templates', label: 'メニュー', Icon: ListIcon },
  { to: '/settings', label: '設定', Icon: SlidersIcon },
]

export function TabBar() {
  return (
    <nav className={styles.tabbar} aria-label="メインナビゲーション">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
