import { describe, test, expect } from 'vitest'
import {
  BACKUP_APP_ID,
  BACKUP_FORMAT_VERSION,
  createBackupFile,
  isBackupOverdue,
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
