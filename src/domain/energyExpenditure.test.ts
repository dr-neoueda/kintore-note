import { describe, test, expect } from 'vitest'
import {
  STRENGTH_METS_LIGHT,
  STRENGTH_METS_VIGOROUS,
  calcAverageRestSec,
  calcStrengthMets,
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

  test('セットが1つなら最低限の時間を当てる', () => {
    expect(estimateWorkoutDurationSec(['2026-08-08T10:00:00.000Z'])).toBe(60)
  })

  test('記録が無ければ0', () => {
    expect(estimateWorkoutDurationSec([])).toBe(0)
  })

  test('まとめて入力しても、セット数ぶんの下限は数える', () => {
    // Arrange: 過去の日を後からまとめて入れると、時刻が近くに固まる
    const times = ['2026-08-08T12:00:00.000Z', '2026-08-08T12:00:00.000Z']

    // Act & Assert
    expect(estimateWorkoutDurationSec(times)).toBe(120)
  })

  test('続けて押したときも、0秒扱いにはしない', () => {
    // Arrange: 数秒差で2セット記録した場合
    const times = ['2026-08-08T12:00:00.000Z', '2026-08-08T12:00:02.000Z']

    // Act & Assert: 実際にはセット本体の時間がかかっている
    expect(estimateWorkoutDurationSec(times)).toBe(120)
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
    const kcal = calcCardioEnergyKcal({ activity: 'running', distanceKm: 10, durationSec: 50 * 60, intensity: null }, 70)

    // Assert: 11 METs 前後 × 0.833h × 70kg × 1.05 ≒ 670
    expect(kcal).toBeGreaterThan(600)
    expect(kcal).toBeLessThan(750)
  })

  test('同じ距離なら、ペースが違っても消費はおおむね同じになる', () => {
    // Arrange: 走行の消費は距離でほぼ決まる（およそ 1kcal/kg/km）。
    // 速くすると強度は上がるが時間が短くなり、打ち消し合う
    const fast = calcCardioEnergyKcal({ activity: 'running', distanceKm: 10, durationSec: 45 * 60, intensity: null }, 70)
    const slow = calcCardioEnergyKcal({ activity: 'running', distanceKm: 10, durationSec: 70 * 60, intensity: null }, 70)

    // Assert: 10km × 70kg ≒ 700kcal の周辺に収まる
    for (const kcal of [fast, slow]) {
      expect(kcal).toBeGreaterThan(600)
      expect(kcal).toBeLessThan(800)
    }
  })

  test('距離が伸びれば消費も増える', () => {
    const short = calcCardioEnergyKcal({ activity: 'running', distanceKm: 5, durationSec: 25 * 60, intensity: null }, 70)
    const long = calcCardioEnergyKcal({ activity: 'running', distanceKm: 10, durationSec: 50 * 60, intensity: null }, 70)

    expect(long).toBeGreaterThan(short)
  })

  test('距離が0なら0', () => {
    expect(calcCardioEnergyKcal({ activity: 'running', distanceKm: 0, durationSec: 1800, intensity: null }, 70)).toBe(0)
  })
})

describe('calcAverageRestSec', () => {
  test('記録された休憩の平均を出す', () => {
    expect(calcAverageRestSec([60, 120, 90])).toBe(90)
  })

  test('記録されていない休憩は数えない', () => {
    // Arrange & Act & Assert: 1セット目には休憩が無い
    expect(calcAverageRestSec([null, 60, 120])).toBe(90)
  })

  test('1つも記録が無ければ null', () => {
    expect(calcAverageRestSec([null, null])).toBeNull()
    expect(calcAverageRestSec([])).toBeNull()
  })
})

describe('calcStrengthMets', () => {
  test('長く休むセッションは light にする', () => {
    expect(calcStrengthMets(180)).toBe(STRENGTH_METS_LIGHT)
    expect(calcStrengthMets(150)).toBe(STRENGTH_METS_LIGHT)
  })

  test('ほとんど休まないセッションは vigorous にする', () => {
    expect(calcStrengthMets(30)).toBe(STRENGTH_METS_VIGOROUS)
    expect(calcStrengthMets(45)).toBe(STRENGTH_METS_VIGOROUS)
  })

  test('間は補間する', () => {
    // Arrange & Act
    const mets = calcStrengthMets(90)

    // Assert
    expect(mets).toBeGreaterThan(STRENGTH_METS_LIGHT)
    expect(mets).toBeLessThan(STRENGTH_METS_VIGOROUS)
  })

  test('休憩が短いほど強度が上がる', () => {
    expect(calcStrengthMets(60)).toBeGreaterThan(calcStrengthMets(120))
  })

  test('休憩が分からなければ控えめな方にする', () => {
    // Arrange & Act & Assert: 当て推量で多く見積もらない
    expect(calcStrengthMets(null)).toBe(STRENGTH_METS_LIGHT)
  })
})

describe('calcStrengthEnergyKcal', () => {
  test('休憩が分からなければ light で計算する', () => {
    // Arrange & Act: 1時間、体重70kg
    // 1.05 × 3.5 × 1 × 70 ≒ 257
    expect(calcStrengthEnergyKcal(3600, 70)).toBe(Math.round(1.05 * STRENGTH_METS_LIGHT * 70))
  })

  test('休憩が短いセッションは多く見積もる', () => {
    // Arrange & Act & Assert: 同じ1時間でも、休まず続けた方が消費は大きい
    expect(calcStrengthEnergyKcal(3600, 70, 45)).toBeGreaterThan(
      calcStrengthEnergyKcal(3600, 70, 180),
    )
  })

  test('体重が分からなければ0', () => {
    expect(calcStrengthEnergyKcal(3600, 0)).toBe(0)
  })
})

describe('自重トレーニングの消費', () => {
  const calisthenics = (durationSec: number, intensity: 'light' | 'moderate' | 'vigorous' | null) =>
    calcCardioEnergyKcal(
      { activity: 'calisthenics', distanceKm: 0, durationSec, intensity },
      70,
    )

  test('距離が無くても、時間と強度から出せる', () => {
    // Arrange & Act: 動画に沿った腹筋10分（ふつう）
    // 1.05 × 5.0 × (10/60)h × 70kg ≒ 61
    const kcal = calisthenics(10 * 60, 'moderate')

    // Assert
    expect(kcal).toBeGreaterThan(50)
    expect(kcal).toBeLessThan(75)
  })

  test('強度が上がるほど多くなる', () => {
    expect(calisthenics(600, 'vigorous')).toBeGreaterThan(calisthenics(600, 'moderate'))
    expect(calisthenics(600, 'moderate')).toBeGreaterThan(calisthenics(600, 'light'))
  })

  test('強度を選んでいなければ「ふつう」として扱う', () => {
    expect(calisthenics(600, null)).toBe(calisthenics(600, 'moderate'))
  })

  test('長くやるほど多くなる', () => {
    expect(calisthenics(1200, 'moderate')).toBeGreaterThan(calisthenics(600, 'moderate'))
  })

  test('時間が0なら0', () => {
    expect(calisthenics(0, 'moderate')).toBe(0)
  })
})
