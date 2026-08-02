import { describe, test, expect } from 'vitest'
import { calcSetVolume, calcTotalVolume, type VolumeSetInput } from './volume'

const workingSet = (overrides: Partial<VolumeSetInput> = {}): VolumeSetInput => ({
  weightKg: 10,
  reps: 10,
  isWarmup: false,
  dumbbellCount: 2,
  ...overrides,
})

describe('calcSetVolume', () => {
  test('両手に1個ずつ持つ種目は 重量×回数×2 になる', () => {
    // Arrange
    const set = workingSet({ weightKg: 11.5, reps: 8, dumbbellCount: 2 })

    // Act
    const volume = calcSetVolume(set)

    // Assert
    expect(volume).toBe(184) // 11.5 * 8 * 2
  })

  test('片手ずつ行う種目は 重量×回数 になる', () => {
    const set = workingSet({ weightKg: 20.5, reps: 6, dumbbellCount: 1 })

    expect(calcSetVolume(set)).toBe(123) // 20.5 * 6
  })

  test('自重種目のように重量が0ならボリュームも0になる', () => {
    expect(calcSetVolume(workingSet({ weightKg: 0, reps: 15 }))).toBe(0)
  })

  test('回数が0ならボリュームも0になる', () => {
    expect(calcSetVolume(workingSet({ reps: 0 }))).toBe(0)
  })

  test('負の入力は0として扱う', () => {
    expect(calcSetVolume(workingSet({ weightKg: -5, reps: 10 }))).toBe(0)
    expect(calcSetVolume(workingSet({ reps: -3 }))).toBe(0)
  })

  test('小数第1位に丸める', () => {
    // Arrange: 2.3 * 3 * 2 = 13.799999... になりうる
    const set = workingSet({ weightKg: 2.3, reps: 3, dumbbellCount: 2 })

    // Act & Assert
    expect(calcSetVolume(set)).toBe(13.8)
  })
})

describe('calcTotalVolume', () => {
  test('複数セットのボリュームを合計する', () => {
    // Arrange
    const sets = [
      workingSet({ weightKg: 10, reps: 10, dumbbellCount: 2 }), // 200
      workingSet({ weightKg: 11.5, reps: 8, dumbbellCount: 2 }), // 184
    ]

    // Act & Assert
    expect(calcTotalVolume(sets)).toBe(384)
  })

  test('ウォームアップセットは既定では合計に含めない', () => {
    const sets = [
      workingSet({ weightKg: 5.5, reps: 15, isWarmup: true }),
      workingSet({ weightKg: 10, reps: 10 }),
    ]

    expect(calcTotalVolume(sets)).toBe(200)
  })

  test('includeWarmup を指定するとウォームアップも合計に含める', () => {
    const sets = [
      workingSet({ weightKg: 5.5, reps: 10, isWarmup: true }), // 110
      workingSet({ weightKg: 10, reps: 10 }), // 200
    ]

    expect(calcTotalVolume(sets, { includeWarmup: true })).toBe(310)
  })

  test('セットが空なら0を返す', () => {
    expect(calcTotalVolume([])).toBe(0)
  })

  test('ウォームアップしかなければ0を返す', () => {
    expect(calcTotalVolume([workingSet({ isWarmup: true })])).toBe(0)
  })
})
