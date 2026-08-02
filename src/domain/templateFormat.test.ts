import { describe, test, expect } from 'vitest'
import { formatTemplateTarget } from './templateFormat'

describe('formatTemplateTarget', () => {
  test('目標重量があれば 重量 × 回数 × セット数 の順で表示する', () => {
    // Arrange
    const item = { targetSets: 3, targetReps: 10, targetWeightKg: 11.5 }

    // Act & Assert
    expect(formatTemplateTarget(item)).toBe('11.5kg × 10回 × 3セット')
  })

  test('目標重量が未指定なら回数とセット数だけを表示する', () => {
    const item = { targetSets: 4, targetReps: 8, targetWeightKg: null }

    expect(formatTemplateTarget(item)).toBe('8回 × 4セット')
  })

  test('整数の重量は小数点を付けずに表示する', () => {
    const item = { targetSets: 3, targetReps: 6, targetWeightKg: 24 }

    expect(formatTemplateTarget(item)).toBe('24kg × 6回 × 3セット')
  })

  test('重量0は未指定と同じ扱いにする', () => {
    // Arrange: 自重種目では重量を持たない
    const item = { targetSets: 3, targetReps: 20, targetWeightKg: 0 }

    // Act & Assert
    expect(formatTemplateTarget(item)).toBe('20回 × 3セット')
  })
})
