import { expect, test, type Page } from '@playwright/test'

/**
 * バックアップ復元まわりの回帰テスト。
 *
 * 設定を持たないバックアップを取り込むと設定レコードが消え、
 * その後の読み出しが書き込みを伴っていたために
 * 画面全体がクラッシュ（白画面）する不具合があった。
 */

/** 設定を含まないバックアップ。古い書き出しや手で作った JSON を想定する。 */
function buildBackupWithoutSettings(): string {
  return JSON.stringify({
    app: 'kintore-note',
    version: 1,
    exportedAt: '2026-08-01T00:00:00.000Z',
    data: {
      exercises: [
        {
          id: 1,
          name: 'テスト種目',
          muscleGroup: 'chest',
          equipment: 'dumbbell',
          dumbbellCount: 2,
          muscleArchitecture: 'pennate',
          target: { repsMin: 8, repsMax: 12, sets: 3 },
          restSec: 150,
          referenceUrl: null,
          isArchived: false,
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ],
      workouts: [],
      sets: [],
      templates: [],
      settings: null,
    },
  })
}

async function importBackup(page: Page, json: string): Promise<void> {
  page.on('dialog', (dialog) => void dialog.accept())

  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(json, 'utf-8'),
  })
}

test.describe('バックアップの復元', () => {
  test('設定を含まないバックアップを取り込んでも設定画面が壊れない', async ({ page }) => {
    // Arrange & Act
    await importBackup(page, buildBackupWithoutSettings())

    // Assert: 取り込み直後もその場に留まり、画面が消えない
    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()
    await expect(page.getByLabel('ダンベルの重量段階')).toBeVisible()
  })

  test('設定を含まないバックアップの後も、既定の設定が使える', async ({ page }) => {
    // Arrange
    await importBackup(page, buildBackupWithoutSettings())

    // Act: 画面を移動しても壊れないこと
    await page.getByRole('link', { name: 'ホーム' }).click()

    // Assert
    await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^テスト種目/ }).click()

    // ダンベルの段階が既定値に戻っているので、最軽量から始める提案になる
    await expect(page.getByRole('main')).toContainText('2.5kg から始めましょう')
  })

  test('取り込んだ内容が反映される', async ({ page }) => {
    // Arrange & Act
    await importBackup(page, buildBackupWithoutSettings())
    await page.goto('/settings/exercises')

    // Assert: 元の28種目が置き換わっている
    await expect(page.getByRole('main')).toContainText('テスト種目')
    await expect(page.getByRole('main')).not.toContainText('インクラインダンベルプレス')
  })
})
