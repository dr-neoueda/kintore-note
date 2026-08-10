import { describe, test, expect } from 'vitest'
import { COMMON_FOODS } from './commonFoods'
import { countToGrams, findCountUnit, gramsToCount } from './foodAmount'

describe('findCountUnit', () => {
  test('「1個」があれば個で数えられる', () => {
    // Arrange
    const portions = [
      { label: '1個', grams: 8 },
      { label: '大1個', grams: 12 },
    ]

    // Act
    const unit = findCountUnit(portions)

    // Assert
    expect(unit).toEqual({ label: '個', gramsPerUnit: 8 })
  })

  test('「1本」「1枚」なども数え方として読み取る', () => {
    expect(findCountUnit([{ label: '1本', grams: 20 }])?.label).toBe('本')
    expect(findCountUnit([{ label: '1枚', grams: 3 }])?.label).toBe('枚')
    expect(findCountUnit([{ label: '1パック', grams: 45 }])?.label).toBe('パック')
  })

  test('「1食分」は目安なので数え方にしない', () => {
    // Arrange & Act & Assert: 2倍3倍しても量が定まらない
    expect(findCountUnit([{ label: '1食分', grams: 100 }])).toBeNull()
    expect(findCountUnit([{ label: '1皿分', grams: 200 }])).toBeNull()
  })

  test('「茶碗1杯」のように数以外が付くものは数え方にしない', () => {
    expect(findCountUnit([{ label: '茶碗1杯', grams: 180 }])).toBeNull()
  })

  test('分量が無ければ数えられない', () => {
    expect(findCountUnit(undefined)).toBeNull()
    expect(findCountUnit([])).toBeNull()
  })

  test('先に出てくる数え方を採る', () => {
    // Arrange & Act: 「1切れ」と「1枚」が両方あっても迷わせない
    const unit = findCountUnit([
      { label: '1切れ', grams: 80 },
      { label: '1枚', grams: 20 },
    ])

    // Assert
    expect(unit).toEqual({ label: '切れ', gramsPerUnit: 80 })
  })
})

describe('countToGrams', () => {
  test('個数ぶんの重さにする', () => {
    expect(countToGrams(3, { label: '個', gramsPerUnit: 8 })).toBe(24)
  })

  test('半端な数も扱える', () => {
    expect(countToGrams(0.5, { label: '個', gramsPerUnit: 50 })).toBe(25)
  })

  test('割り切れなければ整数に丸める', () => {
    expect(countToGrams(3, { label: '個', gramsPerUnit: 8.5 })).toBe(26)
  })

  test('0以下や壊れた値は0にする', () => {
    const unit = { label: '個', gramsPerUnit: 8 }
    expect(countToGrams(0, unit)).toBe(0)
    expect(countToGrams(-1, unit)).toBe(0)
    expect(countToGrams(Number.NaN, unit)).toBe(0)
  })
})

describe('gramsToCount', () => {
  test('重さを個数に直す', () => {
    expect(gramsToCount(24, { label: '個', gramsPerUnit: 8 })).toBe(3)
  })

  test('割り切れなければ小数1桁まで', () => {
    expect(gramsToCount(20, { label: '個', gramsPerUnit: 8 })).toBe(2.5)
    expect(gramsToCount(10, { label: '個', gramsPerUnit: 3 })).toBe(3.3)
  })

  test('0以下や壊れた値は0にする', () => {
    const unit = { label: '個', gramsPerUnit: 8 }
    expect(gramsToCount(0, unit)).toBe(0)
    expect(gramsToCount(Number.NaN, unit)).toBe(0)
    expect(gramsToCount(24, { label: '個', gramsPerUnit: 0 })).toBe(0)
  })

  test('個数へ直して戻すと元の重さになる', () => {
    // Arrange
    const unit = { label: '個', gramsPerUnit: 50 }

    // Act & Assert
    expect(countToGrams(gramsToCount(150, unit), unit)).toBe(150)
  })
})

describe('よく使う食品の数え方', () => {
  test('梅干しは個で数えられる', () => {
    // Arrange
    const ume = COMMON_FOODS.find((food) => food.label.includes('梅干し'))

    // Act
    const unit = findCountUnit(ume?.portions)

    // Assert
    expect(unit?.label).toBe('個')
  })

  test('卵は個で数えられる', () => {
    const egg = COMMON_FOODS.find((food) => food.label === '卵（生）')

    expect(findCountUnit(egg?.portions)?.label).toBe('個')
  })

  test('ごはんは個数で数えない', () => {
    // Arrange & Act & Assert: 茶碗で量るものを「3個」とは数えない
    const rice = COMMON_FOODS.find((food) => food.label === 'ごはん（白米・炊いた）')

    expect(findCountUnit(rice?.portions)).toBeNull()
  })
})
