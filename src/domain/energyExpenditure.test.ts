import { describe, test, expect } from 'vitest'
import {
  STRENGTH_METS,
  calcActiveEnergyKcal,
  calcCardioEnergyKcal,
  calcStrengthEnergyKcal,
  estimateWorkoutDurationSec,
} from './energyExpenditure'

describe('calcActiveEnergyKcal', () => {
  test('1.05 × METs × 時間 × 体重 で出す', () => {
    // Arrange & Act: 6 METs を 1時間、体重70kg
    // 1.05 × 6 × 1 × 70 = 441
    expect(calcActiveEnergyKcal(6, 70, 3600)).toBe(441)
  })

  test('体重が分からなければ0', () => {
    // Arrange & Act & Assert: 体組成の記録が無い日は出さない
    expect(calcActiveEnergyKcal(6, 0, 3600)).toBe(0)
  })

  test('時間が0なら0', () => {
    expect(calcActiveEnergyKcal(6, 70, 0)).toBe(0)
  })
})

describe('estimateWorkoutDurationSec', () => {
  test('最初と最後の間隔に、平均間隔を1つ足す', () => {
    // Arrange: 10分間隔で3セット（span 20分、平均間隔10分）
    const times = [
      '2026-08-08T10:00:00.000Z',
      '2026-08-08T10:10:00.000Z',
      '2026-08-08T10:20:00.000Z',
    ]

    // Act & Assert: 最後の1セットぶんを補って30分
    expect(estimateWorkoutDurationSec(times)).toBe(30 * 60)
  })

  test('セットが1つなら既定の時間を当てる', () => {
    expect(estimateWorkoutDurationSec(['2026-08-08T10:00:00.000Z'])).toBe(180)
  })

  test('記録が無ければ0', () => {
    expect(estimateWorkoutDurationSec([])).toBe(0)
  })

  test('同じ時刻に固まっていてもセット数ぶんは数える', () => {
    // Arrange: 過去の日をまとめて入力すると時刻が揃うことがある
    const times = ['2026-08-08T12:00:00.000Z', '2026-08-08T12:00:00.000Z']

    // Act & Assert
    expect(estimateWorkoutDurationSec(times)).toBe(360)
  })

  test('順不同で渡しても同じ結果になる', () => {
    const ordered = ['2026-08-08T10:00:00.000Z', '2026-08-08T10:20:00.000Z']
    const reversed = [...ordered].reverse()

    expect(estimateWorkoutDurationSec(reversed)).toBe(estimateWorkoutDurationSec(ordered))
  })
})

describe('calcCardioEnergyKcal', () => {
  test('速度から強度を決めて計算する', () => {
    // Arrange & Act: 10km を50分（12km/h）、体重70kg
    const kcal = calcCardioEnergyKcal('running', 10, 50 * 60, 70)

    // Assert: 11 METs 前後 × 0.833h × 70kg × 1.05 ≒ 670
    expect(kcal).toBeGreaterThan(600)
    expect(kcal).toBeLessThan(750)
  })

  test('同じ距離なら、ペースが違っても消費はおおむね同じになる', () => {
    // Arrange: 走行の消費は距離でほぼ決まる（およそ 1kcal/kg/km）。
    // 速くすると強度は上がるが時間が短くなり、打ち消し合う
    const fast = calcCardioEnergyKcal('running', 10, 45 * 60, 70)
    const slow = calcCardioEnergyKcal('running', 10, 70 * 60, 70)

    // Assert: 10km × 70kg ≒ 700kcal の周辺に収まる
    for (const kcal of [fast, slow]) {
      expect(kcal).toBeGreaterThan(600)
      expect(kcal).toBeLessThan(800)
    }
  })

  test('距離が伸びれば消費も増える', () => {
    const short = calcCardioEnergyKcal('running', 5, 25 * 60, 70)
    const long = calcCardioEnergyKcal('running', 10, 50 * 60, 70)

    expect(long).toBeGreaterThan(short)
  })

  test('距離が0なら0', () => {
    expect(calcCardioEnergyKcal('running', 0, 1800, 70)).toBe(0)
  })
})

describe('calcStrengthEnergyKcal', () => {
  test('休憩を含む強度で計算する', () => {
    // Arrange & Act: 1時間、体重70kg
    // 1.05 × 3.5 × 1 × 70 ≒ 257
    expect(calcStrengthEnergyKcal(3600, 70)).toBe(Math.round(1.05 * STRENGTH_METS * 70))
  })

  test('体重が分からなければ0', () => {
    expect(calcStrengthEnergyKcal(3600, 0)).toBe(0)
  })
})
