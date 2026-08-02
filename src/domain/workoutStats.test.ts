import { describe, test, expect } from 'vitest'
import { PENNATE_TARGET } from './muscle'
import type { Exercise, ExerciseId, WorkoutSet } from './types'
import { summarizeWorkout, toVolumeInputs } from './workoutStats'

const exercise = (id: ExerciseId, dumbbellCount: 1 | 2): Exercise => ({
  id,
  name: `種目${id}`,
  muscleGroup: 'chest',
  equipment: 'dumbbell',
  dumbbellCount,
  muscleArchitecture: 'pennate',
  target: PENNATE_TARGET,
  restSec: 150,
  referenceUrl: null,
  isArchived: false,
  createdAt: '2026-08-02T00:00:00.000Z',
})

const EXERCISES = new Map<ExerciseId, Exercise>([
  [1, exercise(1, 2)],
  [2, exercise(2, 1)],
])

const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  workoutId: 1,
  exerciseId: 1,
  order: 1,
  weightKg: 10,
  reps: 10,
  rpe: null,
  restSec: null,
  isWarmup: false,
  recordedAt: '2026-08-02T10:00:00.000Z',
  ...overrides,
})

describe('toVolumeInputs', () => {
  test('種目のダンベル数を引き当てて計算入力に変換する', () => {
    // Arrange
    const sets = [set({ exerciseId: 1 }), set({ exerciseId: 2 })]

    // Act
    const inputs = toVolumeInputs(sets, EXERCISES)

    // Assert
    expect(inputs.map((input) => input.dumbbellCount)).toEqual([2, 1])
  })

  test('種目が見つからない場合はダンベル数1として扱う', () => {
    // Arrange: 種目が削除済みなどで引けないケース
    const sets = [set({ exerciseId: 999 })]

    // Act & Assert
    expect(toVolumeInputs(sets, EXERCISES)[0]?.dumbbellCount).toBe(1)
  })
})

describe('summarizeWorkout', () => {
  test('総ボリューム・本セット数・種目数を集計する', () => {
    // Arrange
    const sets = [
      set({ exerciseId: 1, weightKg: 10, reps: 10 }), // 200
      set({ exerciseId: 1, weightKg: 10, reps: 8 }), // 160
      set({ exerciseId: 2, weightKg: 20, reps: 5 }), // 100
    ]

    // Act
    const summary = summarizeWorkout(sets, EXERCISES)

    // Assert
    expect(summary.totalVolumeKg).toBe(460)
    expect(summary.workingSetCount).toBe(3)
    expect(summary.exerciseCount).toBe(2)
  })

  test('ウォームアップはボリュームと本セット数から除外する', () => {
    // Arrange
    const sets = [
      set({ exerciseId: 1, weightKg: 5, reps: 10, isWarmup: true }),
      set({ exerciseId: 1, weightKg: 10, reps: 10 }),
    ]

    // Act
    const summary = summarizeWorkout(sets, EXERCISES)

    // Assert
    expect(summary.totalVolumeKg).toBe(200)
    expect(summary.workingSetCount).toBe(1)
  })

  test('ウォームアップだけの種目も種目数には数える', () => {
    // Arrange
    const sets = [set({ exerciseId: 1, isWarmup: true })]

    // Act & Assert
    expect(summarizeWorkout(sets, EXERCISES).exerciseCount).toBe(1)
  })

  test('セットが無ければすべて0になる', () => {
    expect(summarizeWorkout([], EXERCISES)).toEqual({
      totalVolumeKg: 0,
      workingSetCount: 0,
      exerciseCount: 0,
    })
  })
})
