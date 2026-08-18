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

describe('updateExerciseSettings（器具とダンベル数）', () => {
  test('作成後に器具と同時に使うダンベルの数を変更できる', async () => {
    // Arrange: 作成時に取り違えても、あとから直せる必要がある
    const id = await createExercise(inclinePress)

    // Act
    await updateExerciseSettings(id, { equipment: 'bodyweight', dumbbellCount: 1 })

    // Assert
    const updated = await getExercise(id)
    expect(updated?.equipment).toBe('bodyweight')
    expect(updated?.dumbbellCount).toBe(1)
  })

  test('器具だけを変えても他の設定は残る', async () => {
    // Arrange
    const id = await createExercise(inclinePress)
    const before = await getExercise(id)

    // Act
    await updateExerciseSettings(id, { dumbbellCount: 1 })

    // Assert
    const after = await getExercise(id)
    expect(after?.dumbbellCount).toBe(1)
    expect(after?.equipment).toBe(before?.equipment)
    expect(after?.restSec).toBe(before?.restSec)
  })
})

describe('名前と部位だけで種目を作る', () => {
  test('器具とダンベル数を省略すると既定値になる', async () => {
    // Act
    const id = await createExercise({ name: 'インクラインリアレイズ', muscleGroup: 'shoulders' })

    // Assert
    const created = await getExercise(id)
    expect(created?.equipment).toBe('dumbbell')
    expect(created?.dumbbellCount).toBe(2)
  })

  test('部位から筋の種類・回数・休憩が自動で決まる', async () => {
    // Act: 肩は三角筋（羽状筋）、休憩は120秒
    const id = await createExercise({ name: '自作の肩種目', muscleGroup: 'shoulders' })

    // Assert
    const created = await getExercise(id)
    expect(created?.muscleArchitecture).toBe('pennate')
    expect(created?.target).toEqual({ repsMin: 8, repsMax: 12, sets: 3 })
    expect(created?.restSec).toBe(120)
  })

  test('自分で足した三頭の種目は、名前から羽状筋にする', async () => {
    // Arrange & Act: 腕の既定は二頭に合わせた平行筋（10〜15回）
    const id = await createExercise({
      name: 'トライセプスエクステンション',
      muscleGroup: 'arms',
    })

    // Assert: 三頭は羽状筋なので8〜12回にする
    const created = await getExercise(id)
    expect(created?.muscleArchitecture).toBe('pennate')
    expect(created?.target).toEqual({ repsMin: 8, repsMax: 12, sets: 3 })
  })

  test('自分で足した二頭の種目は平行筋のままにする', async () => {
    // Arrange & Act
    const id = await createExercise({ name: 'プリーチャーカール', muscleGroup: 'arms' })

    // Assert
    const created = await getExercise(id)
    expect(created?.muscleArchitecture).toBe('parallel')
    expect(created?.target).toEqual({ repsMin: 10, repsMax: 15, sets: 3 })
  })

  test('作った種目は一覧に残り、以後も選べる', async () => {
    // Arrange
    await createExercise({ name: '自作種目', muscleGroup: 'back' })

    // Act & Assert
    const active = await listActiveExercises()
    expect(active.map((exercise) => exercise.name)).toContain('自作種目')
  })
})

describe('重複した名前の扱い', () => {
  test('分かりやすいエラーで弾き、失敗する書き込みを発行しない', async () => {
    // Arrange: 失敗する add を投げると liveQuery の楽観更新が壊れて画面が落ちる
    await createExercise(inclinePress)

    // Act & Assert
    await expect(createExercise(inclinePress)).rejects.toThrow('同じ名前の種目が既にあります')
  })

  test('前後の空白を除いた名前で重複を判定する', async () => {
    await createExercise(inclinePress)

    await expect(
      createExercise({ ...inclinePress, name: '  インクラインダンベルプレス  ' }),
    ).rejects.toThrow('同じ名前の種目が既にあります')
  })

  test('弾かれても既存の種目は1件のまま', async () => {
    // Arrange
    await createExercise(inclinePress)

    // Act
    await expect(createExercise(inclinePress)).rejects.toThrow()

    // Assert
    expect(await listAllExercises()).toHaveLength(1)
  })
})
