import { describe, test, expect, beforeEach } from 'vitest'
import { resetDatabase } from '@/test/dbTestUtils'
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from './templateRepository'

beforeEach(async () => {
  await resetDatabase()
})

const chestDay = {
  name: '胸の日',
  note: 'インクライン中心',
  items: [
    { exerciseId: 1, targetSets: 3, targetReps: 10, targetWeightKg: 11.5 },
    { exerciseId: 2, targetSets: 3, targetReps: 12, targetWeightKg: null },
  ],
}

describe('createTemplate', () => {
  test('テンプレートを作成して取得できる', async () => {
    // Act
    const id = await createTemplate(chestDay)
    const saved = await getTemplate(id)

    // Assert
    expect(saved?.name).toBe('胸の日')
    expect(saved?.items).toHaveLength(2)
    expect(saved?.items[0]?.targetWeightKg).toBe(11.5)
  })

  test('名前が空なら作成できない', async () => {
    await expect(createTemplate({ ...chestDay, name: '  ' })).rejects.toThrow()
  })

  test('並び順を自動で連番にする', async () => {
    // Act
    await createTemplate(chestDay)
    await createTemplate({ ...chestDay, name: '背中の日' })

    // Assert
    const templates = await listTemplates()
    expect(templates.map((template) => template.order)).toEqual([1, 2])
  })
})

describe('listTemplates', () => {
  test('並び順の昇順で返す', async () => {
    // Arrange
    const firstId = await createTemplate(chestDay)
    await createTemplate({ ...chestDay, name: '背中の日' })

    // Act
    await updateTemplate(firstId, { order: 99 })

    // Assert
    const templates = await listTemplates()
    expect(templates.map((template) => template.name)).toEqual(['背中の日', '胸の日'])
  })
})

describe('updateTemplate', () => {
  test('種目の構成を差し替えられる', async () => {
    // Arrange
    const id = await createTemplate(chestDay)

    // Act
    await updateTemplate(id, {
      items: [{ exerciseId: 3, targetSets: 4, targetReps: 8, targetWeightKg: 20.5 }],
    })

    // Assert
    const updated = await getTemplate(id)
    expect(updated?.items).toHaveLength(1)
    expect(updated?.items[0]?.exerciseId).toBe(3)
  })
})

describe('deleteTemplate', () => {
  test('テンプレートを削除できる', async () => {
    // Arrange
    const id = await createTemplate(chestDay)

    // Act
    await deleteTemplate(id)

    // Assert
    expect(await listTemplates()).toHaveLength(0)
  })
})
