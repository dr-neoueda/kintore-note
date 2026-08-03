import { describe, test, expect } from 'vitest'
import {
  DEFAULT_DUMBBELL_STEPS_KG,
  formatWeightKg,
  stepWeight,
} from './weight'

const STEPS = DEFAULT_DUMBBELL_STEPS_KG

describe('DEFAULT_DUMBBELL_STEPS_KG', () => {
  test('所有している可変式ダンベルの15段階を昇順で保持する', () => {
    // Arrange & Act & Assert
    expect(STEPS).toEqual([
      2.5, 3.5, 4.5, 5.5, 6.5, 8.0, 9.0, 10.0, 11.5, 13.5, 16.0, 18.0, 20.5, 22.5, 24.0,
    ])
  })
})

describe('stepWeight', () => {
  test('段階と一致する重量から up で次の段階に上がる', () => {
    expect(stepWeight(6.5, 'up', STEPS)).toBe(8.0)
  })

  test('段階と一致する重量から down で前の段階に下がる', () => {
    expect(stepWeight(6.5, 'down', STEPS)).toBe(5.5)
  })

  test('最大段階で up しても最大段階のまま', () => {
    expect(stepWeight(24.0, 'up', STEPS)).toBe(24.0)
  })

  test('最小段階で down しても最小段階のまま', () => {
    expect(stepWeight(2.5, 'down', STEPS)).toBe(2.5)
  })

  test('段階の間の重量から up すると直近の上の段階になる', () => {
    expect(stepWeight(7.0, 'up', STEPS)).toBe(8.0)
  })

  test('段階の間の重量から down すると直近の下の段階になる', () => {
    expect(stepWeight(7.0, 'down', STEPS)).toBe(6.5)
  })

  test('最小段階より軽い重量から up すると最小段階になる', () => {
    expect(stepWeight(1.0, 'up', STEPS)).toBe(2.5)
  })

  test('最大段階より重い重量から down すると最大段階になる', () => {
    expect(stepWeight(30.0, 'down', STEPS)).toBe(24.0)
  })

  test('段階リストが空なら入力値をそのまま返す', () => {
    expect(stepWeight(7.3, 'up', [])).toBe(7.3)
  })

  test('元の配列を書き換えない', () => {
    // Arrange
    const steps = [10, 2.5, 9]
    const before = [...steps]

    // Act
    stepWeight(5, 'up', steps)

    // Assert
    expect(steps).toEqual(before)
  })
})

describe('formatWeightKg', () => {
  test('整数の重量は小数点を付けずに表示する', () => {
    expect(formatWeightKg(24)).toBe('24')
  })

  test('小数の重量は小数第1位まで表示する', () => {
    expect(formatWeightKg(11.5)).toBe('11.5')
  })

  test('0 は 0 と表示する', () => {
    expect(formatWeightKg(0)).toBe('0')
  })
})
