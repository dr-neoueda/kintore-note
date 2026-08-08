import { describe, test, expect } from 'vitest'
import type { MealEntry } from '@/domain/types'
import { averageNutrition, summarizeMealDays, takeRecentDays } from './mealDays'

const entry = (date: string, kcal: number, protein = 0): MealEntry => ({
  date,
  mealType: 'breakfast',
  foodId: '1',
  foodName: '食品',
  grams: 100,
  nutrition: { kcal, protein, fat: 0, carb: 0, fiber: 0, salt: 0 },
  order: 1,
  recordedAt: `${date}T10:00:00.000Z`,
})

describe('summarizeMealDays', () => {
  test('日ごとに合計する', () => {
    // Arrange
    const entries = [entry('2026-08-08', 300), entry('2026-08-08', 200), entry('2026-08-07', 500)]

    // Act
    const days = summarizeMealDays(entries)

    // Assert
    expect(days).toHaveLength(2)
    expect(days[0]?.nutrition.kcal).toBe(500)
    expect(days[0]?.itemCount).toBe(2)
  })

  test('新しい日から順に並べる', () => {
    // Arrange
    const entries = [entry('2026-08-06', 100), entry('2026-08-08', 100), entry('2026-08-07', 100)]

    // Act & Assert
    expect(summarizeMealDays(entries).map((day) => day.date)).toEqual([
      '2026-08-08',
      '2026-08-07',
      '2026-08-06',
    ])
  })

  test('記録が無ければ空', () => {
    expect(summarizeMealDays([])).toEqual([])
  })
})

describe('takeRecentDays', () => {
  test('直近だけを古い順で返す', () => {
    // Arrange: グラフは左から右へ時間が進む
    const days = summarizeMealDays([
      entry('2026-08-06', 100),
      entry('2026-08-07', 100),
      entry('2026-08-08', 100),
    ])

    // Act & Assert
    expect(takeRecentDays(days, 2).map((day) => day.date)).toEqual(['2026-08-07', '2026-08-08'])
  })
})

describe('averageNutrition', () => {
  test('記録がある日だけで割る', () => {
    // Arrange: 記録の無い日を0として混ぜると、実態より低く見える
    const days = summarizeMealDays([entry('2026-08-08', 2000, 100), entry('2026-08-06', 1000, 50)])

    // Act
    const average = averageNutrition(days)

    // Assert
    expect(average.kcal).toBe(1500)
    expect(average.protein).toBe(75)
  })

  test('記録が無ければ0', () => {
    expect(averageNutrition([]).kcal).toBe(0)
  })
})
