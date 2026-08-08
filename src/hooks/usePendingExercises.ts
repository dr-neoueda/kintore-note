import { useCallback, useState } from 'react'
import type { DateKey } from '@/domain/date'
import type { ExerciseId } from '@/domain/types'

/**
 * まだ1セットも記録していない、その日の予定種目。
 *
 * 画面の state だけで持つと、メニューを選んだあとに履歴やグラフを見に行った
 * 時点で選択が消えてしまう。記録前なので DB のワークアウトは作れない
 * （記録の無い日が増えてしまう）ため、端末側に覚えさせる。
 */

const STORAGE_KEY = 'kintore-note:pending-exercises'

/** 覚えておく日数。古い予定が溜まり続けないように上限を設ける。 */
const MAX_STORED_DATES = 7

type PendingByDate = Record<string, number[]>

function readAll(): PendingByDate {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return {}

    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return {}

    const result: PendingByDate = {}
    for (const [date, ids] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(ids)) {
        result[date] = ids.filter((id): id is number => typeof id === 'number')
      }
    }
    return result
  } catch {
    // 壊れた値やプライベートブラウズでも、記録そのものは続けられるようにする
    return {}
  }
}

function writeAll(all: PendingByDate): void {
  // 新しい日付だけを残す
  const pruned = Object.fromEntries(
    Object.entries(all)
      .filter(([, ids]) => ids.length > 0)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, MAX_STORED_DATES),
  )

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned))
  } catch {
    // 保存できなくても、この画面にいる間の表示は変わらない
  }
}

export interface PendingExercises {
  readonly exerciseIds: readonly ExerciseId[]
  readonly add: (exerciseId: ExerciseId) => void
  readonly addMany: (exerciseIds: readonly ExerciseId[]) => void
  readonly remove: (exerciseId: ExerciseId) => void
}

export function usePendingExercises(dateKey: DateKey): PendingExercises {
  const [exerciseIds, setExerciseIds] = useState<readonly ExerciseId[]>(
    () => readAll()[dateKey] ?? [],
  )

  const update = useCallback(
    (next: (current: readonly ExerciseId[]) => readonly ExerciseId[]) => {
      setExerciseIds((current) => {
        const updated = next(current)
        writeAll({ ...readAll(), [dateKey]: [...updated] })
        return updated
      })
    },
    [dateKey],
  )

  return {
    exerciseIds,
    add: useCallback(
      (exerciseId) =>
        update((current) => (current.includes(exerciseId) ? current : [...current, exerciseId])),
      [update],
    ),
    addMany: useCallback(
      (ids) => update((current) => [...current, ...ids.filter((id) => !current.includes(id))]),
      [update],
    ),
    remove: useCallback(
      (exerciseId) => update((current) => current.filter((id) => id !== exerciseId)),
      [update],
    ),
  }
}
