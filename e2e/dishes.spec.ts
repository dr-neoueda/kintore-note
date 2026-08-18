import { expect, test, type Page } from '@playwright/test'

/** 外食で食べた料理を、料理名で記録する。 */

async function pickDish(page: Page, keyword: string, name: string): Promise<void> {
  await page.goto('/meals')
  await page.getByRole('button', { name: '昼食に追加' }).click()
  await page.getByLabel('食品名で探す').fill(keyword)
  await page.getByRole('dialog').getByRole('button').filter({ hasText: name }).first().click()
}

test.describe('料理名で記録する', () => {
  test('料理名で探して、1食分から始まる', async ({ page }) => {
    // Arrange & Act: 牛丼の並盛は377g
    await pickDish(page, '牛丼', '牛丼')

    // Assert: 100g ではなく1食分から始まる
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('377')
  })

  test('1食分のエネルギーが出る', async ({ page }) => {
    // Arrange & Act
    await pickDish(page, '牛丼', '牛丼')

    // Assert: 実際の店の並盛（600〜750kcal）に近い
    await expect(page.getByRole('dialog')).toContainText('682')
  })

  test('大盛のボタンで量を変えられる', async ({ page }) => {
    // Arrange
    await pickDish(page, '牛丼', '牛丼')

    // Act
    await page.getByRole('button', { name: /^大盛/ }).click()

    // Assert
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('450')
  })

  test('目安であることと根拠を出す', async ({ page }) => {
    // Arrange & Act: 成分表そのままの値と混ぜない
    await pickDish(page, '牛丼', '牛丼')

    // Assert
    await expect(page.getByRole('dialog')).toContainText('目安')
    await expect(page.getByRole('dialog')).toContainText('店によって倍近く違う')
  })

  test('記録すると合計に入る', async ({ page }) => {
    // Arrange
    await pickDish(page, 'ラーメン', 'ラーメン（醤油・スープを飲む）')

    // Act
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('ラーメン')
    await expect(page.getByTestId('total-kcal')).not.toHaveText('0')
  })

  test('一覧で料理だと分かる', async ({ page }) => {
    // Arrange & Act
    await page.goto('/meals')
    await page.getByRole('button', { name: '昼食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('カツ丼')

    // Assert
    await expect(page.getByRole('dialog')).toContainText('目安')
  })

  test('外食の定番が一通り引ける', async ({ page }) => {
    // Arrange
    await page.goto('/meals')
    await page.getByRole('button', { name: '昼食に追加' }).click()

    // Act & Assert
    for (const keyword of ['ラーメン', 'カツ丼', '寿司', 'ハンバーガー', '唐揚げ定食']) {
      await page.getByLabel('食品名で探す').fill(keyword)
      await expect(page.getByRole('dialog')).not.toContainText('該当する食品がありません')
    }
  })

  test('漢字の「炒飯」でチャーハンが引ける', async ({ page }) => {
    // Arrange: 成分表の表記は「チャーハン」
    await page.goto('/meals')
    await page.getByRole('button', { name: '昼食に追加' }).click()

    // Act
    await page.getByLabel('食品名で探す').fill('炒飯')

    // Assert
    await expect(page.getByRole('dialog')).toContainText('チャーハン')
  })
})
