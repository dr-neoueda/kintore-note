import { expect, test } from '@playwright/test'

/** アラームを鳴らす長さの設定。 */

test.describe('アラームの長さ', () => {
  test('音がオンのときだけ長さを選べる', async ({ page }) => {
    // Arrange
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: '音で知らせる：オン' })).toBeVisible()

    // Assert
    await expect(page.getByRole('main')).toContainText('鳴らす長さ')

    // Act: 音を切る
    await page.getByRole('button', { name: '音で知らせる：オン' }).click()

    // Assert: 鳴らさないなら長さも問わない
    await expect(page.getByRole('main')).not.toContainText('鳴らす長さ')
  })

  test('既定は標準になっている', async ({ page }) => {
    // Arrange & Act
    await page.goto('/settings')

    // Assert
    await expect(page.getByRole('button', { name: /標準/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('長さを選ぶと保存される', async ({ page }) => {
    // Arrange
    await page.goto('/settings')

    // Act
    await page.getByRole('button', { name: /とても長い/ }).click()

    // Assert
    await expect(page.getByRole('button', { name: /とても長い/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    // Act
    await page.reload()

    // Assert: 読み込み直しても残る
    await expect(page.getByRole('button', { name: /とても長い/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('button', { name: /標準/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  test('試しに鳴らすボタンがある', async ({ page }) => {
    // Arrange & Act: 音は自動再生できないため、押せることだけを確かめる
    await page.goto('/settings')

    // Assert
    await expect(page.getByRole('button', { name: '今の長さで鳴らす' })).toBeVisible()
    await page.getByRole('button', { name: '今の長さで鳴らす' }).click()
    await expect(page.getByRole('main')).toContainText('鳴らす長さ')
  })
})
