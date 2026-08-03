import { describe, test, expect } from 'vitest'
import {
  formatDateLabel,
  formatDateLabelWithYear,
  formatShortDateLabel,
  buildRecordedAt,
  getWeekRange,
  isValidDateKey,
  isWithinRange,
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

describe('buildRecordedAt', () => {
  test('今日の記録なら現在時刻をそのまま使う', () => {
    // Arrange
    const now = new Date(2026, 7, 3, 19, 30)

    // Act
    const recordedAt = buildRecordedAt('2026-08-03', now)

    // Assert
    expect(recordedAt).toBe(now.toISOString())
  })

  test('過去の日付なら、その日の正午の時刻にする', () => {
    // Arrange: 後から入力しても「前回の記録」の順序が壊れないようにする
    const now = new Date(2026, 7, 3, 19, 30)

    // Act
    const recordedAt = buildRecordedAt('2026-07-28', now)

    // Assert
    expect(recordedAt).toBe(new Date(2026, 6, 28, 12, 0, 0, 0).toISOString())
  })

  test('過去の日付の記録時刻は、その日より後の記録より前になる', () => {
    // Arrange
    const now = new Date(2026, 7, 3, 19, 30)

    // Act
    const past = buildRecordedAt('2026-07-28', now)
    const today = buildRecordedAt('2026-08-03', now)

    // Assert
    expect(past < today).toBe(true)
  })

  test('不正な日付キーなら現在時刻を使う', () => {
    const now = new Date(2026, 7, 3, 19, 30)

    expect(buildRecordedAt('こわれた', now)).toBe(now.toISOString())
  })
})

describe('getWeekRange', () => {
  test('月曜始まりの週範囲を返す', () => {
    // Arrange: 2026-08-03 は月曜
    // Act
    const range = getWeekRange('2026-08-03')

    // Assert
    expect(range).toEqual({ fromDate: '2026-08-03', toDate: '2026-08-09' })
  })

  test('日曜はその前の月曜から始まる週に属する', () => {
    expect(getWeekRange('2026-08-02')).toEqual({
      fromDate: '2026-07-27',
      toDate: '2026-08-02',
    })
  })

  test('weeksAgo に 1 を渡すと先週になる', () => {
    expect(getWeekRange('2026-08-03', 1)).toEqual({
      fromDate: '2026-07-27',
      toDate: '2026-08-02',
    })
  })
})

describe('isWithinRange', () => {
  const range = { fromDate: '2026-08-03', toDate: '2026-08-09' }

  test('両端を含む', () => {
    expect(isWithinRange('2026-08-03', range)).toBe(true)
    expect(isWithinRange('2026-08-09', range)).toBe(true)
  })

  test('範囲外は false', () => {
    expect(isWithinRange('2026-08-02', range)).toBe(false)
    expect(isWithinRange('2026-08-10', range)).toBe(false)
  })
})
