import { describe, test, expect, beforeEach } from 'vitest'
import { resetDatabase } from '@/test/dbTestUtils'
import {
  createExercise,
  getExercise,
  listActiveExercises,
  listAllExercises,
  setExerciseArchived,
  updateExerciseSettings,
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

describe('updateExerciseSettings', () => {
  test('筋の種類・目標・休憩・参考リンクを更新できる', async () => {
    // Arrange
    const id = await createExercise(inclinePress)

    // Act
    await updateExerciseSettings(id, {
      muscleArchitecture: 'parallel',
      target: { repsMin: 10, repsMax: 15, sets: 4 },
      restSec: 200,
      referenceUrl: 'https://www.youtube.com/watch?v=abc',
    })

    // Assert
    const updated = await getExercise(id)
    expect(updated?.muscleArchitecture).toBe('parallel')
    expect(updated?.target).toEqual({ repsMin: 10, repsMax: 15, sets: 4 })
    expect(updated?.restSec).toBe(200)
    expect(updated?.referenceUrl).toBe('https://www.youtube.com/watch?v=abc')
  })

  test('指定した項目だけを更新する', async () => {
    // Arrange
    const id = await createExercise(inclinePress)
    const before = await getExercise(id)

    // Act
    await updateExerciseSettings(id, { restSec: 200 })

    // Assert
    const after = await getExercise(id)
    expect(after?.restSec).toBe(200)
    expect(after?.target).toEqual(before?.target)
    expect(after?.muscleArchitecture).toBe(before?.muscleArchitecture)
  })

  test('破綻した目標は整えて保存する', async () => {
    // Arrange
    const id = await createExercise(inclinePress)

    // Act: 下限が上限を超えている
    await updateExerciseSettings(id, { target: { repsMin: 20, repsMax: 12, sets: 0 } })

    // Assert
    expect((await getExercise(id))?.target).toEqual({ repsMin: 12, repsMax: 12, sets: 1 })
  })

  test('休憩秒数は0以上の整数に丸める', async () => {
    const id = await createExercise(inclinePress)

    await updateExerciseSettings(id, { restSec: -30.6 })

    expect((await getExercise(id))?.restSec).toBe(0)
  })

  test('開けない URL は保存できない', async () => {
    const id = await createExercise(inclinePress)

    await expect(
      updateExerciseSettings(id, { referenceUrl: 'javascript:alert(1)' }),
    ).rejects.toThrow()
  })

  test('空文字の参考リンクは未設定にする', async () => {
    // Arrange
    const id = await createExercise({ ...inclinePress, referenceUrl: 'https://example.com' })

    // Act
    await updateExerciseSettings(id, { referenceUrl: '' })

    // Assert
    expect((await getExercise(id))?.referenceUrl).toBeNull()
  })
})
