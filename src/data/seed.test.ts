import { describe, test, expect, beforeEach } from 'vitest'
import { resetDatabase } from '@/test/dbTestUtils'
import { listActiveExercises } from './repositories/exerciseRepository'
import { ensureSeeded, SEED_EXERCISES } from './seed'

beforeEach(async () => {
  await resetDatabase()
})

describe('SEED_EXERCISES', () => {
  test('種目名が重複していない', () => {
    // Arrange
    const names = SEED_EXERCISES.map((exercise) => exercise.name)

    // Act & Assert
    expect(new Set(names).size).toBe(names.length)
  })

  test('自重種目は同時に使うダンベル数が1になっている', () => {
    const bodyweight = SEED_EXERCISES.filter((exercise) => exercise.equipment === 'bodyweight')

    expect(bodyweight.length).toBeGreaterThan(0)
    expect(bodyweight.every((exercise) => exercise.dumbbellCount === 1)).toBe(true)
  })

  test('インクラインベンチを使う主要種目が含まれている', () => {
    const names = SEED_EXERCISES.map((exercise) => exercise.name)

    expect(names).toContain('インクラインダンベルプレス')
    expect(names).toContain('インクラインダンベルフライ')
    expect(names).toContain('インクラインダンベルカール')
  })
})

describe('ensureSeeded', () => {
  test('種目が空なら初期データを投入する', async () => {
    // Act
    const seeded = await ensureSeeded()

    // Assert
    expect(seeded).toBe(true)
    expect(await listActiveExercises()).toHaveLength(SEED_EXERCISES.length)
  })

  test('既に種目があれば何もしない', async () => {
    // Arrange
    await ensureSeeded()

    // Act
    const seeded = await ensureSeeded()

    // Assert
    expect(seeded).toBe(false)
    expect(await listActiveExercises()).toHaveLength(SEED_EXERCISES.length)
  })
})
