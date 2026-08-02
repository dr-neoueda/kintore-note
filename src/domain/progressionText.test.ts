import { describe, test, expect } from 'vitest'
import { describeProgression } from './progressionText'
import type { ProgressionSuggestion } from './progression'
import type { ProgressionTarget } from './types'

const STEPS = [2.5, 3.5, 4.5, 5.5, 6.5, 8.0, 9.0, 10.0, 11.5, 13.5, 16.0, 18.0, 20.5, 22.5, 24.0]
const TARGET: ProgressionTarget = { repsMin: 8, repsMax: 12, sets: 3 }

const suggestion = (overrides: Partial<ProgressionSuggestion> = {}): ProgressionSuggestion => ({
  action: 'hold',
  weightKg: 11.5,
  repsHint: 10,
  previousWeightKg: 11.5,
  hasReachedTarget: false,
  isAtHeaviestStep: false,
  ...overrides,
})

const describe_ = (
  overrides: Partial<ProgressionSuggestion> = {},
  isBodyweight = false,
) =>
  describeProgression({
    suggestion: suggestion(overrides),
    target: TARGET,
    dumbbellStepsKg: STEPS,
    isBodyweight,
  })

describe('describeProgression', () => {
  test('初回は始める重量を示す', () => {
    // Act
    const message = describe_({ action: 'start', weightKg: 2.5, previousWeightKg: null })

    // Assert
    expect(message.headline).toBe('2.5kg から始めましょう')
    expect(message.detail).toBeNull()
  })

  test('据え置きのときは、次に上げる条件を添える', () => {
    // Act
    const message = describe_()

    // Assert
    expect(message.headline).toBe('今回も 11.5kg')
    expect(message.detail).toBe('全3セットで12回できたら次は 13.5kg')
  })

  test('増量のときは上げる重量と達成の事実を示す', () => {
    // Act
    const message = describe_({
      action: 'increase',
      weightKg: 13.5,
      previousWeightKg: 11.5,
      hasReachedTarget: true,
    })

    // Assert
    expect(message.headline).toBe('13.5kg に上げる')
    expect(message.detail).toBe('前回 全3セットで12回を達成')
  })

  test('最大段階に達していればその旨を伝える', () => {
    // Act
    const message = describe_({
      weightKg: 24,
      previousWeightKg: 24,
      hasReachedTarget: true,
      isAtHeaviestStep: true,
    })

    // Assert
    expect(message.headline).toBe('24kg（最大）')
    expect(message.detail).toBe('これ以上重くできないため、回数を伸ばしましょう')
  })

  test('自重種目の初回は回数で示す', () => {
    // Act
    const message = describe_({ action: 'start', weightKg: 0, previousWeightKg: null }, true)

    // Assert
    expect(message.headline).toBe('8回から始めましょう')
  })

  test('自重種目で目標達成していれば回数を伸ばすよう促す', () => {
    // Act
    const message = describe_({ weightKg: 0, previousWeightKg: 0, hasReachedTarget: true }, true)

    // Assert
    expect(message.headline).toBe('目標達成')
    expect(message.detail).toBe('回数をさらに伸ばしましょう')
  })

  test('自重種目の据え置きは回数の目標を示す', () => {
    // Act
    const message = describe_({ weightKg: 0, previousWeightKg: 0 }, true)

    // Assert
    expect(message.headline).toBe('回数を伸ばす')
    expect(message.detail).toBe('全3セットで12回を目指す')
  })
})
