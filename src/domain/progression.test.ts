import { describe, test, expect } from 'vitest'
import {
  DEFAULT_PROGRESSION_TARGET,
  normalizeProgressionTarget,
  suggestNextSession,
} from './progression'
import type { ProgressionTarget, WorkoutSet } from './types'

const STEPS = [2.5, 3.5, 4.5, 5.5, 6.5, 8.0, 9.0, 10.0, 11.5, 13.5, 16.0, 18.0, 20.5, 22.5, 24.0]
const TARGET: ProgressionTarget = { repsMin: 8, repsMax: 12, sets: 3 }

const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  workoutId: 1,
  exerciseId: 1,
  order: 1,
  weightKg: 11.5,
  reps: 10,
  rpe: null,
  restSec: null,
  isWarmup: false,
  recordedAt: '2026-08-02T10:00:00.000Z',
  ...overrides,
})

const suggest = (
  previousSets: readonly WorkoutSet[],
  overrides: { target?: ProgressionTarget; isBodyweight?: boolean } = {},
) =>
  suggestNextSession({
    previousSets,
    target: overrides.target ?? TARGET,
    dumbbellStepsKg: STEPS,
    isBodyweight: overrides.isBodyweight ?? false,
  })

describe('suggestNextSession', () => {
  test('記録が無ければ最も軽い段階から始めるよう提案する', () => {
    // Act
    const suggestion = suggest([])

    // Assert
    expect(suggestion.action).toBe('start')
    expect(suggestion.weightKg).toBe(2.5)
    expect(suggestion.previousWeightKg).toBeNull()
    expect(suggestion.repsHint).toBe(TARGET.repsMin)
  })

  test('全セットで上限回数に達していれば1段階上げる', () => {
    // Arrange: 11.5kg × 12,12,12 は目標達成
    const previousSets = [
      set({ order: 1, reps: 12 }),
      set({ order: 2, reps: 12 }),
      set({ order: 3, reps: 12 }),
    ]

    // Act
    const suggestion = suggest(previousSets)

    // Assert: 11.5 の次の段階は 13.5
    expect(suggestion.action).toBe('increase')
    expect(suggestion.weightKg).toBe(13.5)
    expect(suggestion.previousWeightKg).toBe(11.5)
    expect(suggestion.hasReachedTarget).toBe(true)
    // 重量を上げた直後は下限回数から仕切り直す
    expect(suggestion.repsHint).toBe(TARGET.repsMin)
  })

  test('1セットでも上限回数に届いていなければ据え置く', () => {
    // Arrange
    const previousSets = [
      set({ order: 1, reps: 12 }),
      set({ order: 2, reps: 12 }),
      set({ order: 3, reps: 11 }),
    ]

    // Act
    const suggestion = suggest(previousSets)

    // Assert
    expect(suggestion.action).toBe('hold')
    expect(suggestion.weightKg).toBe(11.5)
    expect(suggestion.hasReachedTarget).toBe(false)
  })

  test('目標セット数に足りていなければ据え置く', () => {
    // Arrange: 12回は達成しているが2セットしかない
    const previousSets = [set({ order: 1, reps: 12 }), set({ order: 2, reps: 12 })]

    // Act & Assert
    expect(suggest(previousSets).action).toBe('hold')
  })

  test('据え置きのときは前回の1セット目の回数を目安にする', () => {
    // Arrange
    const previousSets = [
      set({ order: 1, reps: 10 }),
      set({ order: 2, reps: 9 }),
      set({ order: 3, reps: 8 }),
    ]

    // Act & Assert
    expect(suggest(previousSets).repsHint).toBe(10)
  })

  test('ウォームアップは判定に含めない', () => {
    // Arrange: 軽いウォームアップで12回やっていても達成扱いにしない
    const previousSets = [
      set({ order: 1, weightKg: 5.5, reps: 15, isWarmup: true }),
      set({ order: 2, reps: 12 }),
      set({ order: 3, reps: 12 }),
    ]

    // Act
    const suggestion = suggest(previousSets)

    // Assert: 本セットが2つしかないため据え置き。重量もウォームアップに引きずられない
    expect(suggestion.action).toBe('hold')
    expect(suggestion.weightKg).toBe(11.5)
  })

  test('セットごとに重量が違う場合は最も重いセットを基準にする', () => {
    // Arrange: 最後だけ重量を落としたケース
    const previousSets = [
      set({ order: 1, weightKg: 13.5, reps: 12 }),
      set({ order: 2, weightKg: 13.5, reps: 12 }),
      set({ order: 3, weightKg: 11.5, reps: 12 }),
    ]

    // Act
    const suggestion = suggest(previousSets)

    // Assert: 13.5kg のセットは2つしかないため据え置き
    expect(suggestion.action).toBe('hold')
    expect(suggestion.weightKg).toBe(13.5)
  })

  test('最大段階に達していれば達成していても上げない', () => {
    // Arrange
    const previousSets = [
      set({ order: 1, weightKg: 24, reps: 12 }),
      set({ order: 2, weightKg: 24, reps: 12 }),
      set({ order: 3, weightKg: 24, reps: 12 }),
    ]

    // Act
    const suggestion = suggest(previousSets)

    // Assert
    expect(suggestion.action).toBe('hold')
    expect(suggestion.weightKg).toBe(24)
    expect(suggestion.isAtHeaviestStep).toBe(true)
    expect(suggestion.hasReachedTarget).toBe(true)
  })

  test('自重種目は重量を上げず、達成の有無だけを伝える', () => {
    // Arrange
    const previousSets = [
      set({ order: 1, weightKg: 0, reps: 12 }),
      set({ order: 2, weightKg: 0, reps: 12 }),
      set({ order: 3, weightKg: 0, reps: 12 }),
    ]

    // Act
    const suggestion = suggest(previousSets, { isBodyweight: true })

    // Assert
    expect(suggestion.action).toBe('hold')
    expect(suggestion.weightKg).toBe(0)
    expect(suggestion.hasReachedTarget).toBe(true)
  })

  test('自重種目は記録が無くても重量0から始める', () => {
    expect(suggest([], { isBodyweight: true }).weightKg).toBe(0)
  })
})

describe('normalizeProgressionTarget', () => {
  test('妥当な目標はそのまま返す', () => {
    expect(normalizeProgressionTarget({ repsMin: 6, repsMax: 10, sets: 4 })).toEqual({
      repsMin: 6,
      repsMax: 10,
      sets: 4,
    })
  })

  test('下限が上限を超えていたら上限に合わせる', () => {
    expect(normalizeProgressionTarget({ repsMin: 15, repsMax: 10, sets: 3 })).toEqual({
      repsMin: 10,
      repsMax: 10,
      sets: 3,
    })
  })

  test('1未満の値は1に切り上げる', () => {
    expect(normalizeProgressionTarget({ repsMin: 0, repsMax: 0, sets: 0 })).toEqual({
      repsMin: 1,
      repsMax: 1,
      sets: 1,
    })
  })

  test('小数は整数に丸める', () => {
    expect(normalizeProgressionTarget({ repsMin: 8.4, repsMax: 12.6, sets: 3.2 })).toEqual({
      repsMin: 8,
      repsMax: 13,
      sets: 3,
    })
  })
})

describe('DEFAULT_PROGRESSION_TARGET', () => {
  test('筋肥大でよく使われる 8〜12回 × 3セット を既定にする', () => {
    expect(DEFAULT_PROGRESSION_TARGET).toEqual({ repsMin: 8, repsMax: 12, sets: 3 })
  })
})
