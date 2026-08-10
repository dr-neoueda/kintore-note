import { describe, test, expect } from 'vitest'
import type { BodyMeasurement } from '@/domain/types'
import { buildBodyTrend, calcMetricChange } from './bodyTrend'

const measurement = (
  date: string,
  weightKg: number,
  overrides: Partial<BodyMeasurement> = {},
): BodyMeasurement => ({
  date,
  weightKg,
  bodyFatPercent: null,
  muscleMassKg: null,
  visceralFatLevel: null,
  basalMetabolicRateKcal: null,
  recordedAt: `${date}T07:00:00.000Z`,
  ...overrides,
})

describe('buildBodyTrend', () => {
  test('古い日から順に並べる', () => {
    // Arrange: 新しい順で渡ってくる
    const measurements = [measurement('2026-08-03', 70), measurement('2026-08-01', 71)]

    // Act
    const trend = buildBodyTrend(measurements, null)

    // Assert
    expect(trend.map((point) => point.date)).toEqual(['2026-08-01', '2026-08-03'])
  })

  test('直近7日ぶんで移動平均を出す', () => {
    // Arrange
    const measurements = [
      measurement('2026-08-01', 70),
      measurement('2026-08-02', 72),
      measurement('2026-08-03', 71),
    ]

    // Act
    const trend = buildBodyTrend(measurements, null)

    // Assert: (70+72+71)/3 = 71
    expect(trend[0]?.movingAverageKg).toBe(70)
    expect(trend[1]?.movingAverageKg).toBe(71)
    expect(trend[2]?.movingAverageKg).toBe(71)
  })

  test('7日より前の値は移動平均に混ぜない', () => {
    // Arrange: 3週間空いた
    const measurements = [measurement('2026-07-01', 80), measurement('2026-08-01', 70)]

    // Act
    const trend = buildBodyTrend(measurements, null)

    // Assert: 昔の80kgに引っぱられない
    expect(trend[1]?.movingAverageKg).toBe(70)
  })

  test('測り忘れた日があっても、あるぶんだけで平均する', () => {
    // Arrange: 8/1 と 8/5（間の3日は測っていない）
    const measurements = [measurement('2026-08-01', 70), measurement('2026-08-05', 72)]

    // Act
    const trend = buildBodyTrend(measurements, null)

    // Assert: (70+72)/2 = 71
    expect(trend[1]?.movingAverageKg).toBe(71)
  })

  test('体脂肪率から除脂肪体重を出す', () => {
    // Arrange & Act
    const trend = buildBodyTrend([measurement('2026-08-01', 70, { bodyFatPercent: 15 })], null)

    // Assert: 70 × 0.85 = 59.5
    expect(trend[0]?.leanBodyMassKg).toBe(59.5)
  })

  test('身長があれば BMI を出す', () => {
    const trend = buildBodyTrend([measurement('2026-08-01', 70)], 170)

    expect(trend[0]?.bmi).toBe(24.2)
  })

  test('身長が無ければ BMI は出さない', () => {
    // Arrange & Act & Assert: 当て推量の数字は出さない
    const trend = buildBodyTrend([measurement('2026-08-01', 70)], null)

    expect(trend[0]?.bmi).toBeNull()
  })

  test('記録が無ければ空', () => {
    expect(buildBodyTrend([], 170)).toEqual([])
  })
})

describe('calcMetricChange', () => {
  test('はじめと終わりの差を出す', () => {
    // Arrange
    const points = [
      { date: '2026-08-01', value: 71 },
      { date: '2026-08-15', value: 70 },
    ]

    // Act
    const change = calcMetricChange(points)

    // Assert
    expect(change?.first).toBe(71)
    expect(change?.last).toBe(70)
    expect(change?.delta).toBe(-1)
  })

  test('1週間あたりの変化に直す', () => {
    // Arrange: 14日で −1.0kg
    const points = [
      { date: '2026-08-01', value: 71 },
      { date: '2026-08-15', value: 70 },
    ]

    // Act & Assert: 週あたり −0.5kg
    expect(calcMetricChange(points)?.perWeek).toBe(-0.5)
  })

  test('値が1つだけなら変化は出さない', () => {
    // Arrange & Act & Assert: 傾向は読み取れない
    expect(calcMetricChange([{ date: '2026-08-01', value: 70 }])).toBeNull()
  })

  test('空なら出さない', () => {
    expect(calcMetricChange([])).toBeNull()
  })

  test('測っていない項目は飛ばす', () => {
    // Arrange: 体脂肪率は途中からしか測っていない
    const points = [
      { date: '2026-08-01', value: null },
      { date: '2026-08-08', value: 16 },
      { date: '2026-08-15', value: 15 },
    ]

    // Act
    const change = calcMetricChange(points)

    // Assert: 測った最初と最後で比べる
    expect(change?.first).toBe(16)
    expect(change?.delta).toBe(-1)
    expect(change?.perWeek).toBe(-1)
  })

  test('同じ日しか無ければ週あたりは出さない', () => {
    // Arrange: 割り算の分母が0になる
    const points = [
      { date: '2026-08-01', value: 71 },
      { date: '2026-08-01', value: 70 },
    ]

    // Act
    const change = calcMetricChange(points)

    // Assert
    expect(change?.delta).toBe(-1)
    expect(change?.perWeek).toBeNull()
  })
})
