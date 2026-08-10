import { describe, test, expect } from 'vitest'
import { CHART_PERIODS, filterByPeriod, periodStartDate } from './chartPeriod'

const period = (days: number) => ({ key: 'test', label: 'テスト', days })

describe('periodStartDate', () => {
  test('今日を含めて数える', () => {
    // Arrange & Act & Assert: 14日なら 8/10 の13日前から
    expect(periodStartDate('2026-08-10', period(14))).toBe('2026-07-28')
  })

  test('1日なら今日だけ', () => {
    expect(periodStartDate('2026-08-10', period(1))).toBe('2026-08-10')
  })
})

describe('filterByPeriod', () => {
  test('期間の外を落とす', () => {
    // Arrange
    const items = [
      { date: '2026-07-01' },
      { date: '2026-08-01' },
      { date: '2026-08-10' },
    ]

    // Act: 直近14日（7/28〜8/10）
    const filtered = filterByPeriod(items, '2026-08-10', period(14))

    // Assert
    expect(filtered.map((item) => item.date)).toEqual(['2026-08-01', '2026-08-10'])
  })

  test('期間の初日は残す', () => {
    const items = [{ date: '2026-07-28' }, { date: '2026-07-27' }]

    expect(filterByPeriod(items, '2026-08-10', period(14))).toEqual([{ date: '2026-07-28' }])
  })

  test('空なら空', () => {
    expect(filterByPeriod([], '2026-08-10', period(14))).toEqual([])
  })
})

describe('CHART_PERIODS', () => {
  test('短い順に並んでいる', () => {
    // Arrange & Act
    const days = CHART_PERIODS.map((entry) => entry.days)

    // Assert
    expect(days).toEqual([...days].sort((a, b) => a - b))
  })

  test('選べる期間に重複が無い', () => {
    expect(new Set(CHART_PERIODS.map((entry) => entry.key)).size).toBe(CHART_PERIODS.length)
  })
})
