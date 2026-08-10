import { describe, test, expect } from 'vitest'
import { calcBmi, calcFatMassKg, calcLeanBodyMassKg } from './bodyComposition'

describe('calcLeanBodyMassKg', () => {
  test('体重と体脂肪率から除脂肪体重を出す', () => {
    // Arrange & Act: 70kg・体脂肪15% → 59.5kg
    expect(calcLeanBodyMassKg(70, 15)).toBe(59.5)
  })

  test('体脂肪率が無ければ出さない', () => {
    // Arrange & Act & Assert: 体重計しか無い日は推定しない
    expect(calcLeanBodyMassKg(70, null)).toBeNull()
  })

  test('あり得ない体脂肪率は弾く', () => {
    expect(calcLeanBodyMassKg(70, 100)).toBeNull()
    expect(calcLeanBodyMassKg(70, -1)).toBeNull()
  })
})

describe('calcFatMassKg', () => {
  test('体脂肪量を出す', () => {
    expect(calcFatMassKg(70, 15)).toBe(10.5)
  })

  test('体脂肪率が無ければ出さない', () => {
    expect(calcFatMassKg(70, null)).toBeNull()
  })
})

describe('calcBmi', () => {
  test('体重と身長から出す', () => {
    // Arrange & Act: 70 ÷ 1.70^2 = 24.22
    const bmi = calcBmi(70, 170)

    // Assert
    expect(bmi).toBe(24.2)
  })

  test('身長を入れていなければ出さない', () => {
    // Arrange & Act & Assert: 当て推量の数字は出さない
    expect(calcBmi(70, null)).toBeNull()
  })

  test('打ち間違えた身長では出さない', () => {
    // Arrange & Act & Assert: 1.7 や 1700 と入れても桁違いの値を出さない
    expect(calcBmi(70, 1.7)).toBeNull()
    expect(calcBmi(70, 1700)).toBeNull()
  })

  test('体重が空や0なら出さない', () => {
    expect(calcBmi(Number.NaN, 170)).toBeNull()
    expect(calcBmi(0, 170)).toBeNull()
  })
})
