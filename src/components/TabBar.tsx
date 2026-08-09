import { NavLink, useNavigate } from 'react-router-dom'
import { useAppMode, type AppMode } from '@/hooks/useAppMode'
import {
  CalendarIcon,
  ChartIcon,
  DumbbellIcon,
  ListIcon,
  SlidersIcon,
  SwitchIcon,
  UtensilsIcon,
} from './icons'
import styles from './TabBar.module.css'

interface TabDefinition {
  readonly to: string
  readonly label: string
  readonly Icon: typeof DumbbellIcon
  /** ルート直下だけを一致とみなすか（親パスの誤一致を防ぐ）。 */
  readonly end?: boolean
}

/**
 * 運動と食事は「別のアプリ」に近い。
 * 6つを横並びにすると1つあたり62pxで、どちらも中途半端に窮屈になる。
 * そこで左端で系統を切り替え、右端の設定だけを常設にする。
 */
const TABS_BY_MODE: Readonly<Record<AppMode, readonly TabDefinition[]>> = {
  workout: [
    { to: '/', label: 'ホーム', Icon: DumbbellIcon, end: true },
    { to: '/history', label: '履歴', Icon: CalendarIcon },
    { to: '/charts', label: 'グラフ', Icon: ChartIcon },
    { to: '/templates', label: 'メニュー', Icon: ListIcon },
  ],
  meal: [
    { to: '/meals', label: '今日', Icon: UtensilsIcon, end: true },
    { to: '/meals/history', label: '履歴', Icon: CalendarIcon },
    { to: '/meals/charts', label: 'グラフ', Icon: ChartIcon },
    { to: '/meals/templates', label: '献立', Icon: ListIcon },
  ],
}

/**
 * 系統の表示と切り替え先。
 *
 * ボタンには**いま見ている側**を出す。表示と中央のタブが揃うので、
 * どちらを見ているかが一目で分かる。押すともう一方へ移る。
 */
const MODES: Readonly<
  Record<AppMode, { label: string; Icon: typeof DumbbellIcon; switchTo: AppMode; to: string }>
> = {
  workout: { label: '運動', Icon: DumbbellIcon, switchTo: 'meal', to: '/meals' },
  meal: { label: '食事', Icon: UtensilsIcon, switchTo: 'workout', to: '/' },
}

export function TabBar() {
  const mode = useAppMode()
  const navigate = useNavigate()

  const current = MODES[mode]
  const other = MODES[current.switchTo]

  return (
    <nav className={styles.tabbar} aria-label="メインナビゲーション">
      <button
        type="button"
        className={styles.switch}
        onClick={() => navigate(current.to)}
        aria-label={`${other.label}に切り替える`}
      >
        <span className={styles.switchIcons}>
          <current.Icon size={20} />
          <SwitchIcon size={12} />
        </span>
        <span>{current.label}</span>
      </button>

      {TABS_BY_MODE[mode].map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end ?? false}
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}

      <NavLink
        to="/settings"
        className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
      >
        <SlidersIcon size={22} />
        <span>設定</span>
      </NavLink>
    </nav>
  )
}
