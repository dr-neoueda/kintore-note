import { expect, test, type Page } from '@playwright/test'

/**
 * 市販品の取り込み。
 * 実際の通信はテストから行わず、応答を差し替えて画面のふるまいだけを確かめる。
 */

const PRODUCT = {
  code: '4901234567890',
  product_name: 'サラダチキン プレーン',
  brands: '7-Premium',
  nutriments: {
    'energy-kcal_100g': 114,
    proteins_100g: 24.1,
    fat_100g: 1.2,
    carbohydrates_100g: 0.3,
    salt_100g: 1.1,
  },
}

async function stubSearch(page: Page, products: unknown[]): Promise<void> {
  await page.route('**/cgi/search.pl*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: products.length, products }),
    }),
  )
}

async function openPicker(page: Page, keyword: string): Promise<void> {
  await page.goto('/meals')
  await page.getByRole('button', { name: '朝食に追加' }).click()
  await page.getByLabel('食品名で探す').fill(keyword)
}

test.describe('市販品を探す', () => {
  test('成分表に無いものを、市販品として取り込める', async ({ page }) => {
    // Arrange
    await stubSearch(page, [PRODUCT])
    await openPicker(page, 'サラダチキン')
    await expect(page.getByRole('dialog')).toContainText('該当する食品がありません')

    // Act
    await page.getByRole('button', { name: '市販品も探す（インターネット）' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('サラダチキン プレーン（7-Premium）')
    await expect(page.getByRole('dialog')).toContainText('114 kcal / 100g')

    // Act: 選ぶと量の入力へ進む
    await page.getByRole('button', { name: /サラダチキン プレーン/ }).click()
    await page.getByRole('button', { name: '100g', exact: true }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('114')

    // Act
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByTestId('total-kcal')).toHaveText('114')
  })

  test('取り込んだ市販品はマイ食品として残り、次からは通信なしで選べる', async ({ page }) => {
    // Arrange
    await stubSearch(page, [PRODUCT])
    await openPicker(page, 'サラダチキン')
    await page.getByRole('button', { name: '市販品も探す（インターネット）' }).click()
    await page.getByRole('button', { name: /サラダチキン プレーン/ }).click()
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByTestId('total-kcal')).toHaveText('114')

    // Act: 通信を遮断してから探し直す
    await page.route('**/cgi/search.pl*', (route) => route.abort())
    await page.goto('/settings/custom-foods')

    // Assert
    await expect(page.getByRole('main')).toContainText('サラダチキン プレーン（7-Premium）')
  })

  test('見つからなければその旨を出す', async ({ page }) => {
    // Arrange
    await stubSearch(page, [])
    await openPicker(page, 'ありえない食品名')

    // Act
    await page.getByRole('button', { name: '市販品も探す（インターネット）' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('見つかりませんでした')
  })

  test('繋がらなくても、記録は続けられる', async ({ page }) => {
    // Arrange: 圏外
    await page.route('**/cgi/search.pl*', (route) => route.abort())
    await openPicker(page, 'バナナ')

    // Act
    await page.getByRole('button', { name: '市販品も探す（インターネット）' }).click()

    // Assert: 成分表の結果はそのまま使える
    await expect(page.getByRole('dialog')).toContainText('見つかりませんでした')
    await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('バナナ')
  })

  test('エネルギーが無い商品は出さない', async ({ page }) => {
    // Arrange: 有志が登録するデータのため、値が欠けていることがある
    await stubSearch(page, [{ ...PRODUCT, nutriments: {} }])
    await openPicker(page, 'サラダチキン')

    // Act
    await page.getByRole('button', { name: '市販品も探す（インターネット）' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('見つかりませんでした')
  })

  test('出典を明記する', async ({ page }) => {
    // Arrange
    await stubSearch(page, [PRODUCT])
    await openPicker(page, 'サラダチキン')

    // Act
    await page.getByRole('button', { name: '市販品も探す（インターネット）' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('Open Food Facts')
  })
})

test.describe('カタカナで探す', () => {
  test('ポン酢で ぽん酢しょうゆ が出る', async ({ page }) => {
    // Arrange & Act: 成分表はひらがな表記
    await openPicker(page, 'ポン酢')

    // Assert
    await expect(page.getByRole('dialog')).toContainText('ぽん酢しょうゆ')
  })
})

test.describe('業務スーパーの商品', () => {
  test('店の名前で商品が一覧になる', async ({ page }) => {
    // Arrange & Act
    await openPicker(page, '業務スーパー')

    // Assert: 圏外でも使えるよう同梱してある
    await expect(page.getByRole('dialog')).toContainText('業務スーパー')
    await expect(
      page.getByRole('dialog').getByRole('button').filter({ hasText: 'kcal / 100g' }).first(),
    ).toBeVisible()
  })

  test('商品名で引ける', async ({ page }) => {
    // Arrange & Act
    await openPicker(page, '冷凍ブロッコリー')

    // Assert
    await expect(page.getByRole('dialog')).toContainText('冷凍ブロッコリー')
  })

  test('通信できなくても選んで記録できる', async ({ page }) => {
    // Arrange: 圏外
    await page.route('**/cgi/search.pl*', (route) => route.abort())
    await openPicker(page, '冷凍ブロッコリー')

    // Act
    await page.getByRole('dialog').getByRole('button', { name: /冷凍ブロッコリー/ }).first().click()
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('冷凍ブロッコリー')
    await expect(page.getByTestId('total-kcal')).not.toHaveText('0')
  })

  test('店の商品だと分かる印が付く', async ({ page }) => {
    // Arrange & Act
    await openPicker(page, '冷凍ブロッコリー')

    // Assert
    const row = page.getByRole('dialog').getByRole('button', { name: /冷凍ブロッコリー/ }).first()
    await expect(row).toContainText('業務スーパー')
  })
})
