import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from './icons'
import styles from './Sheet.module.css'

interface SheetProps {
  readonly isOpen: boolean
  readonly title: string
  readonly onClose: () => void
  readonly children: ReactNode
  readonly footer?: ReactNode
}

/**
 * 画面下から出るモーダル。
 * 片手で操作しやすいよう、主要な入力は下寄せで表示する。
 */
export function Sheet({ isOpen, title, onClose, children, footer }: SheetProps) {
  useEffect(() => {
    if (!isOpen) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    // 背面のスクロールを止める
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="閉じる">
            <CloseIcon size={22} />
          </button>
        </div>

        <div className={styles.body}>{children}</div>

        {footer !== undefined && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  )
}
