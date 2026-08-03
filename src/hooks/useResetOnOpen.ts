import { useEffect, useRef } from 'react'

/**
 * シートが閉じた状態から開いた瞬間だけ初期化する。
 *
 * 初期値の同一性を合図にすると、背後の画面が再描画されるたびに
 * 入力中の内容が初期値で上書きされてしまう。
 * ホーム画面は休憩タイマーのために毎秒再描画されるため、
 * その間は入力が一切できなくなる。
 */
export function useResetOnOpen(isOpen: boolean, reset: () => void): void {
  const wasOpenRef = useRef(false)
  const resetRef = useRef(reset)
  resetRef.current = reset

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      resetRef.current()
    }
    wasOpenRef.current = isOpen
  }, [isOpen])
}
