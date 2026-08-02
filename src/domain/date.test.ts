import { describe, test, expect } from 'vitest'
import {
  formatDateLabel,
  formatDateLabelWithYear,
  formatShortDateLabel,
  isValidDateKey,
  toDateKey,
} from './date'

describe('toDateKey', () => {
  test('Date をローカル日付の YYYY-MM-DD に変換する', () => {
    // Arrange: ローカルタイムでの 2026-08-02
    const date = new Date(2026, 7, 2, 23, 30)

    // Act & Assert: UTC に寄せて前日にならないこと
    expect(toDateKey(date)).toBe('2026-08-02')
  })

  test('月日は2桁でゼロ埋めする', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('isValidDateKey', () => {
  test('YYYY-MM-DD 形式なら true を返す', () => {
    expect(isValidDateKey('2026-08-02')).toBe(true)
  })

  test('形式が違えば false を返す', () => {
    expect(isValidDateKey('2026/08/02')).toBe(false)
    expect(isValidDateKey('20260802')).toBe(false)
    expect(isValidDateKey('')).toBe(false)
  })

  test('存在しない日付なら false を返す', () => {
    expect(isValidDateKey('2026-13-01')).toBe(false)
  })
})

describe('formatDateLabel', () => {
  test('日本語の月日と曜日で表示する', () => {
    expect(formatDateLabel('2026-08-02')).toBe('8月2日(日)')
  })

  test('不正な日付キーはそのまま返す', () => {
    expect(formatDateLabel('bad')).toBe('bad')
  })
})

describe('formatDateLabelWithYear', () => {
  test('年を含めて表示する', () => {
    expect(formatDateLabelWithYear('2026-08-02')).toBe('2026年8月2日(日)')
  })
})

describe('formatShortDateLabel', () => {
  test('月日だけの短い表記にする', () => {
    expect(formatShortDateLabel('2026-08-02')).toBe('8/2')
  })

  test('ゼロ埋めしない', () => {
    expect(formatShortDateLabel('2026-01-05')).toBe('1/5')
  })

  test('不正な日付キーはそのまま返す', () => {
    expect(formatShortDateLabel('bad')).toBe('bad')
  })
})
