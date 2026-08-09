import { expect, test, type Page } from '@playwright/test'
import { waitForPersisted } from './helpers/persistence'

/** その日の消費エネルギーが、どこで見えるか。 */

async function recordBody(page: Page, weight: string, bmr?: string): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '体組成を記録' }).click()
  await page.getByLabel('体重').fill(weight)
  if (bmr !== undefined) await page.getByLabel('基礎代謝量').fill(bmr)
  await page.getByRole('button', { name: '保存する' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function recordCardio(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'ランニングなどを記録' }).click()
  await page.getByLabel('距離').fill('5')
  await page.getByLabel('時間（分）').fill('30')
  await page.getByRole('button', { name: '記録する' }).click()
  await expect(page.getByRole('main')).toContainText('ランニング 5 km')
}

async function recordOneSet(page: Page): Promise<void> {
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()
  await page.getByRole('button', { name: 'セットを追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

function todayKey(): string {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${day}`
}

test.describe('履歴の詳細に、その日の消費が出る', () => {
  test('筋トレと有酸素を合わせた消費を出す', async ({ page }) => {
    // Arrange
    await recordBody(page, '70')
    await recordOneSet(page)
    await recordCardio(page)

    // Act
    await page.goto(`/history/${todayKey()}`)

    // Assert
    await expect(page.getByTestId('active-kcal')).toBeVisible()
    await expect(page.getByTestId('active-kcal')).not.toHaveText('0')
    await expect(page.getByRole('main')).toContainText('kcal')
  })

  test('体重を測っていなければ出さない', async ({ page }) => {
    // Arrange: 体重が無いと計算できないため、当て推量の数字は出さない
    await page.goto('/')
    await recordOneSet(page)

    // Act
    await page.goto(`/history/${todayKey()}`)

    // Assert
    await expect(page.getByTestId('active-kcal')).toHaveCount(0)
  })
})

test.describe('グラフに摂取と消費が並ぶ', () => {
  async function recordMeal(page: Page): Promise<void> {
    await page.goto('/meals')
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('白米')
    await page.getByRole('button', { name: 'ごはん（白米・炊いた）を選ぶ' }).click()
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('ごはん（白米・炊いた）')
    // 書き込みが確定する前に移ると、グラフが空のままになる
    await waitForPersisted(page, 'meals', 1)
  }

  test('基礎代謝を測っていれば、消費の線と平均の収支が出る', async ({ page }) => {
    // Arrange
    await recordBody(page, '70', '1600')
    await recordCardio(page)
    await recordMeal(page)

    // Act
    await page.goto('/meals/charts')

    // Assert
    await expect(page.getByRole('main')).toContainText('摂取と消費の推移')
    await expect(page.getByRole('main')).toContainText('折れ線は消費')
    await expect(page.getByTestId('average-balance')).toBeVisible()
  })

  test('基礎代謝が無ければ、収支は出さない', async ({ page }) => {
    // Arrange: 基礎代謝まで推定すると誤差の上に誤差を重ねる
    await recordBody(page, '70')
    await recordMeal(page)

    // Act
    await page.goto('/meals/charts')

    // Assert
    await expect(page.getByTestId('average-balance')).toHaveCount(0)
  })

  test('体組成を測っていなければ、摂取だけを出す', async ({ page }) => {
    // Arrange
    await recordMeal(page)

    // Act
    await page.goto('/meals/charts')

    // Assert
    await expect(page.getByRole('main')).toContainText('エネルギーの推移')
    await expect(page.getByRole('main')).not.toContainText('折れ線は消費')
  })
})
