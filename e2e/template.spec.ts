import { expect, test } from '@playwright/test'

/**
 * メニュー（テンプレート）の作成と、記録画面と同じ ± 形式での目標設定を確認する。
 */

test.describe('メニューの作成', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/templates')
    await expect(page.getByRole('heading', { name: 'メニュー' })).toBeVisible()
  })

  test('種目を選ぶとそのまま目標設定のシートが開く', async ({ page }) => {
    // Arrange
    await page.getByRole('link', { name: 'メニューを作る' }).click()

    // Act
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()

    // Assert: 記録画面と同じ ± ボタンが並ぶ
    const sheet = page.getByRole('dialog')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('button', { name: '目標回数を上げる' })).toBeVisible()
    await expect(sheet.getByRole('button', { name: '目標セット数を上げる' })).toBeVisible()
  })

  test('目標重量はダンベルの段階から選ぶ', async ({ page }) => {
    // Arrange
    await page.getByRole('link', { name: 'メニューを作る' }).click()
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()

    // Act: 「指定なし」を解除すると最軽量から始まり、1回上げると次の段階になる
    await page.getByRole('button', { name: '指定なし' }).click()
    await page.getByRole('button', { name: '重量を上げる' }).click()

    // Assert: 2.5 の次は 3.5（所有しているダンベルの段階）
    await expect(page.getByRole('dialog')).toContainText('3.5')
  })

  test('設定した目標が一覧に反映され、保存できる', async ({ page }) => {
    // Arrange
    await page.getByRole('link', { name: 'メニューを作る' }).click()
    await page.getByLabel('メニュー名').fill('胸の日')
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()

    // Act: 11.5kg × 8回 × 4セット にする
    await page.getByRole('button', { name: '指定なし' }).click()
    for (let i = 0; i < 8; i += 1) {
      await page.getByRole('button', { name: '重量を上げる' }).click()
    }
    await page.getByRole('button', { name: '目標回数を下げる' }).click()
    await page.getByRole('button', { name: '目標回数を下げる' }).click()
    await page.getByRole('button', { name: '目標セット数を上げる' }).click()
    await page.getByRole('button', { name: '決定' }).click()

    // Assert: 一覧に目標が表示される
    await expect(page.getByRole('main')).toContainText('11.5kg × 8回 × 4セット')

    // Act: 保存してメニュー一覧に戻る
    await page.getByRole('button', { name: '保存する' }).click()

    // Assert
    await expect(page.getByRole('heading', { name: 'メニュー' })).toBeVisible()
    await expect(page.getByRole('main')).toContainText('胸の日')
  })

  test('自重種目では重量を設定しない', async ({ page }) => {
    // Arrange
    await page.getByRole('link', { name: 'メニューを作る' }).click()

    // Act
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^プッシュアップ/ }).click()

    // Assert
    const sheet = page.getByRole('dialog')
    await expect(sheet).toContainText('自重種目のため回数とセット数のみ設定します')
    await expect(sheet.getByRole('button', { name: '指定なし' })).toHaveCount(0)
  })
})

test.describe('存在しないメニュー', () => {
  test('見つからない場合も読み込み中のまま止まらない', async ({ page }) => {
    // Arrange & Act: 削除済みや不正な URL を想定
    await page.goto('/templates/9999')

    // Assert
    await expect(page.getByRole('main')).toContainText('このメニューは見つかりませんでした')
    await expect(page.getByRole('main')).not.toContainText('読み込み中')
  })
})
