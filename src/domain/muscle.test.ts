import { describe, test, expect } from 'vitest'
import {
  ARCHITECTURE_BY_SEED_EXERCISE,
  DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP,
  DEFAULT_REST_SEC_BY_MUSCLE_GROUP,
  PARALLEL_TARGET,
  PENNATE_TARGET,
  defaultRestSecForMuscleGroup,
  defaultTargetForArchitecture,
  resolveArchitecture,
} from './muscle'
import type { MuscleGroup } from './types'

const ALL_MUSCLE_GROUPS: readonly MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'core',
  'other',
]

describe('defaultTargetForArchitecture', () => {
  test('平行筋は 10〜15回 を既定にする', () => {
    expect(defaultTargetForArchitecture('parallel')).toEqual({
      repsMin: 10,
      repsMax: 15,
      sets: 3,
    })
  })

  test('羽状筋は 8〜12回 を既定にする', () => {
    expect(defaultTargetForArchitecture('pennate')).toEqual({
      repsMin: 8,
      repsMax: 12,
      sets: 3,
    })
  })

  test('公開している定数と一致する', () => {
    expect(defaultTargetForArchitecture('parallel')).toEqual(PARALLEL_TARGET)
    expect(defaultTargetForArchitecture('pennate')).toEqual(PENNATE_TARGET)
  })
})

describe('DEFAULT_REST_SEC_BY_MUSCLE_GROUP', () => {
  test('すべての部位に既定値がある', () => {
    for (const group of ALL_MUSCLE_GROUPS) {
      expect(DEFAULT_REST_SEC_BY_MUSCLE_GROUP[group]).toBeGreaterThan(0)
    }
  })

  test('動員される筋量が大きい部位ほど休憩を長くとる', () => {
    const rest = DEFAULT_REST_SEC_BY_MUSCLE_GROUP

    expect(rest.legs).toBeGreaterThanOrEqual(rest.back)
    expect(rest.back).toBeGreaterThanOrEqual(rest.shoulders)
    expect(rest.shoulders).toBeGreaterThanOrEqual(rest.arms)
    expect(rest.arms).toBeGreaterThanOrEqual(rest.core)
  })

  test('多関節・大筋群は2分以上を確保する', () => {
    // メタ分析では総挙上量を保てる2分以上が筋肥大に有利とされる
    expect(DEFAULT_REST_SEC_BY_MUSCLE_GROUP.legs).toBeGreaterThanOrEqual(120)
    expect(DEFAULT_REST_SEC_BY_MUSCLE_GROUP.back).toBeGreaterThanOrEqual(120)
    expect(DEFAULT_REST_SEC_BY_MUSCLE_GROUP.chest).toBeGreaterThanOrEqual(120)
  })
})

describe('defaultRestSecForMuscleGroup', () => {
  test('部位に対応する既定値を返す', () => {
    expect(defaultRestSecForMuscleGroup('legs')).toBe(DEFAULT_REST_SEC_BY_MUSCLE_GROUP.legs)
    expect(defaultRestSecForMuscleGroup('arms')).toBe(DEFAULT_REST_SEC_BY_MUSCLE_GROUP.arms)
  })
})

describe('DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP', () => {
  test('すべての部位に既定の分類がある', () => {
    for (const group of ALL_MUSCLE_GROUPS) {
      expect(['parallel', 'pennate']).toContain(DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP[group])
    }
  })

  test('三角筋を含む肩と、大腿四頭筋を含む脚は羽状筋とする', () => {
    expect(DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP.shoulders).toBe('pennate')
    expect(DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP.legs).toBe('pennate')
  })

  test('腹直筋を含む体幹と広背筋を含む背中は平行筋とする', () => {
    expect(DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP.core).toBe('parallel')
    expect(DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP.back).toBe('parallel')
  })
})

describe('resolveArchitecture', () => {
  test('初期種目は種目名から分類する', () => {
    // 上腕二頭筋は平行筋、上腕三頭筋は羽状筋。同じ「腕」でも分かれる
    expect(resolveArchitecture('ダンベルカール', 'arms')).toBe('parallel')
    expect(resolveArchitecture('トライセプスキックバック', 'arms')).toBe('pennate')
  })

  test('名前が分からなければ部位の既定にする', () => {
    expect(resolveArchitecture('自作の肩種目', 'shoulders')).toBe('pennate')
    expect(resolveArchitecture('自作の背中種目', 'back')).toBe('parallel')
  })

  test('種目名の前後の空白は無視する', () => {
    expect(resolveArchitecture('  ダンベルカール  ', 'arms')).toBe('parallel')
  })
})

describe('ARCHITECTURE_BY_SEED_EXERCISE', () => {
  test('同じ部位でも筋ごとに分類を分けている', () => {
    // 腕: 二頭は平行筋、三頭は羽状筋
    expect(ARCHITECTURE_BY_SEED_EXERCISE['ハンマーカール']).toBe('parallel')
    expect(ARCHITECTURE_BY_SEED_EXERCISE['ダンベルフレンチプレス']).toBe('pennate')
    // 脚: 大腿四頭筋は羽状筋、ハムストリングスは平行筋
    expect(ARCHITECTURE_BY_SEED_EXERCISE['ダンベルスクワット']).toBe('pennate')
    expect(ARCHITECTURE_BY_SEED_EXERCISE['ダンベルルーマニアンデッドリフト']).toBe('parallel')
    // 肩: 三角筋は羽状筋、僧帽筋は平行筋
    expect(ARCHITECTURE_BY_SEED_EXERCISE['サイドレイズ']).toBe('pennate')
    expect(ARCHITECTURE_BY_SEED_EXERCISE['ダンベルシュラッグ']).toBe('parallel')
  })
})

describe('自分で足した種目の筋構造', () => {
  test('三頭の種目は羽状筋にする', () => {
    // Arrange & Act & Assert: 部位の既定（腕＝二頭に合わせた平行筋）に落とさない
    expect(resolveArchitecture('トライセプスエクステンション', 'arms')).toBe('pennate')
    expect(resolveArchitecture('三頭筋プレス', 'arms')).toBe('pennate')
    expect(resolveArchitecture('ナローベンチプレス', 'arms')).toBe('pennate')
  })

  test('二頭の種目は平行筋のままにする', () => {
    expect(resolveArchitecture('プリーチャーカール', 'arms')).toBe('parallel')
    expect(resolveArchitecture('二頭筋トレ', 'arms')).toBe('parallel')
  })

  test('三頭と二頭の語が両方あれば三頭を採る', () => {
    // Arrange & Act & Assert: 効かせる先が三頭の種目名になっている
    expect(resolveArchitecture('トライセプスキックバックカール', 'arms')).toBe('pennate')
  })

  test('脚は四頭とハムで分ける', () => {
    expect(resolveArchitecture('ブルガリアンスクワット改', 'legs')).toBe('pennate')
    expect(resolveArchitecture('レッグカール', 'legs')).toBe('parallel')
  })

  test('初期種目の分類は名前の語より優先する', () => {
    // Arrange & Act & Assert: ダンベルプルオーバーは胸ではなく広背筋ねらいで平行筋
    expect(resolveArchitecture('ダンベルプルオーバー', 'chest')).toBe('parallel')
  })

  test('当たる語が無ければ部位の既定にする', () => {
    expect(resolveArchitecture('よくわからない種目', 'arms')).toBe('parallel')
    expect(resolveArchitecture('よくわからない種目', 'chest')).toBe('pennate')
  })

  test('前後の空白は無視する', () => {
    expect(resolveArchitecture('  トライセプスキックバック  ', 'arms')).toBe('pennate')
  })
})
