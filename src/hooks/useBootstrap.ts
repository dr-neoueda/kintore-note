import { useEffect, useState } from 'react'
import { ensureSeeded } from '@/data/seed'
import { ensureSettings } from '@/data/repositories/settingsRepository'

/**
 * 記録を消されにくくするようブラウザに要求する。
 *
 * 端末の空き容量が減ったとき、ブラウザは保存データを削除することがある。
 * 永続化を要求しておくと対象になりにくい。拒否されても動作に影響はないため、
 * 結果は問わない。
 */
async function requestPersistentStorage(): Promise<void> {
  if (typeof navigator === 'undefined') return
  if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') return

  try {
    await navigator.storage.persist()
  } catch {
    // 対応していない環境では何もしない
  }
}

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
        await ensureSettings()
        await ensureSeeded()
        await requestPersistentStorage()
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
