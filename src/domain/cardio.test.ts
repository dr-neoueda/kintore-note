import { describe, test, expect } from 'vitest'
import { calcPaceSecPerKm, calcSpeedKmh, formatPace, metsForSpeed } from './cardio'

describe('calcSpeedKmh', () => {
  test('距離と時間から平均速度を出す', () => {
    // Arrange & Act: 10km を 50分
    expect(calcSpeedKmh(10, 50 * 60)).toBe(12)
  })

  test('時間が0なら0', () => {
    expect(calcSpeedKmh(10, 0)).toBe(0)
  })

  test('距離が0なら0', () => {
    expect(calcSpeedKmh(0, 600)).toBe(0)
  })
})

describe('calcPaceSecPerKm', () => {
  test('1kmあたりの秒数を出す', () => {
    // Arrange & Act: 10km を 50分 → 5分/km
    expect(calcPaceSecPerKm(10, 50 * 60)).toBe(300)
  })

  test('距離が0なら null', () => {
    expect(calcPaceSecPerKm(0, 600)).toBeNull()
  })
})

describe('formatPace', () => {
  test("5'30\" の形式にする", () => {
    expect(formatPace(330)).toBe('5\'30"')
  })

  test('秒が1桁でも0を詰める', () => {
    expect(formatPace(305)).toBe('5\'05"')
  })

  test('未算出は — で出す', () => {
    expect(formatPace(null)).toBe('—')
  })
})

describe('metsForSpeed', () => {
  test('表にある速度はその値を返す', () => {
    // Arrange & Act & Assert: 9.7km/h のランニングは 9.8 METs
    expect(metsForSpeed('running', 9.7)).toBe(9.8)
  })

  test('表にない速度は前後から補間する', () => {
    // Arrange: 8.0km/h=8.3、9.7km/h=9.8 の中間あたり
    const mets = metsForSpeed('running', 8.85)

    // Assert
    expect(mets).toBeGreaterThan(8.3)
    expect(mets).toBeLessThan(9.8)
  })

  test('速いほど強度が上がる', () => {
    expect(metsForSpeed('running', 12)).toBeGreaterThan(metsForSpeed('running', 8))
  })

  test('表の範囲外は端の値で頭打ちにする', () => {
    // Arrange & Act & Assert: 外挿すると非現実的な値になる
    expect(metsForSpeed('running', 100)).toBe(19)
    expect(metsForSpeed('running', 1)).toBe(6)
  })

  test('種目ごとに強度が違う', () => {
    // Arrange & Act & Assert: 同じ速度でも歩行は走行より軽い
    expect(metsForSpeed('walking', 6.4)).toBeLessThan(metsForSpeed('running', 6.4))
  })
})
