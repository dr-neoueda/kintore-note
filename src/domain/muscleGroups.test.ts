import { describe, test, expect } from 'vitest'
import {
  DISPLAYED_MUSCLE_GROUPS,
  MUSCLE_GROUPS,
  MUSCLE_GROUP_LABELS,
  type MuscleGroup,
} from './types'

describe('画面に出す部位', () => {
  test('体幹は出さない', () => {
    // Arrange & Act & Assert: 今は鍛えていないため、選択肢にも集計にも並べない
    expect(DISPLAYED_MUSCLE_GROUPS).not.toContain('core')
  })

  test('体幹以外はすべて出す', () => {
    // Arrange
    const expected: readonly MuscleGroup[] = ['chest', 'back', 'shoulders', 'arms', 'legs', 'other']

    // Act & Assert
    expect(DISPLAYED_MUSCLE_GROUPS).toEqual(expected)
  })

  test('保存できる部位としては体幹を残す', () => {
    // Arrange & Act & Assert: 過去の記録が参照している可能性があるため型からは外さない
    expect(MUSCLE_GROUPS).toContain('core')
  })

  test('画面に出さない部位にも表示名がある', () => {
    // Arrange & Act & Assert: 古い記録を開いても名前が空にならない
    for (const group of MUSCLE_GROUPS) {
      expect(MUSCLE_GROUP_LABELS[group]).not.toBe('')
    }
  })
})
