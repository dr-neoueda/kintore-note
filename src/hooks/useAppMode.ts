import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/** 運動系と食事系。下部タブの中身がこれで入れ替わる。 */
export type AppMode = 'workout' | 'meal'

const STORAGE_KEY = 'kintore-note:app-mode'

/** 食事系の画面はこの接頭辞で始める。 */
const MEAL_PATH_PREFIX = '/meals'

/** どちらの系統にも属さない画面。直前の系統のタブを出し続ける。 */
function isSharedPath(pathname: string): boolean {
  return pathname.startsWith('/settings')
}

export function resolveModeFromPath(pathname: string): AppMode | null {
  if (isSharedPath(pathname)) return null
  return pathname.startsWith(MEAL_PATH_PREFIX) ? 'meal' : 'workout'
}

function readStoredMode(): AppMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'meal' ? 'meal' : 'workout'
  } catch {
    // プライベートブラウズなどで localStorage が使えなくても動かす
    return 'workout'
  }
}

/**
 * いま表示すべき系統を返す。
 *
 * 基本は今いる画面から決める。設定画面のようにどちらにも属さない画面では、
 * 直前にいた系統のタブを出し続ける（設定を開くたびに運動側へ戻ると使いにくい）。
 */
export function useAppMode(): AppMode {
  const { pathname } = useLocation()
  const fromPath = resolveModeFromPath(pathname)
  const lastModeRef = useRef<AppMode>(fromPath ?? readStoredMode())

  if (fromPath !== null) lastModeRef.current = fromPath

  useEffect(() => {
    if (fromPath === null) return
    try {
      localStorage.setItem(STORAGE_KEY, fromPath)
    } catch {
      // 保存できなくても、この画面にいる間の表示は変わらない
    }
  }, [fromPath])

  return lastModeRef.current
}
