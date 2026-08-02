import { useEffect, useState } from 'react'
import { toDateKey, type DateKey } from '@/domain/date'

/**
 * 今日の日付キーを返す。
 * ホーム画面アプリは開きっぱなしになりやすいため、
 * 画面に戻ってきたタイミングで日付を取り直し、日付をまたいでも正しく記録できるようにする。
 */
export function useTodayKey(): DateKey {
  const [dateKey, setDateKey] = useState(() => toDateKey(new Date()))

  useEffect(() => {
    const sync = () => setDateKey(toDateKey(new Date()))

    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)

    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  return dateKey
}
