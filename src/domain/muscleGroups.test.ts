import { describe, test, expect } from 'vitest'
import {
  DISPLAYED_MUSCLE_GROUPS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type MuscleGroup,
} from './types'

describe('画面に出す部位', () => {
  test('保存できる部位はすべて出す', () => {
    // Arrange
    const expected: readonly MuscleGroup[] = [
      'chest',
      'back',
      'shoulders',
      'arms',
      'legs',
      'core',
      'other',
    ]

    // Act & Assert
    expect(DISPLAYED_MUSCLE_GROUPS).toEqual(expected)
  })

  test('鍛え始めた部位を戻せる形になっている', () => {
    // Arrange & Act & Assert: 保存できる部位から外していないので、
    // 表示から消しても記録は残り、戻せば元通りになる
    expect(MUSCLE_GROUPS).toContain('core')
    expect(DISPLAYED_MUSCLE_GROUPS.every((group) => MUSCLE_GROUPS.includes(group))).toBe(true)
  })

  test('画面に出さない部位にも表示名がある', () => {
    // Arrange & Act & Assert: 古い記録を開いても名前が空にならない
    for (const group of MUSCLE_GROUPS) {
      expect(MUSCLE_GROUP_LABELS[group]).not.toBe('')
    }
  })
})
