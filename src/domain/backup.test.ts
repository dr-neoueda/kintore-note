import { describe, test, expect } from 'vitest'
import {
  BACKUP_APP_ID,
  BACKUP_FORMAT_VERSION,
  createBackupFile,
  isBackupOverdue,
  normalizeBackupData,
  parseBackup,
  serializeBackup,
  type BackupData,
} from './backup'
import { ValidationError } from './validation'

const emptyData: BackupData = {
  exercises: [],
  workouts: [],
  sets: [],
  templates: [],
  meals: [],
  customFoods: [],
  mealTemplates: [],
  measurements: [],
  cardioSessions: [],
  settings: null,
}

describe('createBackupFile', () => {
  test('アプリ識別子・形式バージョン・書き出し日時を含める', () => {
    // Act
    const file = createBackupFile(emptyData, '2026-08-02T10:00:00.000Z')

    // Assert
    expect(file.app).toBe(BACKUP_APP_ID)
    expect(file.version).toBe(BACKUP_FORMAT_VERSION)
    expect(file.exportedAt).toBe('2026-08-02T10:00:00.000Z')
  })
})

describe('serializeBackup / parseBackup', () => {
  test('書き出した内容をそのまま読み戻せる', () => {
    // Arrange
    const file = createBackupFile(
      {
        ...emptyData,
        workouts: [
          {
            id: 1,
            date: '2026-08-02',
            note: 'テスト',
            bodyWeightKg: 68.4,
            startedAt: '2026-08-02T10:00:00.000Z',
            finishedAt: null,
          },
        ],
      },
      '2026-08-02T10:00:00.000Z',
    )

    // Act
    const restored = parseBackup(serializeBackup(file))

    // Assert
    expect(restored.data.workouts).toHaveLength(1)
    expect(restored.data.workouts[0]?.date).toBe('2026-08-02')
  })
})

describe('parseBackup', () => {
  test('JSON として壊れていれば弾く', () => {
    expect(() => parseBackup('{壊れた')).toThrow(ValidationError)
  })

  test('別のアプリのファイルは弾く', () => {
    // Arrange
    const json = JSON.stringify({ app: 'other-app', version: 1, exportedAt: '', data: emptyData })

    // Act & Assert
    expect(() => parseBackup(json)).toThrow(ValidationError)
  })

  test('対応していない新しい形式バージョンは弾く', () => {
    const json = JSON.stringify({
      app: BACKUP_APP_ID,
      version: BACKUP_FORMAT_VERSION + 1,
      exportedAt: '',
      data: emptyData,
    })

    expect(() => parseBackup(json)).toThrow(ValidationError)
  })

  test('必要なテーブルが欠けていれば弾く', () => {
    const json = JSON.stringify({
      app: BACKUP_APP_ID,
      version: BACKUP_FORMAT_VERSION,
      exportedAt: '',
      data: { exercises: [], workouts: [] },
    })

    expect(() => parseBackup(json)).toThrow(ValidationError)
  })

  test('data が配列以外を含んでいれば弾く', () => {
    const json = JSON.stringify({
      app: BACKUP_APP_ID,
      version: BACKUP_FORMAT_VERSION,
      exportedAt: '',
      data: { ...emptyData, sets: 'not-an-array' },
    })

    expect(() => parseBackup(json)).toThrow(ValidationError)
  })

  test('空のバックアップも受け付ける', () => {
    const json = serializeBackup(createBackupFile(emptyData, '2026-08-02T10:00:00.000Z'))

    expect(parseBackup(json).data.sets).toEqual([])
  })
})

describe('isBackupOverdue', () => {
  const now = Date.parse('2026-08-02T10:00:00.000Z')

  test('一度もバックアップしていなければ期限切れとみなす', () => {
    expect(isBackupOverdue(null, 14, now)).toBe(true)
  })

  test('指定日数を超えていなければ期限切れではない', () => {
    // Arrange: 3日前
    const lastBackupAt = '2026-07-30T10:00:00.000Z'

    // Act & Assert
    expect(isBackupOverdue(lastBackupAt, 14, now)).toBe(false)
  })

  test('指定日数を超えていれば期限切れとみなす', () => {
    // Arrange: 20日前
    const lastBackupAt = '2026-07-13T10:00:00.000Z'

    expect(isBackupOverdue(lastBackupAt, 14, now)).toBe(true)
  })

  test('日時が壊れていれば期限切れとみなす', () => {
    expect(isBackupOverdue('こわれた', 14, now)).toBe(true)
  })
})

