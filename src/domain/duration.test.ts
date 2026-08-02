import { describe, test, expect } from 'vitest'
import { elapsedSeconds, formatDuration } from './duration'

describe('formatDuration', () => {
  test('0秒は 0:00 と表示する', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  test('1分未満は 0:SS と表示する', () => {
    expect(formatDuration(45)).toBe('0:45')
  })

  test('1分以上は M:SS と表示する', () => {
    expect(formatDuration(62)).toBe('1:02')
  })

  test('1時間以上は H:MM:SS と表示する', () => {
    expect(formatDuration(3723)).toBe('1:02:03')
  })

  test('負の値は 0:00 と表示する', () => {
    expect(formatDuration(-10)).toBe('0:00')
  })

  test('小数は切り捨てて表示する', () => {
    expect(formatDuration(59.9)).toBe('0:59')
  })
})

describe('elapsedSeconds', () => {
  test('開始時刻から現在時刻までの経過秒数を返す', () => {
    // Arrange
    const startedAt = '2026-08-02T10:00:00.000Z'
    const now = Date.parse('2026-08-02T10:01:30.000Z')

    // Act & Assert
    expect(elapsedSeconds(startedAt, now)).toBe(90)
  })

  test('現在時刻が開始時刻より前でも負にはならない', () => {
    const startedAt = '2026-08-02T10:00:00.000Z'
    const now = Date.parse('2026-08-02T09:59:00.000Z')

    expect(elapsedSeconds(startedAt, now)).toBe(0)
  })

  test('不正な日時文字列なら0を返す', () => {
    expect(elapsedSeconds('not-a-date', Date.parse('2026-08-02T10:00:00.000Z'))).toBe(0)
  })
})
