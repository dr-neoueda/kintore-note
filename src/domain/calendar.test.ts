import { describe, test, expect } from 'vitest'
import { addMonths, buildMonthGrid, formatMonthLabel, isValidMonthKey, toMonthKey } from './calendar'

describe('toMonthKey', () => {
  test('日付から月を取り出す', () => {
    expect(toMonthKey('2026-08-09')).toBe('2026-08')
  })
})

describe('addMonths', () => {
  test('前後に動かせる', () => {
    expect(addMonths('2026-08', 1)).toBe('2026-09')
    expect(addMonths('2026-08', -1)).toBe('2026-07')
  })

  test('年をまたぐ', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
})

describe('formatMonthLabel', () => {
  test('日本語の表記にする', () => {
    expect(formatMonthLabel('2026-08')).toBe('2026年8月')
  })
})

describe('isValidMonthKey', () => {
  test('形式を判定する', () => {
    expect(isValidMonthKey('2026-08')).toBe(true)
    expect(isValidMonthKey('2026-8')).toBe(false)
    expect(isValidMonthKey('')).toBe(false)
  })
})

describe('buildMonthGrid', () => {
  test('週ごとに7枠で返す', () => {
    // Arrange & Act
    const weeks = buildMonthGrid('2026-08')

    // Assert
    for (const week of weeks) {
      expect(week).toHaveLength(7)
    }
  })

  test('月曜はじまりで、先頭に前月ぶんの空きを置く', () => {
    // Arrange: 2026年8月1日は土曜日。月曜はじまりなら5枠空く
    const weeks = buildMonthGrid('2026-08')

    // Act
    const firstWeek = weeks[0] ?? []

    // Assert
    expect(firstWeek.slice(0, 5).every((cell) => cell === null)).toBe(true)
    expect(firstWeek[5]).toBe('2026-08-01')
  })

  test('その月の日をすべて含む', () => {
    // Arrange & Act
    const days = buildMonthGrid('2026-08').flat().filter((cell) => cell !== null)

    // Assert: 8月は31日
    expect(days).toHaveLength(31)
    expect(days[0]).toBe('2026-08-01')
    expect(days[days.length - 1]).toBe('2026-08-31')
  })

  test('うるう年の2月は29日ある', () => {
    const days = buildMonthGrid('2028-02').flat().filter((cell) => cell !== null)

    expect(days).toHaveLength(29)
  })

  test('月曜はじまりの月は空きが出ない', () => {
    // Arrange: 2026年6月1日は月曜日
    const firstWeek = buildMonthGrid('2026-06')[0] ?? []

    // Assert
    expect(firstWeek[0]).toBe('2026-06-01')
  })

  test('末尾も7枠になるまで空きで埋める', () => {
    const weeks = buildMonthGrid('2026-08')
    const lastWeek = weeks[weeks.length - 1] ?? []

    expect(lastWeek).toHaveLength(7)
  })
})
