import { expect, test, type Page } from '@playwright/test'

/**
 * バックアップの書き出し。
 *
 * 実物の FileSystemFileHandle はネイティブのダイアログからしか得られず、
 * 差し替えたハンドルは IndexedDB に保存できない（関数を含むため）。
 * そのため「保存先を覚えて次回は選ばずに済む」ところまでは自動で確かめられない。
 * ここでは書き出しの本体と、失敗時のふるまいを固める。
 */

/** 保存先の選択を差し替える。書き込まれた内容を控えておく。 */
async function stubSaveFilePicker(page: Page, fileName: string): Promise<void> {
  await page.addInitScript((name) => {
    const chunks: string[] = []
    ;(window as unknown as Record<string, unknown>).__backupWrites = chunks
    ;(window as unknown as Record<string, unknown>).showSaveFilePicker = () =>
      Promise.resolve({
        name,
        createWritable: () =>
          Promise.resolve({
            write: (data: string) => {
              chunks.push(data)
              return Promise.resolve()
            },
            close: () => Promise.resolve(),
          }),
        queryPermission: () => Promise.resolve('granted'),
        requestPermission: () => Promise.resolve('granted'),
      })
  }, fileName)
}

async function readWrites(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __backupWrites: string[] }).__backupWrites ?? [],
  )
}

test.describe('バックアップの書き出し', () => {
  test('選んだ保存先に書き出せる', async ({ page }) => {
    // Arrange
    await stubSaveFilePicker(page, 'my-backup.json')
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'バックアップ' })).toBeVisible()

    // Act
    await page.getByRole('button', { name: 'バックアップを書き出す' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('書き出しました')
    expect(await readWrites(page)).toHaveLength(1)
  })

  test('書き出した中身が取り込める形になっている', async ({ page }) => {
    // Arrange
    await stubSaveFilePicker(page, 'my-backup.json')
    await page.goto('/settings')

    // Act
    await page.getByRole('button', { name: 'バックアップを書き出す' }).click()
    await expect(page.getByRole('main')).toContainText('書き出しました')

    // Assert
    const [written] = await readWrites(page)
    const parsed = JSON.parse(written ?? '{}')
    expect(parsed.app).toBe('kintore-note')
    expect(Array.isArray(parsed.data.exercises)).toBe(true)
    expect(Array.isArray(parsed.data.meals)).toBe(true)
    expect(Array.isArray(parsed.data.measurements)).toBe(true)
  })

  test('最終バックアップの日時が記録される', async ({ page }) => {
    // Arrange
    await stubSaveFilePicker(page, 'my-backup.json')
    await page.goto('/settings')
    await expect(page.getByRole('main')).toContainText('最終バックアップ： まだありません')

    // Act
    await page.getByRole('button', { name: 'バックアップを書き出す' }).click()

    // Assert
    await expect(page.getByRole('main')).not.toContainText('最終バックアップ： まだありません')
  })

  test('保存先の選択を取り消しても、失敗として扱わない', async ({ page }) => {
    // Arrange
    await page.addInitScript(() => {
      ;(window as unknown as Record<string, unknown>).showSaveFilePicker = () =>
        Promise.reject(new DOMException('canceled', 'AbortError'))
    })
    await page.goto('/settings')

    // Act
    await page.getByRole('button', { name: 'バックアップを書き出す' }).click()

    // Assert
    await expect(page.getByRole('main')).not.toContainText('書き出せませんでした')
    await expect(page.getByRole('main')).toContainText('最終バックアップ： まだありません')
  })

  test('保存先を覚えられなくても、書き出しは成功として扱う', async ({ page }) => {
    // Arrange: 差し替えたハンドルは保存できない（関数を含むため）
    await stubSaveFilePicker(page, 'my-backup.json')
    await page.goto('/settings')

    // Act
    await page.getByRole('button', { name: 'バックアップを書き出す' }).click()
    await expect(page.getByRole('main')).toContainText('書き出しました')

    // Assert: 書き込みは済んでいるので、失敗にはしない
    expect(await readWrites(page)).toHaveLength(1)
    await expect(page.getByRole('main')).not.toContainText('書き出せませんでした')
  })

  test('保存先を選ぶ API が無ければ、ダウンロードで書き出す', async ({ page }) => {
    // Arrange: Safari など
    await page.addInitScript(() => {
      delete (window as unknown as Record<string, unknown>).showSaveFilePicker
      Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true })
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    })
    await page.goto('/settings')

    // Act
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'バックアップを書き出す' }).click()

    // Assert
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^kintore-note-\d{4}-\d{2}-\d{2}\.json$/)
  })

  test('共有できる環境では、共有ボタンも出す', async ({ page }) => {
    // Arrange: 共有シートを差し替える
    await page.addInitScript(() => {
      const shared: string[] = []
      ;(window as unknown as Record<string, unknown>).__shared = shared
      Object.defineProperty(navigator, 'share', {
        value: (data: { files?: File[] }) => {
          shared.push(data.files?.[0]?.name ?? '')
          return Promise.resolve()
        },
        configurable: true,
      })
    })
    await page.goto('/settings')

    // Act
    const shareButton = page.getByRole('button', { name: '共有して保存（Google Drive など）' })
    await expect(shareButton).toBeEnabled()
    await shareButton.click()

    // Assert
    await expect(page.getByRole('main')).toContainText('バックアップを書き出しました')
    const shared = await page.evaluate(
      () => (window as unknown as { __shared: string[] }).__shared ?? [],
    )
    expect(shared[0]).toMatch(/^kintore-note-\d{4}-\d{2}-\d{2}\.json$/)
  })

  test('共有を断られたら、ダウンロードに落とす', async ({ page }) => {
    // Arrange: iOS は操作から離れた共有を断る
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        value: () => Promise.reject(new DOMException('denied', 'NotAllowedError')),
        configurable: true,
      })
    })
    await page.goto('/settings')

    // Act
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: '共有して保存（Google Drive など）' }).click()

    // Assert: 書き出せないままにはしない
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^kintore-note-\d{4}-\d{2}-\d{2}\.json$/)
  })

  test('共有できない環境では、共有ボタンを出さない', async ({ page }) => {
    // Arrange
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    })
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'バックアップ' })).toBeVisible()

    // Assert
    await expect(
      page.getByRole('button', { name: '共有して保存（Google Drive など）' }),
    ).toHaveCount(0)
  })
})

