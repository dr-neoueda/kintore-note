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
 * 切り替えボタンの行き先。
 *
 * 「食事」とだけ書くと、今いる場所を示しているのか行き先なのかが読めず、
 * 逆に見える。「食事へ」と動作として書き、いまいる側は見出しで示す。
 */
const SWITCH_TARGET: Readonly<
  Record<AppMode, { label: string; to: string; Icon: typeof DumbbellIcon }>
> = {
  workout: { label: '食事へ', to: '/meals', Icon: UtensilsIcon },
  meal: { label: '運動へ', to: '/', Icon: DumbbellIcon },
}

/** いま見ている側。切り替えボタンの上に小さく出す。 */
const CURRENT_MODE_LABELS: Readonly<Record<AppMode, string>> = {
  workout: '運動',
  meal: '食事',
}

export function TabBar() {
  const mode = useAppMode()
  const navigate = useNavigate()

  const target = SWITCH_TARGET[mode]

  return (
    <nav className={styles.tabbar} aria-label="メインナビゲーション">
      <button
        type="button"
        className={styles.switch}
        onClick={() => navigate(target.to)}
        aria-label={`${target.label}切り替える`}
      >
        <span className={styles.switchCurrent}>いま {CURRENT_MODE_LABELS[mode]}</span>
        <span className={styles.switchTarget}>
          <target.Icon size={16} />
          {target.label}
          <SwitchIcon size={10} />
        </span>
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