describe('normalizeBackupData', () => {
  const legacyExercise = {
    id: 1,
    name: 'ダンベルカール',
    muscleGroup: 'arms',
    equipment: 'dumbbell',
    dumbbellCount: 2,
    isArchived: false,
    createdAt: '2026-07-01T00:00:00.000Z',
  }

  test('種目に欠けている項目を既定値で補う', () => {
    // Act
    const normalized = normalizeBackupData({
      ...emptyData,
      exercises: [legacyExercise as never],
    })

    // Assert: 上腕二頭筋は平行筋なので 10〜15回、腕の休憩は90秒
    const exercise = normalized.exercises[0]
    expect(exercise?.muscleArchitecture).toBe('parallel')
    expect(exercise?.target).toEqual({ repsMin: 10, repsMax: 15, sets: 3 })
    expect(exercise?.restSec).toBe(90)
    expect(exercise?.referenceUrl).toBeNull()
  })

  test('既に入っている値は上書きしない', () => {
    // Arrange
    const custom = {
      ...legacyExercise,
      muscleArchitecture: 'pennate',
      target: { repsMin: 5, repsMax: 8, sets: 5 },
      restSec: 240,
      referenceUrl: 'https://example.com/form',
    }

    // Act
    const exercise = normalizeBackupData({
      ...emptyData,
      exercises: [custom as never],
    }).exercises[0]

    // Assert
    expect(exercise?.target).toEqual({ repsMin: 5, repsMax: 8, sets: 5 })
    expect(exercise?.restSec).toBe(240)
    expect(exercise?.referenceUrl).toBe('https://example.com/form')
  })

  test('知らない部位はその他として扱う', () => {
    // Arrange: 手で編集されたファイルなどを想定
    const broken = { ...legacyExercise, muscleGroup: 'unknown-group' }

    // Act
    const exercise = normalizeBackupData({
      ...emptyData,
      exercises: [broken as never],
    }).exercises[0]

    // Assert
    expect(exercise?.muscleGroup).toBe('other')
    expect(exercise?.restSec).toBeGreaterThan(0)
  })

  test('セットに欠けている項目を補う', () => {
    // Arrange
    const legacySet = {
      id: 1,
      workoutId: 1,
      exerciseId: 1,
      order: 1,
      weightKg: 10,
      reps: 10,
      recordedAt: '2026-08-02T10:00:00.000Z',
    }

    // Act
    const set = normalizeBackupData({ ...emptyData, sets: [legacySet as never] }).sets[0]

    // Assert
    expect(set?.isWarmup).toBe(false)
    expect(set?.rpe).toBeNull()
    expect(set?.restSec).toBeNull()
  })

  test('ワークアウトとテンプレートに欠けている項目を補う', () => {
    // Act
    const normalized = normalizeBackupData({
      ...emptyData,
      workouts: [{ id: 1, date: '2026-08-02', startedAt: '' } as never],
      templates: [{ id: 1, name: '胸の日', order: 1 } as never],
    })

    // Assert
    expect(normalized.workouts[0]?.note).toBe('')
    expect(normalized.workouts[0]?.bodyWeightKg).toBeNull()
    expect(normalized.workouts[0]?.finishedAt).toBeNull()
    expect(normalized.templates[0]?.items).toEqual([])
    expect(normalized.templates[0]?.note).toBe('')
  })

  test('parseBackup は正規化済みのデータを返す', () => {
    // Arrange
    const json = JSON.stringify({
      app: BACKUP_APP_ID,
      version: BACKUP_FORMAT_VERSION,
      exportedAt: '',
      data: { ...emptyData, exercises: [legacyExercise] },
    })

    // Act & Assert: 取り込み前に整えるので、後段が欠けた値を触らずに済む
    expect(parseBackup(json).data.exercises[0]?.restSec).toBe(90)
  })
})

describe('古いバックアップの取り込み', () => {
  const oldWorkout = {
    id: 1,
    date: '2026-07-20',
    note: '',
    bodyWeightKg: 68.4,
    startedAt: '2026-07-20T10:00:00.000Z',
    finishedAt: null,
  }

  const oldData = {
    exercises: [],
    workouts: [oldWorkout],
    sets: [],
    templates: [],
    settings: null,
  } as unknown as Parameters<typeof normalizeBackupData>[0]

  test('ワークアウトに載っていた体重を体組成へ移す', () => {
    // Arrange & Act: v8 より前は体重をワークアウトに持っていた
    const normalized = normalizeBackupData(oldData)

    // Assert: 移さないと、アプリが読む先に何も入らず記録が消えたように見える
    expect(normalized.measurements).toHaveLength(1)
    expect(normalized.measurements[0]?.date).toBe('2026-07-20')
    expect(normalized.measurements[0]?.weightKg).toBe(68.4)
  })

  test('同じ日の体組成が既にあれば、上書きしない', () => {
    // Arrange
    const withMeasurement = {
      ...oldData,
      measurements: [
        {
          date: '2026-07-20',
          weightKg: 70,
          bodyFatPercent: 15,
          muscleMassKg: null,
          visceralFatLevel: null,
          basalMetabolicRateKcal: null,
          recordedAt: '2026-07-20T07:00:00.000Z',
        },
      ],
    } as unknown as Parameters<typeof normalizeBackupData>[0]

    // Act
    const normalized = normalizeBackupData(withMeasurement)

    // Assert: 体脂肪率まで入っている方を残す
    expect(normalized.measurements).toHaveLength(1)
    expect(normalized.measurements[0]?.weightKg).toBe(70)
  })

  test('体重が無いワークアウトからは作らない', () => {
    const withoutWeight = {
      ...oldData,
      workouts: [{ ...oldWorkout, bodyWeightKg: null }],
    } as unknown as Parameters<typeof normalizeBackupData>[0]

    expect(normalizeBackupData(withoutWeight).measurements).toEqual([])
  })

  test('食事の項目を持たないバックアップでも空で埋まる', () => {
    const normalized = normalizeBackupData(oldData)

    expect(normalized.meals).toEqual([])
    expect(normalized.customFoods).toEqual([])
    expect(normalized.mealTemplates).toEqual([])
    expect(normalized.cardioSessions).toEqual([])
  })

  test('献立から、使わなくなった「入れる区分」を落とす', () => {
    // Arrange
    const withMealType = {
      ...oldData,
      mealTemplates: [{ id: 1, name: 'いつもの朝食', mealType: 'breakfast', order: 1, items: [] }],
    } as unknown as Parameters<typeof normalizeBackupData>[0]

    // Act
    const [template] = normalizeBackupData(withMealType).mealTemplates

    // Assert
    expect(template?.name).toBe('いつもの朝食')
    expect('mealType' in (template ?? {})).toBe(false)
  })
})
