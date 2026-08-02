import { describe, test, expect } from 'vitest'
import { formatSetSummary } from './setFormat'

describe('formatSetSummary', () => {
  test('セットが無ければ空文字を返す', () => {
    expect(formatSetSummary([])).toBe('')
  })

  test('重量がすべて同じなら重量をまとめて回数を並べる', () => {
    // Arrange
    const sets = [
      { weightKg: 11.5, reps: 10 },
      { weightKg: 11.5, reps: 10 },
      { weightKg: 11.5, reps: 8 },
    ]

    // Act & Assert
    expect(formatSetSummary(sets)).toBe('11.5kg × 10, 10, 8')
  })

  test('重量が異なるならセットごとに表示する', () => {
    const sets = [
      { weightKg: 10, reps: 10 },
      { weightKg: 11.5, reps: 8 },
    ]

    expect(formatSetSummary(sets)).toBe('10kg×10 / 11.5kg×8')
  })

  test('1セットだけなら重量と回数を表示する', () => {
    expect(formatSetSummary([{ weightKg: 24, reps: 6 }])).toBe('24kg × 6')
  })

  test('自重（重量0）は回数だけを表示する', () => {
    const sets = [
      { weightKg: 0, reps: 20 },
      { weightKg: 0, reps: 15 },
    ]

    expect(formatSetSummary(sets)).toBe('20, 15 回')
  })
})