test.describe('古いバックアップの復元', () => {
  /** v8 より前の形。体重はワークアウトに載っていて、食事の項目そのものが無い。 */
  const OLD_BACKUP = {
    app: 'kintore-note',
    version: 1,
    exportedAt: '2026-07-20T10:00:00.000Z',
    data: {
      exercises: [
        {
          id: 1,
          name: 'インクラインダンベルプレス',
          muscleGroup: 'chest',
          equipment: 'dumbbell',
          dumbbellCount: 2,
          isArchived: false,
          createdAt: '2026-07-01T00:00:00.000Z',
        },
      ],
      workouts: [
        {
          id: 1,
          date: '2026-07-20',
          note: '旧バージョンの記録',
          bodyWeightKg: 68.4,
          startedAt: '2026-07-20T10:00:00.000Z',
          finishedAt: null,
        },
      ],
      sets: [
        {
          id: 1,
          workoutId: 1,
          exerciseId: 1,
          order: 1,
          weightKg: 11.5,
          reps: 10,
          rpe: 8,
          restSec: 90,
          isWarmup: false,
          recordedAt: '2026-07-20T10:05:00.000Z',
        },
      ],
      templates: [{ id: 1, name: '胸の日', note: '', order: 1, items: [] }],
      settings: { id: 1, dumbbellStepsKg: [2.5, 5, 10], lastBackupAt: null, backupReminderDays: 7 },
    },
  }

  async function restoreOldBackup(page: Page): Promise<void> {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'バックアップ' })).toBeVisible()

    page.once('dialog', (dialog) => void dialog.accept())
    await page.setInputFiles('input[type=file]', {
      name: 'old.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(OLD_BACKUP)),
    })
    await expect(page.getByRole('main')).toContainText('読み込みました')
  }

  test('記録が取り込める', async ({ page }) => {
    // Arrange & Act
    await restoreOldBackup(page)

    // Assert
    await page.goto('/history/2026-07-20')
    await expect(page.getByRole('main')).toContainText('11.5')
    await expect(page.getByRole('main')).toContainText('旧バージョンの記録')
  })

  test('ワークアウトに載っていた体重が、体組成として残る', async ({ page }) => {
    // Arrange & Act
    await restoreOldBackup(page)

    // Assert: 移さないとアプリが読む先に何も入らず、体重が消えたように見える
    await page.goto('/history/2026-07-20')
    await expect(page.getByRole('main')).toContainText('68.4')
  })

  test('食事の項目が無くても、食事タブが開ける', async ({ page }) => {
    // Arrange & Act
    await restoreOldBackup(page)

    // Assert
    await page.goto('/meals')
    await expect(page.getByRole('heading', { name: '食事' })).toBeVisible()
    await expect(page.getByTestId('total-kcal')).toHaveText('0')
  })
})
