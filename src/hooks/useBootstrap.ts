import { useEffect, useState } from 'react'
import { ensureSeeded } from '@/data/seed'
import { getSettings } from '@/data/repositories/settingsRepository'

export interface BootstrapState {
  readonly isReady: boolean
  readonly error: string | null
}

/**
 * 起動時の初期化。初回だけ種目のシードと設定の作成を行う。
 * IndexedDB が使えない環境（プライベートブラウズなど）ではエラーを表に出す。
 */
export function useBootstrap(): BootstrapState {
  const [state, setState] = useState<BootstrapState>({ isReady: false, error: null })

  useEffect(() => {
    let isCancelled = false

    const run = async () => {
      try {
        await getSettings()
        await ensureSeeded()
        if (!isCancelled) setState({ isReady: true, error: null })
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : 'データベースの初期化に失敗しました'
        if (!isCancelled) setState({ isReady: false, error: message })
      }
    }

    void run()

    return () => {
      isCancelled = true
    }
  }, [])

  return state
}
