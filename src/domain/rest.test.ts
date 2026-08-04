import { describe, test, expect } from 'vitest'
import {
  MAX_REST_SEC,
  MIN_REST_SEC,
  REST_STEP_SEC,
  WARMUP_REST_SEC,
  defaultRestTargetSec,
  stepRestTargetSec,
} from './rest'

describe('defaultRestTargetSec', () => {
  test('本セットは種目の設定をそのまま使う', () => {
    // Arrange & Act & Assert
    expect(defaultRestTargetSec(150, false)).toBe(150)
  })

  test('ウォームアップは短い既定値まで下げる', () => {
    // Arrange: 胸の既定は150秒。ウォームアップで2分半待つのは長すぎる
    // Act & Assert
    expect(defaultRestTargetSec(150, true)).toBe(WARMUP_REST_SEC)
  })

  test('種目の設定がウォームアップの既定より短ければ、そのまま使う', () => {
    // Arrange: 体幹の既定は60秒。ウォームアップで長くなってはいけない
    // Act & Assert
    expect(defaultRestTargetSec(30, true)).toBe(30)
  })
})

describe('stepRestTargetSec', () => {
  test('1回の操作で15秒動く', () => {
    expect(stepRestTargetSec(150, 'up')).toBe(150 + REST_STEP_SEC)
    expect(stepRestTargetSec(150, 'down')).toBe(150 - REST_STEP_SEC)
  })

  test('下限を下回らない', () => {
    expect(stepRestTargetSec(MIN_REST_SEC, 'down')).toBe(MIN_REST_SEC)
    expect(stepRestTargetSec(10, 'down')).toBe(MIN_REST_SEC)
  })

  test('上限を超えない', () => {
    expect(stepRestTargetSec(MAX_REST_SEC, 'up')).toBe(MAX_REST_SEC)
    expect(stepRestTargetSec(MAX_REST_SEC - 5, 'up')).toBe(MAX_REST_SEC)
  })

  test('段階に載っていない値でも、そこから15秒ずつ動く', () => {
    // Arrange: カルテで100秒のような値も設定できる
    expect(stepRestTargetSec(100, 'up')).toBe(115)
  })
})
