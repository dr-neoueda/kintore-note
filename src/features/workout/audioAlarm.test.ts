import { describe, test, expect } from 'vitest'
import { buildBeepOffsets } from './audioAlarm'

describe('buildBeepOffsets', () => {
  test('指定した長さに収まるまで鳴らす', () => {
    // Arrange & Act
    const offsets = buildBeepOffsets(3)

    // Assert: 最後の1回も長さの中に入っている
    expect(offsets.length).toBeGreaterThan(2)
    expect(Math.max(...offsets)).toBeLessThan(3)
  })

  test('長くするほど回数が増える', () => {
    expect(buildBeepOffsets(12).length).toBeGreaterThan(buildBeepOffsets(3).length)
  })

  test('先頭は必ず 0 秒から鳴らす', () => {
    // Arrange & Act & Assert: 目標に達した瞬間に鳴らないと合図にならない
    expect(buildBeepOffsets(6)[0]).toBe(0)
  })

  test('2回ごとに間が空く', () => {
    // Arrange & Act
    const offsets = buildBeepOffsets(6)

    // Assert: 2回目と3回目の間隔が、1回目と2回目より広い
    const firstGap = (offsets[1] ?? 0) - (offsets[0] ?? 0)
    const groupGap = (offsets[2] ?? 0) - (offsets[1] ?? 0)
    expect(groupGap).toBeGreaterThan(firstGap)
  })

  test('短すぎる長さでも1回は鳴らす', () => {
    // Arrange & Act & Assert: 無音では合図にならない
    expect(buildBeepOffsets(0.05)).toEqual([0])
  })

  test('0以下なら鳴らさない', () => {
    expect(buildBeepOffsets(0)).toEqual([])
    expect(buildBeepOffsets(-1)).toEqual([])
  })
})
