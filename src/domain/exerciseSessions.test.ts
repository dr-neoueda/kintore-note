import { describe, test, expect } from 'vitest'
import type { DateKey } from './date'
import { buildExerciseSessions } from './exerciseSessions'
import type { WorkoutId, WorkoutSet } from './types'

const DATE_BY_WORKOUT = new Map<WorkoutId, DateKey>([
  [1, '2026-07-22'],
  [2, '2026-07-26'],
  [3, '2026-08-02'],
])

const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  workoutId: 1,
  exerciseId: 1,
  order: 1,
  weightKg: 10,
  reps: 10,
  rpe: null,
  restSec: null,
  restTargetSec: null,
  isWarmup: false,
  recordedAt: '2026-07-22T10:00:00.000Z',
  ...overrides,
})

describe('buildExerciseSessions', () => {
  test('新しいセッションから順に返す', () => {
    // Arrange
    const sets = [set({ workoutId: 1 }), set({ workoutId: 3 }), set({ workoutId: 2 })]

    // Act
    const sessions = buildExerciseSessions(sets, DATE_BY_WORKOUT)

    // Assert
    expect(sessions.map((session) => session.date)).toEqual([
      '2026-08-02',
      '2026-07-26',
      '2026-07-22',
    ])
  })

  test('セッション内のセットを並び順で持つ', () => {
    // Arrange
    const sets = [
      set({ workoutId: 1, order: 3, reps: 8 }),
      set({ workoutId: 1, order: 1, reps: 10 }),
      set({ workoutId: 1, order: 2, reps: 9 }),
    ]

    // Act
    const sessions = buildExerciseSessions(sets, DATE_BY_WORKOUT)

    // Assert
    expect(sessions[0]?.sets.map((item) => item.reps)).toEqual([10, 9, 8])
  })

  test('最も重いセットの重量をそのセッションの重量とする', () => {
    // Arrange
    const sets = [
      set({ workoutId: 1, order: 1, weightKg: 11.5 }),
      set({ workoutId: 1, order: 2, weightKg: 10 }),
    ]

    // Act & Assert
    expect(buildExerciseSessions(sets, DATE_BY_WORKOUT)[0]?.topWeightKg).toBe(11.5)
  })

  test('ウォームアップは集計から除外する', () => {
    // Arrange
    const sets = [
      set({ workoutId: 1, order: 1, weightKg: 24, isWarmup: true }),
      set({ workoutId: 1, order: 2, weightKg: 10 }),
    ]

    // Act
    const sessions = buildExerciseSessions(sets, DATE_BY_WORKOUT)

    // Assert
    expect(sessions[0]?.topWeightKg).toBe(10)
    expect(sessions[0]?.sets).toHaveLength(1)
  })

  test('前のセッションより重ければ増量した印を付ける', () => {
    // Arrange: 7/22 は 10kg、7/26 は 11.5kg、8/2 は据え置き
    const sets = [
      set({ workoutId: 1, weightKg: 10 }),
      set({ workoutId: 2, weightKg: 11.5 }),
      set({ workoutId: 3, weightKg: 11.5 }),
    ]

    // Act
    const sessions = buildExerciseSessions(sets, DATE_BY_WORKOUT)

    // Assert: 新しい順なので [8/2, 7/26, 7/22]
    expect(sessions.map((session) => session.isWeightIncreased)).toEqual([false, true, false])
  })

  test('本セットが1つも無いセッションは含めない', () => {
    // Arrange
    const sets = [set({ workoutId: 1, isWarmup: true })]

    // Act & Assert
    expect(buildExerciseSessions(sets, DATE_BY_WORKOUT)).toEqual([])
  })

  test('日付が引けないセットは無視する', () => {
    expect(buildExerciseSessions([set({ workoutId: 999 })], DATE_BY_WORKOUT)).toEqual([])
  })

  test('セットが無ければ空配列を返す', () => {
    expect(buildExerciseSessions([], DATE_BY_WORKOUT)).toEqual([])
  })
})
