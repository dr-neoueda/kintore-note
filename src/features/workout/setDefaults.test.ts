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
  restTargetSec: null,
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
    const existingSet = set({
      weightKg: 13.5,
      reps: 6,
      rpe: 9,
      isWarmup: true,
      restTargetSec: 45,
    })

    // Act
    const values = buildInitialSetValues({
      existingSet,
      setsInSession: [],
      suggestion: suggestion(),
      exerciseRestSec: 150,
    })

    // Assert
    expect(values).toEqual({
      weightKg: 13.5,
      reps: 6,
      rpe: 9,
      isWarmup: true,
      restTargetSec: 45,
    })
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
      exerciseRestSec: 150,
    })

    // Assert: RPE とウォームアップは引き継がない
    expect(values).toEqual({
      weightKg: 11.5,
      reps: 8,
      rpe: null,
      isWarmup: false,
      restTargetSec: 150,
    })
  })

  test('セッションの1セット目は今回の提案を初期値にする', () => {
    // Act
    const values = buildInitialSetValues({
      existingSet: null,
      setsInSession: [],
      suggestion: suggestion({ weightKg: 13.5, repsHint: 8 }),
      exerciseRestSec: 150,
    })

    // Assert
    expect(values).toEqual({
      weightKg: 13.5,
      reps: 8,
      rpe: null,
      isWarmup: false,
      restTargetSec: 150,
    })
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
      exerciseRestSec: 150,
    })

    // Assert
    expect(values.weightKg).toBe(13.5)
    expect(values.reps).toBe(8)
  })

  test('休憩の目安は種目の設定から始まる', () => {
    // Act
    const values = buildInitialSetValues({
      existingSet: null,
      setsInSession: [],
      suggestion: suggestion(),
      exerciseRestSec: 90,
    })

    // Assert
    expect(values.restTargetSec).toBe(90)
  })

  test('休憩の目安は前のセットから引き継がない', () => {
    // Arrange: 直前がウォームアップでも、次のセットは種目の設定に戻す
    const setsInSession = [set({ order: 1, isWarmup: true, restTargetSec: 45 })]

    // Act
    const values = buildInitialSetValues({
      existingSet: null,
      setsInSession,
      suggestion: suggestion(),
      exerciseRestSec: 150,
    })

    // Assert
    expect(values.restTargetSec).toBe(150)
  })

  test('保存済みのセットに休憩の目安が無ければ種目の設定で補う', () => {
    // Arrange: v5 より前に記録したセット
    const existingSet = set({ restTargetSec: null })

    // Act
    const values = buildInitialSetValues({
      existingSet,
      setsInSession: [],
      suggestion: suggestion(),
      exerciseRestSec: 120,
    })

    // Assert
    expect(values.restTargetSec).toBe(120)
  })
})
