import { describe, test, expect } from 'vitest'
import type { DateKey } from '@/domain/date'
import { EMPTY_NUTRITION } from '@/domain/nutrition'
import type { DailyExpenditure } from './dailyExpenditure'
import {
  buildEnergyBalance,
  summarizeEnergyBalance,
  toFatMassKg,
} from './energyBalance'
import type { MealDaySummary } from './mealDays'

const day = (date: string, kcal: number): MealDaySummary => ({
  date,
  nutrition: { ...EMPTY_NUTRITION, kcal },
  itemCount: 1,
})

const expenditure = (
  date: string,
  totalKcal: number,
  hasBasal = true,
): [DateKey, DailyExpenditure] => [
  date,
  {
    date,
    strengthKcal: 0,
    cardioKcal: 0,
    basalKcal: hasBasal ? totalKcal : 0,
    totalKcal,
    hasBasal,
  },
]

describe('buildEnergyBalance', () => {
  test('摂取から消費を引いて積み上げる', () => {
    // Arrange: 2日とも 500kcal 足りない
    const points = buildEnergyBalance({
      days: [day('2026-08-01', 1500), day('2026-08-02', 1500)],
      expenditureByDate: new Map([expenditure('2026-08-01', 2000), expenditure('2026-08-02', 2000)]),
    })

    // Act & Assert
    expect(points[0]?.balanceKcal).toBe(-500)
    expect(points[0]?.cumulativeKcal).toBe(-500)
    expect(points[1]?.cumulativeKcal).toBe(-1000)
  })

  test('基礎代謝が分からない日は含めない', () => {
    // Arrange: 消費が運動ぶんだけだと、収支が大きくプラスに振れて積み上げを狂わせる
    const points = buildEnergyBalance({
      days: [day('2026-08-01', 1500), day('2026-08-02', 1500)],
      expenditureByDate: new Map([
        expenditure('2026-08-01', 2000),
        expenditure('2026-08-02', 200, false),
      ]),
    })

    // Assert
    expect(points).toHaveLength(1)
    expect(points[0]?.date).toBe('2026-08-01')
  })

  test('消費を出せない日は含めない', () => {
    const points = buildEnergyBalance({
      days: [day('2026-08-01', 1500)],
      expenditureByDate: new Map(),
    })

    expect(points).toEqual([])
  })

  test('食べ過ぎた日はプラスになる', () => {
    const points = buildEnergyBalance({
      days: [day('2026-08-01', 2500)],
      expenditureByDate: new Map([expenditure('2026-08-01', 2000)]),
    })

    expect(points[0]?.balanceKcal).toBe(500)
  })

  test('記録が無ければ空', () => {
    expect(buildEnergyBalance({ days: [], expenditureByDate: new Map() })).toEqual([])
  })
})

describe('toFatMassKg', () => {
  test('7200kcal を体脂肪1kg として換算する', () => {
    expect(toFatMassKg(-7200)).toBe(-1)
    expect(toFatMassKg(3600)).toBe(0.5)
  })

  test('0なら0', () => {
    expect(toFatMassKg(0)).toBe(0)
  })
})

describe('summarizeEnergyBalance', () => {
  test('平均と合計をまとめる', () => {
    // Arrange
    const points = buildEnergyBalance({
      days: [day('2026-08-01', 1500), day('2026-08-02', 1700)],
      expenditureByDate: new Map([
        expenditure('2026-08-01', 2000),
        expenditure('2026-08-02', 2000),
      ]),
    })

    // Act
    const summary = summarizeEnergyBalance(points)

    // Assert
    expect(summary?.dayCount).toBe(2)
    expect(summary?.averageIntakeKcal).toBe(1600)
    expect(summary?.averageExpenditureKcal).toBe(2000)
    expect(summary?.averageBalanceKcal).toBe(-400)
    expect(summary?.cumulativeKcal).toBe(-800)
  })

  test('合計を体脂肪の重さに直す', () => {
    // Arrange: 7200kcal 不足 = 体脂肪1kg分
    const points = buildEnergyBalance({
      days: [day('2026-08-01', 0)],
      expenditureByDate: new Map([expenditure('2026-08-01', 7200)]),
    })

    // Act & Assert
    expect(summarizeEnergyBalance(points)?.fatMassKg).toBe(-1)
  })

  test('出せる日が無ければ出さない', () => {
    // Arrange & Act & Assert: 当て推量の数字は出さない
    expect(summarizeEnergyBalance([])).toBeNull()
  })
})
