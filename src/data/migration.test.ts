import Dexie from 'dexie'
import { describe, test, expect, afterEach } from 'vitest'
import { KintoreDatabase } from './db'
import { PARALLEL_TARGET, PENNATE_TARGET } from '@/domain/muscle'

/**
 * 既存データベースの移行経路を検証する。
 *
 * 通常のテストは毎回まっさらな DB を作るため、Dexie は最新スキーマで作成し
 * upgrade 関数を一度も通らない。実機で壊れるのはまさにこの経路なので、
 * 古いスキーマの DB を作ってから開き直して確認する。
 */

const TEST_DATABASE_NAME = 'kintore-note-migration-test'

/** v1 当時のスキーマ。 */
const V1_STORES = {
  exercises: '++id, &name, muscleGroup',
  workouts: '++id, &date',
  sets: '++id, workoutId, exerciseId, [workoutId+order], [exerciseId+recordedAt]',
  templates: '++id, order',
  settings: 'id',
}

async function createLegacyDatabase(
  exercises: readonly Record<string, unknown>[],
  sets: readonly Record<string, unknown>[] = [],
): Promise<void> {
  const legacy = new Dexie(TEST_DATABASE_NAME)
  legacy.version(1).stores(V1_STORES)
  await legacy.open()
  await legacy.table('exercises').bulkAdd([...exercises])
  if (sets.length > 0) await legacy.table('sets').bulkAdd([...sets])
  legacy.close()
}

async function openUpgraded(): Promise<KintoreDatabase> {
  const upgraded = new KintoreDatabase(TEST_DATABASE_NAME)
  await upgraded.open()
  return upgraded
}

afterEach(async () => {
  await Dexie.delete(TEST_DATABASE_NAME)
})

const legacyExercise = (overrides: Record<string, unknown> = {}) => ({
  name: 'ダンベルカール',
  muscleGroup: 'arms',
  equipment: 'dumbbell',
  dumbbellCount: 2,
  isArchived: false,
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
})

describe('v1 のデータベースを現在のスキーマへ移行する', () => {
  test('種目に筋構造・目標・休憩・参照リンクが埋まる', async () => {
    // Arrange
    await createLegacyDatabase([legacyExercise()])

    // Act
    const db = await openUpgraded()
    const exercise = await db.exercises.get(1)
    db.close()

    // Assert: 上腕二頭筋は平行筋なので 10〜15回、腕の休憩は90秒
    expect(exercise?.muscleArchitecture).toBe('parallel')
    expect(exercise?.target).toEqual(PARALLEL_TARGET)
    expect(exercise?.restSec).toBe(90)
    expect(exercise?.referenceUrl).toBeNull()
  })

  test('同じ部位でも種目名に応じて筋構造を分ける', async () => {
    // Arrange: 腕の中で二頭（平行筋）と三頭（羽状筋）
    await createLegacyDatabase([
      legacyExercise({ name: 'ダンベルカール' }),
      legacyExercise({ name: 'トライセプスキックバック' }),
    ])

    // Act
    const db = await openUpgraded()
    const exercises = await db.exercises.orderBy('id').toArray()
    db.close()

    // Assert
    expect(exercises[0]?.muscleArchitecture).toBe('parallel')
    expect(exercises[1]?.muscleArchitecture).toBe('pennate')
    expect(exercises[1]?.target).toEqual(PENNATE_TARGET)
  })

  test('既知でない種目は部位の既定に従う', async () => {
    // Arrange
    await createLegacyDatabase([
      legacyExercise({ name: '自作の肩種目', muscleGroup: 'shoulders' }),
    ])

    // Act
    const db = await openUpgraded()
    const exercise = await db.exercises.get(1)
    db.close()

    // Assert: 肩（三角筋）は羽状筋、休憩は120秒
    expect(exercise?.muscleArchitecture).toBe('pennate')
    expect(exercise?.restSec).toBe(120)
  })

  test('利用者が変更した目標は上書きしない', async () => {
    // Arrange: v2 の既定（8〜12回×3セット）ではない値を持つレコード
    const customTarget = { repsMin: 5, repsMax: 8, sets: 5 }
    await createLegacyDatabase([legacyExercise({ target: customTarget })])

    // Act
    const db = await openUpgraded()
    const exercise = await db.exercises.get(1)
    db.close()

    // Assert
    expect(exercise?.target).toEqual(customTarget)
  })

  test('v2 の既定のままの目標は筋構造別の値に置き換える', async () => {
    // Arrange: v2 で一律に入れていた 8〜12回×3セット
    await createLegacyDatabase([
      legacyExercise({ target: { repsMin: 8, repsMax: 12, sets: 3 } }),
    ])

    // Act
    const db = await openUpgraded()
    const exercise = await db.exercises.get(1)
    db.close()

    // Assert: 平行筋の既定へ
    expect(exercise?.target).toEqual(PARALLEL_TARGET)
  })

  test('移行後も既存の記録が残っている', async () => {
    // Arrange
    await createLegacyDatabase([legacyExercise(), legacyExercise({ name: 'サイドレイズ' })])

    // Act
    const db = await openUpgraded()
    const count = await db.exercises.count()
    db.close()

    // Assert
    expect(count).toBe(2)
  })

  test('休憩の目安を持たないセットは null のまま残す', async () => {
    // Arrange: v5 より前に記録したセット。種目の設定で補うため、ここでは埋めない
    await createLegacyDatabase(
      [legacyExercise()],
      [
        {
          workoutId: 1,
          exerciseId: 1,
          order: 1,
          weightKg: 11.5,
          reps: 10,
          rpe: null,
          restSec: null,
          isWarmup: false,
          recordedAt: '2026-07-01T10:00:00.000Z',
        },
      ],
    )

    // Act
    const db = await openUpgraded()
    const set = await db.sets.get(1)
    db.close()

    // Assert
    expect(set?.restTargetSec).toBeNull()
    expect(set?.weightKg).toBe(11.5)
  })
})
