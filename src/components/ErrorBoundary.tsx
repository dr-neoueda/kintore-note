import { Component, type ErrorInfo, type ReactNode } from 'react'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  readonly error: Error | null
}

/**
 * 画面のどこかで例外が起きても、アプリ全体が真っ白にならないようにする。
 *
 * React はエラー境界が無いとツリー全体をアンマウントするため、
 * 1つの画面の不具合が「アプリが開かない」状態に見えてしまう。
 * 記録は IndexedDB に残っているので、再読み込みで復帰できることを伝える。
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 端末上で原因を追えるように、コンソールには残す
    console.error('画面の描画中にエラーが発生しました', error, errorInfo.componentStack)
  }

  private readonly handleReload = (): void => {
    window.location.reload()
  }

  private readonly handleGoHome = (): void => {
    window.location.href = import.meta.env.BASE_URL
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children

    return (
      <div className={styles.fallback}>
        <p className={styles.title}>画面を表示できませんでした</p>
        <p className={styles.description}>
          記録した内容は端末内に残っています。
          <br />
          再読み込みしても直らない場合は、ホームに戻ってみてください。
        </p>

        <p className={styles.detail}>{error.message}</p>

        <div className={styles.actions}>
          <button type="button" className="btn btn-primary btn-block" onClick={this.handleReload}>
            再読み込みする
          </button>
          <button type="button" className="btn btn-block" onClick={this.handleGoHome}>
            ホームに戻る
          </button>
        </div>
      </div>
    )
  }
}
