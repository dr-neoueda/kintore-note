import { expect, test, type Page } from '@playwright/test'

/** 前回入れた量から始める。毎回同じ量を打ち直さずに済むようにする。 */

async function addBanana(page: Page): Promise<void> {
  await page.getByRole('button', { name: '朝食に追加' }).click()
  await page.getByLabel('食品名で探す').fill('バナナ')
  await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
}

/** 1食30gのマイ食品を作る。ソイプロテインのように少量で摂るもの。 */
async function createProtein(page: Page): Promise<void> {
  await page.goto('/settings/custom-foods')
  await page.getByRole('button', { name: 'マイ食品を作る' }).click()
  await page.getByLabel('食品名').fill('ソイプロテイン')
  await page.getByLabel('栄養成分表示の基準量').fill('30')
  await page.getByLabel('エネルギー').fill('120')
  await page.getByRole('button', { name: '作成する' }).click()
  await expect(page.getByRole('main')).toContainText('ソイプロテイン')
}

/** マイ食品の行は aria-label を持たないので、表示テキストで引く。 */
async function selectProteinRow(page: Page): Promise<void> {
  await page
    .getByRole('dialog')
    .getByRole('button')
    .filter({ hasText: 'ソイプロテイン' })
    .first()
    .click()
}

async function openProtein(page: Page): Promise<void> {
  await page.goto('/meals')
  await page.getByRole('button', { name: '朝食に追加' }).click()
  await page.getByLabel('食品名で探す').fill('ソイプロテイン')
  await selectProteinRow(page)
}

test.describe('前回の量から始める', () => {
  test('一度記録すると、次は同じ量で開く', async ({ page }) => {
    // Arrange: 20g で記録する
    await createProtein(page)
    await openProtein(page)
    await page.getByRole('spinbutton', { name: '量' }).fill('20')
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('20 g')

    // Act: もう一度同じ食品を選ぶ
    await openProtein(page)

    // Assert: 100g ではなく 20g から始まる
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('20')
  })

  test('記録が無ければ既定の100gから始める', async ({ page }) => {
    // Arrange & Act
    await createProtein(page)
    await openProtein(page)

    // Assert
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('100')
  })

  test('いちばん新しい記録の量を使う', async ({ page }) => {
    // Arrange
    await createProtein(page)
    await openProtein(page)
    await page.getByRole('spinbutton', { name: '量' }).fill('20')
    await page.getByRole('button', { name: '記録する' }).click()

    await expect(page.getByRole('main')).toContainText('20 g')

    // Act: 40g で入れ直す
    await openProtein(page)
    await page.getByRole('spinbutton', { name: '量' }).fill('40')
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('40 g')
    await openProtein(page)

    // Assert
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('40')
  })

  test('別の食品の量は持ち込まない', async ({ page }) => {
    // Arrange: プロテインを20gで記録する
    await createProtein(page)
    await openProtein(page)
    await page.getByRole('spinbutton', { name: '量' }).fill('20')
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('20 g')

    // Act: バナナを開く
    await addBanana(page)

    // Assert: バナナは1本90gのまま
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('1')
    await expect(page.getByTestId('amount-grams')).toHaveText('90 g')
  })

  test('個数で数える食品も、前回の個数で開く', async ({ page }) => {
    // Arrange: 梅干しを3個で記録する
    await page.goto('/meals')
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('梅干し')
    await page.getByRole('dialog').getByRole('button', { name: '梅干し（塩漬）を選ぶ' }).click()
    await page.getByRole('button', { name: '3個', exact: true }).click()
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('24 g')

    // Act
    await page.getByRole('button', { name: '昼食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('梅干し')
    await page.getByRole('dialog').getByRole('button', { name: '梅干し（塩漬）を選ぶ' }).click()

    // Assert: 1個ではなく3個から始まる
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('3')
    await expect(page.getByTestId('amount-grams')).toHaveText('24 g')
  })

  test('前の日に記録した量も引き継ぐ', async ({ page }) => {
    // Arrange: 前の日に20gで記録する
    await createProtein(page)
    await page.goto('/meals')
    await page.getByRole('button', { name: '前の日' }).click()
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('ソイプロテイン')
    await selectProteinRow(page)
    await page.getByRole('spinbutton', { name: '量' }).fill('20')
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('20 g')

    // Act: 今日に戻って開く
    await page.getByRole('button', { name: '今日に戻る' }).click()
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('ソイプロテイン')
    await selectProteinRow(page)

    // Assert
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('20')
  })
})

test.describe('日付の表示', () => {
  test('過去の日を見ているときは、その日付を出す', async ({ page }) => {
    // Arrange
    await page.goto('/meals')

    // Act
    await page.getByRole('button', { name: '前の日' }).click()

    // Assert: 「今日」のままにしない
    const dateButton = page.getByRole('button', { name: '今日に戻る' })
    await expect(dateButton).toBeVisible()
    await expect(dateButton).not.toHaveText('今日')
    await expect(dateButton).toContainText('月')
  })

  test('今日を見ているときは「今日」と出す', async ({ page }) => {
    // Arrange & Act
    await page.goto('/meals')

    // Assert
    await expect(page.getByRole('button', { name: '今日', exact: true })).toBeDisabled()
  })

  test('日付を押すと今日に戻る', async ({ page }) => {
    // Arrange
    await page.goto('/meals')
    await page.getByRole('button', { name: '前の日' }).click()

    // Act
    await page.getByRole('button', { name: '今日に戻る' }).click()

    // Assert
    await expect(page.getByRole('button', { name: '今日', exact: true })).toBeDisabled()
  })
})
