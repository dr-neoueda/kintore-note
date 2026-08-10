import { expect, test, type Page } from '@playwright/test'

/**
 * 有酸素運動しかしていない日の扱い。
 * 走っただけの日はワークアウトが作られないため、履歴から抜け落ちていた。
 */

function todayLabel(): string {
  const today = new Date()
  return `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
}

async function recordCardio(page: Page, distanceKm: string): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'ランニング・自重トレを記録' }).click()
  await page.getByLabel('距離').fill(distanceKm)
  await page.getByLabel('時間（分）').fill('30')
  await page.getByRole('button', { name: '記録する' }).click()
  await expect(page.getByRole('main')).toContainText(`ランニング ${distanceKm} km`)
}

async function recordOneSet(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()
  await page.getByRole('button', { name: 'セットを追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test.describe('有酸素運動だけの日', () => {
  test('カレンダーに記録ありの印が付く', async ({ page }) => {
    // Arrange
    await recordCardio(page, '5')

    // Act
    await page.goto('/history')

    // Assert: 筋トレした日と同じように塗られる
    await expect(
      page.getByRole('button', { name: `${todayLabel()}（記録あり）` }),
    ).toBeVisible()
  })

  test('履歴の一覧にも出る', async ({ page }) => {
    // Arrange
    await recordCardio(page, '5')

    // Act
    await page.goto('/history')

    // Assert
    await expect(page.getByRole('main')).toContainText('ランニング 5km')
    await expect(page.getByRole('main')).toContainText('5 km')
    await expect(page.getByRole('main')).toContainText('有酸素')
  })

  test('一覧からその日を開ける', async ({ page }) => {
    // Arrange
    await recordCardio(page, '5')
    await page.goto('/history')

    // Act
    await page.getByRole('main').getByRole('link').first().click()

    // Assert
    await expect(page.getByRole('main')).toContainText('ランニング 5 km')
  })

  test('記録の無い日には印が付かない', async ({ page }) => {
    // Arrange & Act
    await page.goto('/history')

    // Assert
    await expect(page.getByRole('button', { name: `${todayLabel()}（記録あり）` })).toHaveCount(0)
  })
})

test.describe('筋トレと有酸素の両方をした日', () => {
  test('1日にまとめて出る', async ({ page }) => {
    // Arrange
    await recordOneSet(page)
    await recordCardio(page, '3')

    // Act
    await page.goto('/history')

    // Assert: 同じ日が2行に分かれない
    await expect(page.getByRole('main')).toContainText('インクラインダンベルプレス')
    await expect(page.getByRole('main')).toContainText('ランニング 3km')
    await expect(page.getByRole('main').getByRole('link')).toHaveCount(1)
  })

  test('筋トレがあれば、セット数と種目数を出す', async ({ page }) => {
    // Arrange
    await recordOneSet(page)
    await recordCardio(page, '3')

    // Act
    await page.goto('/history')

    // Assert
    await expect(page.getByRole('main')).toContainText('1 セット')
    await expect(page.getByRole('main')).toContainText('1 種目')
  })
})
