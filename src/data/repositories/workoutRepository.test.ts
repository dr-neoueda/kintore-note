import { describe, test, expect, beforeEach } from 'vitest'
import { resetDatabase } from '@/test/dbTestUtils'
import { addSet, listSetsByWorkout } from './setRepository'
import {
  deleteWorkout,
  getOrCreateWorkoutByDate,
  getWorkout,
  getWorkoutByDate,
  listRecentWorkouts,
  updateWorkout,
} from './workoutRepository'

const NOW = '2026-08-02T10:00:00.000Z'

beforeEach(async () => {
  await resetDatabase()
})

describe('getOrCreateWorkoutByDate', () => {
  test('その日のワークアウトが無ければ作成する', async () => {
    // Act
    const workout = await getOrCreateWorkoutByDate('2026-08-02', NOW)

    // Assert
    expect(workout.date).toBe('2026-08-02')
    expect(workout.startedAt).toBe(NOW)
    expect(workout.finishedAt).toBeNull()
    expect(workout.id).toBeDefined()
  })

  test('同じ日付なら既存のワークアウトを返す', async () => {
    // Arrange
    const first = await getOrCreateWorkoutByDate('2026-08-02', NOW)

    // Act
    const second = await getOrCreateWorkoutByDate('2026-08-02', '2026-08-02T18:00:00.000Z')

    // Assert: 1日1ワークアウトに束ねる設計
    expect(second.id).toBe(first.id)
    expect(second.startedAt).toBe(NOW)
  })

  test('不正な日付キーは受け付けない', async () => {
    await expect(getOrCreateWorkoutByDate('2026/08/02', NOW)).rejects.toThrow()
  })
})

describe('getWorkoutByDate', () => {
  test('存在しない日付なら undefined を返す', async () => {
    expect(await getWorkoutByDate('2026-08-02')).toBeUndefined()
  })
})

describe('listRecentWorkouts', () => {
  test('日付の降順で返す', async () => {
    // Arrange
    await getOrCreateWorkoutByDate('2026-07-30', NOW)
    await getOrCreateWorkoutByDate('2026-08-02', NOW)
    await getOrCreateWorkoutByDate('2026-08-01', NOW)

    // Act
    const recent = await listRecentWorkouts(10)

    // Assert
    expect(recent.map((workout) => workout.date)).toEqual([
      '2026-08-02',
      '2026-08-01',
      '2026-07-30',
    ])
  })

  test('件数の上限を守る', async () => {
    // Arrange
    await getOrCreateWorkoutByDate('2026-07-30', NOW)
    await getOrCreateWorkoutByDate('2026-08-01', NOW)

    // Act & Assert
    expect(await listRecentWorkouts(1)).toHaveLength(1)
  })
})

describe('updateWorkout', () => {
  test('メモと体重を更新できる', async () => {
    // Arrange
    const workout = await getOrCreateWorkoutByDate('2026-08-02', NOW)

    // Act
    await updateWorkout(workout.id!, { note: '調子が良い', bodyWeightKg: 68.4 })

    // Assert
    const updated = await getWorkout(workout.id!)
    expect(updated?.note).toBe('調子が良い')
    expect(updated?.bodyWeightKg).toBe(68.4)
  })
})

describe('deleteWorkout', () => {
  test('ワークアウトと一緒にセットも削除する', async () => {
    // Arrange
    const workout = await getOrCreateWorkoutByDate('2026-08-02', NOW)
    await addSet({
      workoutId: workout.id!,
      exerciseId: 1,
      weightKg: 10,
      reps: 10,
      rpe: null,
      restSec: null,
      restTargetSec: null,
      isWarmup: false,
      recordedAt: NOW,
    })

    // Act
    await deleteWorkout(workout.id!)

    // Assert
    expect(await getWorkout(workout.id!)).toBeUndefined()
    expect(await listSetsByWorkout(workout.id!)).toHaveLength(0)
  })
})
