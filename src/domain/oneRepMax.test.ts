import { describe, test, expect } from 'vitest'
import { estimateOneRepMax } from './oneRepMax'

describe('estimateOneRepMax', () => {
  test('1回挙上ならその重量がそのまま推定1RMになる', () => {
    expect(estimateOneRepMax(24, 1)).toBe(24)
  })

  test('Epley式で複数回から推定する', () => {
    // Arrange: Epley = w * (1 + reps/30) → 20 * (1 + 10/30) = 26.666...
    // Act & Assert
    expect(estimateOneRepMax(20, 10)).toBe(26.7)
  })

  test('小数の重量でも推定できる', () => {
    // 11.5 * (1 + 8/30) = 14.566...
    expect(estimateOneRepMax(11.5, 8)).toBe(14.6)
  })

  test('回数が0以下なら null を返す', () => {
    expect(estimateOneRepMax(20, 0)).toBeNull()
    expect(estimateOneRepMax(20, -1)).toBeNull()
  })

  test('重量が0以下なら null を返す', () => {
    expect(estimateOneRepMax(0, 10)).toBeNull()
    expect(estimateOneRepMax(-5, 10)).toBeNull()
  })

  test('回数が多すぎる場合は推定精度が落ちるため null を返す', () => {
    // Epley 式は概ね12回程度までが目安とされるため、上限を設ける
    expect(estimateOneRepMax(10, 31)).toBeNull()
  })
})
