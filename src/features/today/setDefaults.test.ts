import { describe, test, expect } from 'vitest'
import type { ProgressionSuggestion } from '@/domain/progression'
import type { WorkoutSet } from '@/domain/types'
import { buildInitialSetValues } from './setDefaults'

const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: 1,
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

const suggestion = (overrides: Partial<ProgressionSuggestion> = {}): ProgressionSuggestion => ({
  action: 'hold',
  weightKg: 11.5,
  repsHint: 10,
  previousWeightKg: 11.5,
  hasReachedTarget: false,
  isAtHeaviestStep: false,
  ...overrides,
})

describe('buildInitialSetValues', () => {
  test('編集時は既存セットの値をそのまま返す', () => {
    // Arrange
    const existingSet = set({ weightKg: 13.5, reps: 6, rpe: 9, isWarmup: true })

    // Act
    const values = buildInitialSetValues({
      existingSet,
      setsInSession: [],
      suggestion: suggestion(),
    })

    // Assert
    expect(values).toEqual({ weightKg: 13.5, reps: 6, rpe: 9, isWarmup: true })
  })

  test('同じセッションに既にセットがあれば重量と回数を引き継ぐ', () => {
    // Arrange
    const setsInSession = [
      set({ order: 1, weightKg: 11.5, reps: 10 }),
      set({ order: 2, weightKg: 11.5, reps: 8, rpe: 9 }),
    ]

    // Act
    const values = buildInitialSetValues({
      existingSet: null,
      setsInSession,
      suggestion: suggestion(),
    })

    // Assert: RPE とウォームアップは引き継がない
    expect(values).toEqual({ weightKg: 11.5, reps: 8, rpe: null, isWarmup: false })
  })

  test('セッションの1セット目は今回の提案を初期値にする', () => {
    // Act
    const values = buildInitialSetValues({
      existingSet: null,
      setsInSession: [],
      suggestion: suggestion({ weightKg: 13.5, repsHint: 8 }),
    })

    // Assert
    expect(values).toEqual({ weightKg: 13.5, reps: 8, rpe: null, isWarmup: false })
  })

  test('提案が増量なら、その重量と下限回数で始まる', () => {
    // Arrange: 目標達成で 11.5 → 13.5 に上げる提案
    const increased = suggestion({
      action: 'increase',
      weightKg: 13.5,
      repsHint: 8,
      previousWeightKg: 11.5,
      hasReachedTarget: true,
    })

    // Act
    const values = buildInitialSetValues({
      existingSet: null,
      setsInSession: [],
      suggestion: increased,
    })

    // Assert
    expect(values.weightKg).toBe(13.5)
    expect(values.reps).toBe(8)
  })
})
