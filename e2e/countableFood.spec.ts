import { expect, test, type Page } from '@playwright/test'

/** 梅干しのように「重さより個数」で数える食品の入力。 */

async function openEntry(page: Page, keyword: string, name: string): Promise<void> {
  await page.goto('/meals')
  await page.getByRole('button', { name: '朝食に追加' }).click()
  await page.getByLabel('食品名で探す').fill(keyword)
  await page.getByRole('dialog').getByRole('button', { name: `${name}を選ぶ` }).click()
}

test.describe('個数で入力する', () => {
  test('梅干しは個数で開く', async ({ page }) => {
    // Arrange & Act
    await openEntry(page, '梅干し', '梅干し（塩漬）')

    // Assert: 1個ぶんから始まる
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('1')
    await expect(page.getByTestId('amount-grams')).toHaveText('8 g')
  })

  test('個数を増やすと重さも栄養も増える', async ({ page }) => {
    // Arrange
    await openEntry(page, '梅干し', '梅干し（塩漬）')

    // Act: 3個にする
    await page.getByRole('button', { name: '3個', exact: true }).click()

    // Assert: 8g × 3 = 24g
    await expect(page.getByTestId('amount-grams')).toHaveText('24 g')
    await expect(page.getByRole('dialog')).toContainText('7kcal')
    // 塩漬は食塩18.2g/100g。3個で4g超えることが分かる
    await expect(page.getByRole('dialog')).toContainText('4.37 g')
  })

  test('g に切り替えて細かく入れられる', async ({ page }) => {
    // Arrange
    await openEntry(page, '梅干し', '梅干し（塩漬）')

    // Act
    await page.getByRole('button', { name: /単位を切り替える/ }).click()

    // Assert: 個数ぶんの重さを引き継ぐ
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('8')
    await expect(page.getByTestId('amount-grams')).toHaveCount(0)
  })

  test('個数で記録すると重さとして残る', async ({ page }) => {
    // Arrange
    await openEntry(page, '梅干し', '梅干し（塩漬）')

    // Act
    await page.getByRole('button', { name: '2個', exact: true }).click()
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('16 g')
  })

  test('ごはんは g のまま、茶碗1杯から始まる', async ({ page }) => {
    // Arrange & Act: 茶碗で量るものを「3個」とは数えない
    await openEntry(page, 'ごはん', 'ごはん（白米・炊いた）')

    // Assert: 既定の100gではなく、分量の先頭（茶碗軽く1杯）から始まる
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('150')
    await expect(page.getByTestId('amount-grams')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /単位を切り替える/ })).toHaveCount(0)
  })
})

test.describe('茹でた鶏むね肉', () => {
  test('皮なし・ゆでを選べる', async ({ page }) => {
    // Arrange & Act
    await openEntry(page, '鶏むねゆで', '鶏むね肉（皮なし・ゆで）')

    // Assert: 生（105kcal/100g）より濃い
    await page.getByRole('button', { name: '100g', exact: true }).click()
    await expect(page.getByRole('dialog')).toContainText('129')
  })

  test('見積もりであることを断っている', async ({ page }) => {
    // Arrange & Act
    await openEntry(page, '鶏むねゆで', '鶏むね肉（皮なし・ゆで）')

    // Assert
    await expect(page.getByRole('dialog')).toContainText('成分表に「むね・ゆで」は無い')
  })
})
