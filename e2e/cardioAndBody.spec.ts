import { expect, test, type Page } from '@playwright/test'

/** ランニングの記録、体組成の記録、消費エネルギーの推定。 */

async function recordBody(page: Page, weight: string, options: {
  bodyFat?: string
  bmr?: string
} = {}): Promise<void> {
  await page.getByRole('button', { name: '体組成を記録' }).click()
  await page.getByLabel('体重').fill(weight)
  if (options.bodyFat !== undefined) await page.getByLabel('体脂肪率').fill(options.bodyFat)
  if (options.bmr !== undefined) await page.getByLabel('基礎代謝量').fill(options.bmr)
  await page.getByRole('button', { name: '保存する' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test.describe('体組成の記録', () => {
  test('体重を記録すると、ホームに出る', async ({ page }) => {
    // Arrange
    await page.goto('/')

    // Act
    await recordBody(page, '70.5')

    // Assert
    await expect(page.getByRole('main')).toContainText('70.5 kg')
  })

  test('体脂肪率を入れると除脂肪体重が出る', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await page.getByRole('button', { name: '体組成を記録' }).click()

    // Act
    await page.getByLabel('体重').fill('70')
    await page.getByLabel('体脂肪率').fill('15')

    // Assert: 70 × 0.85 = 59.5
    await expect(page.getByRole('dialog')).toContainText('59.5 kg')
  })

  test('体重は必須で、空だと保存できない', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await page.getByRole('button', { name: '体組成を記録' }).click()

    // Act
    await page.getByRole('button', { name: '保存する' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('体重は0〜500kgの範囲で入力してください')
  })

  test('同じ日に測り直すと上書きされる', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await recordBody(page, '70.0')

    // Act
    await recordBody(page, '69.5')

    // Assert
    await expect(page.getByRole('main')).toContainText('69.5 kg')
    await expect(page.getByRole('main')).not.toContainText('70 kg')
  })

  test('読み込み直しても残る', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await recordBody(page, '70.5')

    // Act
    await page.reload()

    // Assert
    await expect(page.getByRole('main')).toContainText('70.5 kg')
  })
})

test.describe('ランニングの記録', () => {
  test('距離と時間からペースと消費が出る', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await recordBody(page, '70')

    // Act: 10km を 50分
    await page.getByRole('button', { name: 'ランニングなどを記録' }).click()
    await page.getByLabel('距離').fill('10')
    await page.getByLabel('時間（分）').fill('50')

    // Assert: 5'00"/km
    await expect(page.getByTestId('cardio-pace')).toContainText('5\'00"')
    await expect(page.getByTestId('cardio-kcal')).not.toContainText('—')
  })

  test('記録するとホームに残り、消費が合計に入る', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await recordBody(page, '70')

    // Act
    await page.getByRole('button', { name: 'ランニングなどを記録' }).click()
    await page.getByLabel('距離').fill('10')
    await page.getByLabel('時間（分）').fill('50')
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('ランニング 10 km')
    await expect(page.getByTestId('active-kcal')).not.toHaveText('0')
  })

  test('体重が無ければ消費は出さない', async ({ page }) => {
    // Arrange: 体組成を記録していない
    await page.goto('/')

    // Act
    await page.getByRole('button', { name: 'ランニングなどを記録' }).click()
    await page.getByLabel('距離').fill('10')
    await page.getByLabel('時間（分）').fill('50')

    // Assert: 当て推量の数字は出さない
    await expect(page.getByTestId('cardio-kcal')).toContainText('—')
    await expect(page.getByRole('dialog')).toContainText('体組成を記録')
  })

  test('距離が空だと保存できない', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await page.getByRole('button', { name: 'ランニングなどを記録' }).click()

    // Act
    await page.getByLabel('時間（分）').fill('30')
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('距離は0より大きい数値で入力してください')
  })

  test('記録を消せる', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await page.getByRole('button', { name: 'ランニングなどを記録' }).click()
    await page.getByLabel('距離').fill('5')
    await page.getByLabel('時間（分）').fill('30')
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('ランニング 5 km')

    // Act
    await page.getByRole('button', { name: 'ランニングの記録を編集' }).click()
    await page.getByRole('button', { name: 'この記録を削除' }).click()

    // Assert
    await expect(page.getByRole('main')).not.toContainText('ランニング 5 km')
  })

  test('ウォーキングも記録できる', async ({ page }) => {
    // Arrange
    await page.goto('/')

    // Act
    await page.getByRole('button', { name: 'ランニングなどを記録' }).click()
    await page.getByRole('button', { name: 'ウォーキング' }).click()
    await page.getByLabel('距離').fill('3')
    await page.getByLabel('時間（分）').fill('40')
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('ウォーキング 3 km')
  })
})

test.describe('摂取と消費の収支', () => {
  test('基礎代謝を入れると食事タブに収支が出る', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await recordBody(page, '70', { bmr: '1600' })

    // Act
    await page.goto('/meals')

    // Assert: 何も食べていなければ 0 − 1600
    await expect(page.getByTestId('energy-balance')).toContainText('-1600')
  })

  test('基礎代謝が無ければ収支は出さない', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await recordBody(page, '70')

    // Act
    await page.goto('/meals')

    // Assert
    await expect(page.getByTestId('energy-balance')).toHaveCount(0)
  })
})
