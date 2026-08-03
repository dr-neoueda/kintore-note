import { describe, test, expect } from 'vitest'
import type { WorkoutSet } from './types'
import { summarizeWorkout } from './workoutStats'

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

describe('summarizeWorkout', () => {
  test('本セット数と種目数を集計する', () => {
    // Arrange
    const sets = [
      set({ exerciseId: 1 }),
      set({ exerciseId: 1 }),
      set({ exerciseId: 2 }),
    ]

    // Act
    const summary = summarizeWorkout(sets)

    // Assert
    expect(summary.workingSetCount).toBe(3)
    expect(summary.exerciseCount).toBe(2)
  })

  test('ウォームアップは本セット数から除外する', () => {
    // Arrange
    const sets = [set({ isWarmup: true }), set()]

    // Act
    const summary = summarizeWorkout(sets)

    // Assert
    expect(summary.workingSetCount).toBe(1)
  })

  test('ウォームアップだけの種目も種目数には数える', () => {
    // Arrange
    const sets = [set({ exerciseId: 1, isWarmup: true })]

    // Act & Assert
    expect(summarizeWorkout(sets).exerciseCount).toBe(1)
  })

  test('セットが無ければすべて0になる', () => {
    expect(summarizeWorkout([])).toEqual({
      workingSetCount: 0,
      exerciseCount: 0,
    })
  })
})
