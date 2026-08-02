import { describe, test, expect, beforeEach } from 'vitest'
import { resetDatabase } from '@/test/dbTestUtils'
import {
  createExercise,
  getExercise,
  listActiveExercises,
  listAllExercises,
  setExerciseArchived,
  updateExercise,
} from './exerciseRepository'

beforeEach(async () => {
  await resetDatabase()
})

const inclinePress = {
  name: 'インクラインダンベルプレス',
  muscleGroup: 'chest',
  equipment: 'dumbbell',
  dumbbellCount: 2,
} as const

describe('createExercise', () => {
  test('種目を作成して取得できる', async () => {
    // Act
    const id = await createExercise(inclinePress)
    const saved = await getExercise(id)

    // Assert
    expect(saved?.name).toBe('インクラインダンベルプレス')
    expect(saved?.dumbbellCount).toBe(2)
    expect(saved?.isArchived).toBe(false)
    expect(saved?.createdAt).toBeTruthy()
  })

  test('同じ名前の種目は作成できない', async () => {
    // Arrange
    await createExercise(inclinePress)

    // Act & Assert
    await expect(createExercise(inclinePress)).rejects.toThrow()
  })

  test('名前の前後の空白は取り除く', async () => {
    const id = await createExercise({ ...inclinePress, name: '  サイドレイズ  ' })

    expect((await getExercise(id))?.name).toBe('サイドレイズ')
  })

  test('名前が空なら作成できない', async () => {
    await expect(createExercise({ ...inclinePress, name: '   ' })).rejects.toThrow()
  })
})

describe('listActiveExercises', () => {
  test('アーカイブ済みの種目を除外する', async () => {
    // Arrange
    const activeId = await createExercise(inclinePress)
    const archivedId = await createExercise({ ...inclinePress, name: 'ダンベルフライ' })
    await setExerciseArchived(archivedId, true)

    // Act
    const active = await listActiveExercises()

    // Assert
    expect(active.map((exercise) => exercise.id)).toEqual([activeId])
  })

  test('名前の昇順で返す', async () => {
    // Arrange
    await createExercise({ ...inclinePress, name: 'ビ' })
    await createExercise({ ...inclinePress, name: 'ア' })

    // Act
    const active = await listActiveExercises()

    // Assert
    expect(active.map((exercise) => exercise.name)).toEqual(['ア', 'ビ'])
  })
})

describe('listAllExercises', () => {
  test('アーカイブ済みも含めて返す', async () => {
    // Arrange
    await createExercise(inclinePress)
    const archivedId = await createExercise({ ...inclinePress, name: 'ダンベルフライ' })
    await setExerciseArchived(archivedId, true)

    // Act & Assert
    expect(await listAllExercises()).toHaveLength(2)
  })
})

describe('updateExercise', () => {
  test('指定した項目だけを更新する', async () => {
    // Arrange
    const id = await createExercise(inclinePress)

    // Act
    await updateExercise(id, { dumbbellCount: 1 })

    // Assert
    const updated = await getExercise(id)
    expect(updated?.dumbbellCount).toBe(1)
    expect(updated?.name).toBe('インクラインダンベルプレス')
  })
})

describe('setExerciseArchived', () => {
  test('アーカイブ状態を戻せる', async () => {
    // Arrange
    const id = await createExercise(inclinePress)
    await setExerciseArchived(id, true)

    // Act
    await setExerciseArchived(id, false)

    // Assert
    expect((await getExercise(id))?.isArchived).toBe(false)
  })
})
