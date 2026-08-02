import { describe, test, expect } from 'vitest'
import type { WorkoutSet } from '@/domain/types'
import { buildInitialSetValues, DEFAULT_REPS } from './setDefaults'

const STEPS = [2.5, 5.5, 11.5, 24.0]

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

describe('buildInitialSetValues', () => {
  test('編集時は既存セットの値をそのまま返す', () => {
    // Arrange
    const existingSet = set({ weightKg: 13.5, reps: 6, rpe: 9, isWarmup: true })

    // Act
    const values = buildInitialSetValues({
      existingSet,
      setsInSession: [],
      previousSets: [],
      dumbbellStepsKg: STEPS,
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
      previousSets: [],
      dumbbellStepsKg: STEPS,
    })

    // Assert: RPE とウォームアップは引き継がない
    expect(values).toEqual({ weightKg: 11.5, reps: 8, rpe: null, isWarmup: false })
  })

  test('セッション内が空なら前回セッションの最初の本セットを引き継ぐ', () => {
    // Arrange
    const previousSets = [
      set({ order: 1, weightKg: 5.5, reps: 15, isWarmup: true }),
      set({ order: 2, weightKg: 11.5, reps: 10 }),
      set({ order: 3, weightKg: 11.5, reps: 7 }),
    ]

    // Act
    const values = buildInitialSetValues({
      existingSet: null,
      setsInSession: [],
      previousSets,
      dumbbellStepsKg: STEPS,
    })

    // Assert: ウォームアップではなく本セットの重量から始める
    expect(values).toEqual({ weightKg: 11.5, reps: 10, rpe: null, isWarmup: false })
  })

  test('前回セッションがウォームアップだけならそのセットを使う', () => {
    // Arrange
    const previousSets = [set({ weightKg: 4.5, reps: 20, isWarmup: true })]

    // Act
    const values = buildInitialSetValues({
      existingSet: null,
      setsInSession: [],
      previousSets,
      dumbbellStepsKg: STEPS,
    })

    // Assert
    expect(values.weightKg).toBe(4.5)
    expect(values.reps).toBe(20)
    expect(values.isWarmup).toBe(false)
  })

  test('記録が無ければ最も軽い段階と既定回数から始める', () => {
    // Act
    const values = buildInitialSetValues({
      existingSet: null,
      setsInSession: [],
      previousSets: [],
      dumbbellStepsKg: STEPS,
    })

    // Assert
    expect(values).toEqual({ weightKg: 2.5, reps: DEFAULT_REPS, rpe: null, isWarmup: false })
  })

  test('ダンベルの段階が未設定なら重量0から始める', () => {
    const values = buildInitialSetValues({
      existingSet: null,
      setsInSession: [],
      previousSets: [],
      dumbbellStepsKg: [],
    })

    expect(values.weightKg).toBe(0)
  })
})
