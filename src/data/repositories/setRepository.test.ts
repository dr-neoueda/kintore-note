import { describe, test, expect, beforeEach } from 'vitest'
import { resetDatabase } from '@/test/dbTestUtils'
import type { WorkoutId } from '@/domain/types'
import { getOrCreateWorkoutByDate } from './workoutRepository'
import {
  addSet,
  deleteSet,
  findPreviousSessionSets,
  listSetsByWorkout,
  updateSet,
} from './setRepository'

const NOW = '2026-08-02T10:00:00.000Z'
const INCLINE_PRESS_ID = 1

beforeEach(async () => {
  await resetDatabase()
})

async function createWorkout(date: string): Promise<WorkoutId> {
  const workout = await getOrCreateWorkoutByDate(date, `${date}T10:00:00.000Z`)
  return workout.id!
}

function setInput(workoutId: WorkoutId, overrides: Record<string, unknown> = {}) {
  return {
    workoutId,
    exerciseId: INCLINE_PRESS_ID,
    weightKg: 11.5,
    reps: 10,
    rpe: null,
    restSec: null,
    isWarmup: false,
    recordedAt: NOW,
    ...overrides,
  }
}

describe('addSet', () => {
  test('セットを追加して取得できる', async () => {
    // Arrange
    const workoutId = await createWorkout('2026-08-02')

    // Act
    await addSet(setInput(workoutId))

    // Assert
    const sets = await listSetsByWorkout(workoutId)
    expect(sets).toHaveLength(1)
    expect(sets[0]?.weightKg).toBe(11.5)
  })

  test('並び順を自動で連番にする', async () => {
    // Arrange
    const workoutId = await createWorkout('2026-08-02')

    // Act
    await addSet(setInput(workoutId))
    await addSet(setInput(workoutId, { reps: 8 }))
    await addSet(setInput(workoutId, { reps: 6 }))

    // Assert
    const sets = await listSetsByWorkout(workoutId)
    expect(sets.map((set) => set.order)).toEqual([1, 2, 3])
    expect(sets.map((set) => set.reps)).toEqual([10, 8, 6])
  })

  test('回数が0以下のセットは追加できない', async () => {
    const workoutId = await createWorkout('2026-08-02')

    await expect(addSet(setInput(workoutId, { reps: 0 }))).rejects.toThrow()
  })

  test('RPE が範囲外なら追加できない', async () => {
    const workoutId = await createWorkout('2026-08-02')

    await expect(addSet(setInput(workoutId, { rpe: 11 }))).rejects.toThrow()
    await expect(addSet(setInput(workoutId, { rpe: 0 }))).rejects.toThrow()
  })
})

describe('listSetsByWorkout', () => {
  test('並び順の昇順で返す', async () => {
    // Arrange
    const workoutId = await createWorkout('2026-08-02')
    const firstId = await addSet(setInput(workoutId, { reps: 10 }))
    await addSet(setInput(workoutId, { reps: 8 }))

    // Act: 先頭のセットを後ろに移す
    await updateSet(firstId, { order: 99 })

    // Assert
    const sets = await listSetsByWorkout(workoutId)
    expect(sets.map((set) => set.reps)).toEqual([8, 10])
  })
})

describe('updateSet', () => {
  test('重量と回数を更新できる', async () => {
    // Arrange
    const workoutId = await createWorkout('2026-08-02')
    const id = await addSet(setInput(workoutId))

    // Act
    await updateSet(id, { weightKg: 13.5, reps: 6, rpe: 8 })

    // Assert
    const sets = await listSetsByWorkout(workoutId)
    expect(sets[0]?.weightKg).toBe(13.5)
    expect(sets[0]?.reps).toBe(6)
    expect(sets[0]?.rpe).toBe(8)
  })

  test('不正な回数には更新できない', async () => {
    const workoutId = await createWorkout('2026-08-02')
    const id = await addSet(setInput(workoutId))

    await expect(updateSet(id, { reps: -1 })).rejects.toThrow()
  })
})

describe('deleteSet', () => {
  test('セットを削除できる', async () => {
    // Arrange
    const workoutId = await createWorkout('2026-08-02')
    const id = await addSet(setInput(workoutId))

    // Act
    await deleteSet(id)

    // Assert
    expect(await listSetsByWorkout(workoutId)).toHaveLength(0)
  })
})

describe('findPreviousSessionSets', () => {
  test('直近の別のワークアウトのセットを返す', async () => {
    // Arrange
    const oldestId = await createWorkout('2026-07-26')
    const previousId = await createWorkout('2026-07-30')
    const currentId = await createWorkout('2026-08-02')
    await addSet(setInput(oldestId, { recordedAt: '2026-07-26T10:00:00.000Z', weightKg: 9 }))
    await addSet(setInput(previousId, { recordedAt: '2026-07-30T10:00:00.000Z', weightKg: 10 }))
    await addSet(setInput(previousId, { recordedAt: '2026-07-30T10:05:00.000Z', weightKg: 10 }))
    await addSet(setInput(currentId, { recordedAt: '2026-08-02T10:00:00.000Z', weightKg: 11.5 }))

    // Act
    const previous = await findPreviousSessionSets(INCLINE_PRESS_ID, currentId)

    // Assert: 前回セッションの2セットだけが返る
    expect(previous).toHaveLength(2)
    expect(previous.every((set) => set.weightKg === 10)).toBe(true)
  })

  test('過去に実施していなければ空配列を返す', async () => {
    // Arrange
    const currentId = await createWorkout('2026-08-02')
    await addSet(setInput(currentId))

    // Act & Assert
    expect(await findPreviousSessionSets(INCLINE_PRESS_ID, currentId)).toEqual([])
  })
})

describe('findPreviousSessionSets（その日より前だけを見る）', () => {
  test('編集中の日より後のセッションは前回として扱わない', async () => {
    // Arrange: 7/20 を後から入力している状況。8/2 は「前回」ではない
    const pastId = await createWorkout('2026-07-20')
    const laterId = await createWorkout('2026-08-02')
    await addSet(setInput(pastId, { recordedAt: '2026-07-20T12:00:00.000Z', weightKg: 9 }))
    await addSet(setInput(laterId, { recordedAt: '2026-08-02T10:00:00.000Z', weightKg: 20 }))

    // Act
    const previous = await findPreviousSessionSets(
      INCLINE_PRESS_ID,
      pastId,
      '2026-07-20T00:00:00.000Z',
    )

    // Assert
    expect(previous).toEqual([])
  })

  test('その日より前のセッションは前回として返す', async () => {
    // Arrange
    const olderId = await createWorkout('2026-07-10')
    const pastId = await createWorkout('2026-07-20')
    await addSet(setInput(olderId, { recordedAt: '2026-07-10T12:00:00.000Z', weightKg: 7 }))
    await addSet(setInput(pastId, { recordedAt: '2026-07-20T12:00:00.000Z', weightKg: 9 }))

    // Act
    const previous = await findPreviousSessionSets(
      INCLINE_PRESS_ID,
      pastId,
      '2026-07-20T00:00:00.000Z',
    )

    // Assert
    expect(previous).toHaveLength(1)
    expect(previous[0]?.weightKg).toBe(7)
  })
})
