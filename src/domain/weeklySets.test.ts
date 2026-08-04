import { describe, test, expect } from 'vitest'
import type { DateKey } from './date'
import { PENNATE_TARGET } from './muscle'
import type { Exercise, ExerciseId, MuscleGroup, WorkoutId, WorkoutSet } from './types'
import {
  WEEKLY_SET_TARGET_MAX,
  WEEKLY_SET_TARGET_MIN,
  countWorkingSetsByMuscleGroup,
} from './weeklySets'

const exercise = (id: ExerciseId, muscleGroup: MuscleGroup): Exercise => ({
  id,
  name: `種目${id}`,
  muscleGroup,
  equipment: 'dumbbell',
  dumbbellCount: 2,
  muscleArchitecture: 'pennate',
  target: PENNATE_TARGET,
  restSec: 150,
  referenceUrl: null,
  isArchived: false,
  createdAt: '2026-07-01T00:00:00.000Z',
})

const EXERCISES = new Map<ExerciseId, Exercise>([
  [1, exercise(1, 'chest')],
  [2, exercise(2, 'chest')],
  [3, exercise(3, 'back')],
])

// 1: 週内、2: 週内、3: 週の直前
const DATE_BY_WORKOUT = new Map<WorkoutId, DateKey>([
  [1, '2026-08-03'],
  [2, '2026-08-06'],
  [3, '2026-08-02'],
])

const WEEK = { fromDate: '2026-08-03', toDate: '2026-08-09' }

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
  recordedAt: '2026-08-03T10:00:00.000Z',
  ...overrides,
})

describe('countWorkingSetsByMuscleGroup', () => {
  test('部位ごとに本セット数を数える', () => {
    // Arrange: 胸2種目で計3セット、背中1セット
    const sets = [
      set({ exerciseId: 1 }),
      set({ exerciseId: 1 }),
      set({ exerciseId: 2, workoutId: 2 }),
      set({ exerciseId: 3, workoutId: 2 }),
    ]

    // Act
    const counts = countWorkingSetsByMuscleGroup(sets, EXERCISES, DATE_BY_WORKOUT, WEEK)

    // Assert
    expect(counts.chest).toBe(3)
    expect(counts.back).toBe(1)
  })

  test('ウォームアップは数えない', () => {
    const sets = [set({ isWarmup: true }), set()]

    expect(countWorkingSetsByMuscleGroup(sets, EXERCISES, DATE_BY_WORKOUT, WEEK).chest).toBe(1)
  })

  test('週の範囲外のセットは数えない', () => {
    // Arrange: workoutId 3 は 8/2（週の前日）
    const sets = [set({ workoutId: 3, exerciseId: 3 })]

    // Act & Assert
    expect(countWorkingSetsByMuscleGroup(sets, EXERCISES, DATE_BY_WORKOUT, WEEK).back).toBe(0)
  })

  test('種目が引けないセットは無視する', () => {
    const sets = [set({ exerciseId: 999 })]
    const counts = countWorkingSetsByMuscleGroup(sets, EXERCISES, DATE_BY_WORKOUT, WEEK)

    expect(Object.values(counts).every((count) => count === 0)).toBe(true)
  })

  test('日付が引けないセットは無視する', () => {
    const sets = [set({ workoutId: 999 })]
    const counts = countWorkingSetsByMuscleGroup(sets, EXERCISES, DATE_BY_WORKOUT, WEEK)

    expect(counts.chest).toBe(0)
  })

  test('セットが無ければ全部位0になる', () => {
    const counts = countWorkingSetsByMuscleGroup([], EXERCISES, DATE_BY_WORKOUT, WEEK)

    expect(counts).toEqual({
      chest: 0,
      back: 0,
      shoulders: 0,
      arms: 0,
      legs: 0,
      core: 0,
      other: 0,
    })
  })
})

describe('週あたりのセット数の目安', () => {
  test('筋肥大の目安として広く使われる 10〜20 を採用する', () => {
    expect(WEEKLY_SET_TARGET_MIN).toBe(10)
    expect(WEEKLY_SET_TARGET_MAX).toBe(20)
  })
})
