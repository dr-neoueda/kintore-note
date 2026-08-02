import { useEffect, useState } from 'react'

export type ColorScheme = 'light' | 'dark'

const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)'

/**
 * OS の外観設定を読む。
 * matchMedia が無い環境（テスト用の DOM など）ではライトとして扱う。
 */
function readPreferredScheme(): ColorScheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia(DARK_SCHEME_QUERY).matches ? 'dark' : 'light'
}

/**
 * iOS の外観設定（ライト／ダーク）に追従する。
 *
 * CSS だけで済む部分は `prefers-color-scheme` のメディアクエリで切り替えているが、
 * グラフのように JavaScript から色を渡す必要がある箇所でこのフックを使う。
 */
export function useColorScheme(): ColorScheme {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(readPreferredScheme)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(DARK_SCHEME_QUERY)
    const sync = () => setColorScheme(mediaQuery.matches ? 'dark' : 'light')

    // 初期描画後に設定が変わっていた場合に備えて一度そろえる
    sync()
    mediaQuery.addEventListener('change', sync)

    return () => mediaQuery.removeEventListener('change', sync)
  }, [])

  return colorScheme
}
