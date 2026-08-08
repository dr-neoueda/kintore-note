import { expect, test } from '@playwright/test'

/** 鍛えていない部位（体幹）を画面から外していることの確認。 */

test.describe('画面に出す部位', () => {
  test('週間セット数に体幹の行が無い', async ({ page }) => {
    // Arrange & Act
    await page.goto('/charts')
    await expect(page.getByText('今週の部位別セット数')).toBeVisible()

    // Assert
    await expect(page.getByRole('main')).toContainText('胸')
    await expect(page.getByRole('main')).not.toContainText('体幹')
  })

  test('種目を作るときの部位に体幹が無い', async ({ page }) => {
    // Arrange
    await page.goto('/settings/exercises')

    // Act
    await page.getByRole('button', { name: '種目を作る' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('脚')
    await expect(page.getByRole('dialog').getByRole('button', { name: '体幹' })).toHaveCount(0)
  })

  test('種目を選ぶ一覧に体幹の区分が無い', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()

    // Act
    await page.getByRole('button', { name: '種目を追加' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('胸')
    await expect(page.getByRole('dialog')).not.toContainText('体幹')
  })

  test('体幹の種目は初期投入しない', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await page.getByRole('button', { name: '種目を追加' }).click()

    // Act
    await page.getByLabel('種目名で絞り込む').fill('プランク')

    // Assert
    await expect(page.getByRole('dialog')).toContainText('該当する種目がありません')
  })

  test('休憩時間の設定に体幹が無い', async ({ page }) => {
    // Arrange & Act
    await page.goto('/settings')

    // Assert
    await expect(page.getByRole('main')).toContainText('部位ごとの休憩時間')
    await expect(page.getByRole('main')).not.toContainText('体幹')
  })
})
