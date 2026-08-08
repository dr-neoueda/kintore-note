import { describe, test, expect } from 'vitest'
import {
  EMPTY_NUTRITION,
  type Nutrition,
  scaleNutrition,
  sumNutrition,
  calcEnergyShare,
} from './nutrition'

/** 鶏むね肉（皮なし・生）100g 相当。 */
const chicken: Nutrition = {
  kcal: 105,
  protein: 23.3,
  fat: 1.9,
  carb: 0.1,
  fiber: 0,
  salt: 0.1,
}

describe('scaleNutrition', () => {
  test('100g 基準の値を、食べた量に合わせる', () => {
    // Arrange & Act
    const scaled = scaleNutrition(chicken, 200, 100)

    // Assert
    expect(scaled.kcal).toBe(210)
    expect(scaled.protein).toBe(46.6)
  })

  test('半端な量でも丸めて返す', () => {
    // Arrange & Act
    const scaled = scaleNutrition(chicken, 150, 100)

    // Assert: エネルギーは整数、成分は小数1桁
    expect(scaled.kcal).toBe(158)
    expect(scaled.protein).toBe(35)
    // 1.9 × 1.5 は二進小数で 2.8499… になるため 2.8。0.05g の差は表示上問題にしない
    expect(scaled.fat).toBe(2.8)
  })

  test('100g 以外を基準にできる', () => {
    // Arrange: プロテインのように「1食30gあたり」で書かれた栄養価
    const scoop: Nutrition = { kcal: 120, protein: 24, fat: 1.5, carb: 2, fiber: 0, salt: 0.1 }

    // Act
    const scaled = scaleNutrition(scoop, 60, 30)

    // Assert
    expect(scaled.kcal).toBe(240)
    expect(scaled.protein).toBe(48)
  })

  test('量が0なら全て0になる', () => {
    expect(scaleNutrition(chicken, 0, 100)).toEqual(EMPTY_NUTRITION)
  })

  test('基準が0でも落ちない', () => {
    // Arrange & Act & Assert: 壊れたデータで画面ごと落とさない
    expect(scaleNutrition(chicken, 100, 0)).toEqual(EMPTY_NUTRITION)
  })

  test('負の量は0として扱う', () => {
    expect(scaleNutrition(chicken, -50, 100)).toEqual(EMPTY_NUTRITION)
  })
})

describe('sumNutrition', () => {
  test('複数の食品を合計する', () => {
    // Arrange
    const rice: Nutrition = { kcal: 156, protein: 2.5, fat: 0.3, carb: 37.1, fiber: 1.5, salt: 0 }

    // Act
    const total = sumNutrition([chicken, rice])

    // Assert
    expect(total.kcal).toBe(261)
    expect(total.protein).toBe(25.8)
    expect(total.carb).toBe(37.2)
  })

  test('空なら全て0', () => {
    expect(sumNutrition([])).toEqual(EMPTY_NUTRITION)
  })

  test('小数の足し込みで誤差を残さない', () => {
    // Arrange: 0.1 の足し算は二進小数で 0.30000000000000004 になる
    const tenth: Nutrition = { ...EMPTY_NUTRITION, protein: 0.1 }

    // Act
    const total = sumNutrition([tenth, tenth, tenth])

    // Assert
    expect(total.protein).toBe(0.3)
  })
})

describe('calcEnergyShare', () => {
  test('PFC のエネルギー比率を百分率で返す', () => {
    // Arrange: たんぱく質4kcal/g、脂質9kcal/g、炭水化物4kcal/g
    const nutrition: Nutrition = {
      ...EMPTY_NUTRITION,
      protein: 25, // 100kcal
      fat: 100 / 9, // 100kcal
      carb: 50, // 200kcal
    }

    // Act
    const share = calcEnergyShare(nutrition)

    // Assert
    expect(share.protein).toBe(25)
    expect(share.fat).toBe(25)
    expect(share.carb).toBe(50)
  })

  test('何も食べていなければ全て0', () => {
    expect(calcEnergyShare(EMPTY_NUTRITION)).toEqual({ protein: 0, fat: 0, carb: 0 })
  })
})
