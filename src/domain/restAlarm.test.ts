import { describe, test, expect } from 'vitest'
import { REST_ALARM_GRACE_SEC, shouldFireRestAlarm } from './restAlarm'

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
