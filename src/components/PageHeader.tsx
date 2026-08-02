import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from './icons'
import styles from './PageHeader.module.css'

interface PageHeaderProps {
  readonly title: string
  readonly subtitle?: string
  /** 戻るボタンを表示する。押すと履歴を1つ戻る。 */
  readonly showBack?: boolean
  /** 右側に置く操作ボタンなど。 */
  readonly actions?: ReactNode
}

export function PageHeader({ title, subtitle, showBack = false, actions }: PageHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className={styles.header}>
      {showBack && (
        <button type="button" className={styles.back} onClick={() => navigate(-1)} aria-label="戻る">
          <ChevronLeftIcon size={26} />
        </button>
      )}
      <div className={styles.titles}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle !== undefined && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions}
    </header>
  )
}
