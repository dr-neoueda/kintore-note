import { describe, test, expect } from 'vitest'
import {
  DEFAULT_REST_ALARM_DURATION_SEC,
  MAX_REST_ALARM_DURATION_SEC,
  MIN_REST_ALARM_DURATION_SEC,
  REST_ALARM_DURATION_OPTIONS,
  REST_ALARM_GRACE_SEC,
  normalizeRestAlarmDurationSec,
  shouldFireRestAlarm,
} from './restAlarm'

const baseParams = {
  isEnabled: true,
  isDocumentVisible: true,
  hasAlreadyFired: false,
  elapsedSeconds: 90,
  targetSeconds: 90,
}

describe('shouldFireRestAlarm', () => {
  test('目標時間に達したら鳴らす', () => {
    expect(shouldFireRestAlarm(baseParams)).toBe(true)
  })

  test('目標時間に達していなければ鳴らさない', () => {
    expect(shouldFireRestAlarm({ ...baseParams, elapsedSeconds: 89 })).toBe(false)
  })

  test('設定で無効なら鳴らさない', () => {
    expect(shouldFireRestAlarm({ ...baseParams, isEnabled: false })).toBe(false)
  })

  test('一度鳴らしたら同じ休憩では鳴らさない', () => {
    expect(shouldFireRestAlarm({ ...baseParams, hasAlreadyFired: true })).toBe(false)
  })

  test('画面が見えていなければ鳴らさない', () => {
    // iOS ではバックグラウンドで音を鳴らせないうえ、鳴っても気づけない
    expect(shouldFireRestAlarm({ ...baseParams, isDocumentVisible: false })).toBe(false)
  })

  test('目標時間が未設定なら鳴らさない', () => {
    expect(shouldFireRestAlarm({ ...baseParams, targetSeconds: 0 })).toBe(false)
  })

  test('猶予の範囲内で戻ってきたら鳴らす', () => {
    expect(
      shouldFireRestAlarm({ ...baseParams, elapsedSeconds: 90 + REST_ALARM_GRACE_SEC - 1 }),
    ).toBe(true)
  })

  test('目標を大きく過ぎてから戻ってきた場合は鳴らさない', () => {
    // 休憩がとっくに終わっている状態でアプリを開き直したときに、
    // いきなり鳴ると驚くだけで意味がない
    expect(
      shouldFireRestAlarm({ ...baseParams, elapsedSeconds: 90 + REST_ALARM_GRACE_SEC + 1 }),
    ).toBe(false)
  })
})

describe('normalizeRestAlarmDurationSec', () => {
  test('選んだ秒数をそのまま使う', () => {
    expect(normalizeRestAlarmDurationSec(6)).toBe(6)
  })

  test('短すぎる値は下限に上げる', () => {
    // Arrange & Act & Assert: 0秒だと鳴らないのと同じになる
    expect(normalizeRestAlarmDurationSec(0)).toBe(MIN_REST_ALARM_DURATION_SEC)
  })

  test('長すぎる値は上限で止める', () => {
    expect(normalizeRestAlarmDurationSec(600)).toBe(MAX_REST_ALARM_DURATION_SEC)
  })

  test('数値でなければ既定値にする', () => {
    expect(normalizeRestAlarmDurationSec(Number.NaN)).toBe(DEFAULT_REST_ALARM_DURATION_SEC)
  })
})

describe('REST_ALARM_DURATION_OPTIONS', () => {
  test('すべて扱える範囲に収まっている', () => {
    for (const option of REST_ALARM_DURATION_OPTIONS) {
      expect(normalizeRestAlarmDurationSec(option.seconds)).toBe(option.seconds)
    }
  })

  test('既定値が選択肢に含まれている', () => {
    // Arrange & Act & Assert: 初期状態でどれも選ばれていない見た目にならないように
    expect(
      REST_ALARM_DURATION_OPTIONS.some(
        (option) => option.seconds === DEFAULT_REST_ALARM_DURATION_SEC,
      ),
    ).toBe(true)
  })
})
