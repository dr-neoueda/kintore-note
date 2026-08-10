import { expect, test, type Page } from '@playwright/test'

/**
 * 体幹（腹筋）の自重トレーニング。
 * 種目としての記録と、時間で記録する自重トレの両方を確かめる。
 */

async function openPicker(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
  await page.getByRole('button', { name: '種目を追加' }).click()
}

test.describe('腹筋の種目', () => {
  test('体幹の種目が選べる', async ({ page }) => {
    // Arrange & Act
    await openPicker(page)

    // Assert
    await expect(page.getByRole('dialog')).toContainText('体幹')
    await expect(page.getByRole('dialog')).toContainText('クランチ')
    await expect(page.getByRole('dialog')).toContainText('レッグレイズ')
    await expect(page.getByRole('dialog')).toContainText('プランク')
  })

  test('自重の種目は回数だけを記録する', async ({ page }) => {
    // Arrange
    await openPicker(page)
    await page.getByRole('dialog').getByRole('button', { name: /^クランチ/ }).click()

    // Act
    await page.getByRole('button', { name: 'セットを追加' }).click()

    // Assert: 重量は問われない
    await expect(page.getByRole('dialog')).toContainText('自重種目のため回数のみ記録します')
    await expect(page.getByRole('dialog').getByText('重量')).toHaveCount(0)

    // Act
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('クランチ')
  })

  test('週間セット数に体幹が並ぶ', async ({ page }) => {
    // Arrange
    await openPicker(page)
    await page.getByRole('dialog').getByRole('button', { name: /^クランチ/ }).click()
    await page.getByRole('button', { name: 'セットを追加' }).click()
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // Act
    await page.goto('/charts')

    // Assert
    await expect(page.getByRole('main')).toContainText('体幹')
  })
})

test.describe('自重の種目を作る', () => {
  test('作るときに器具を選べる', async ({ page }) => {
    // Arrange
    await page.goto('/settings/exercises')
    await page.getByRole('button', { name: '種目を作る' }).click()

    // Act
    await page.getByLabel('種目名').fill('動画の腹筋メニュー')
    await page.getByRole('button', { name: '体幹', exact: true }).click()
    await page.getByRole('button', { name: '自重', exact: true }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('自重の種目は回数だけを記録します')

    // Act
    await page.getByRole('button', { name: '作成する' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('動画の腹筋メニュー')
    await expect(page.getByRole('main')).toContainText('自重')
  })
})

test.describe('時間で記録する自重トレ', () => {
  async function recordBody(page: Page): Promise<void> {
    await page.goto('/')
    await page.getByRole('button', { name: '体組成を記録' }).click()
    await page.getByLabel('体重').fill('70')
    await page.getByRole('button', { name: '保存する' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }

  test('距離ではなく、時間と強度で消費を出す', async ({ page }) => {
    // Arrange
    await recordBody(page)

    // Act
    await page.getByRole('button', { name: 'ランニング・自重トレを記録' }).click()
    await page.getByRole('button', { name: '自重トレ', exact: true }).click()

    // Assert: 距離もペースも問われない
    await expect(page.getByRole('dialog').getByLabel('距離')).toHaveCount(0)
    await expect(page.getByTestId('cardio-pace')).toHaveCount(0)
    await expect(page.getByRole('dialog')).toContainText('強度')

    // Act: 動画に沿って10分
    await page.getByLabel('時間（分）').fill('10')

    // Assert
    await expect(page.getByTestId('cardio-kcal')).not.toContainText('—')
  })

  test('強度を上げると消費も増える', async ({ page }) => {
    // Arrange
    await recordBody(page)
    await page.getByRole('button', { name: 'ランニング・自重トレを記録' }).click()
    await page.getByRole('button', { name: '自重トレ', exact: true }).click()
    await page.getByLabel('時間（分）').fill('10')

    // Act
    await page.getByRole('button', { name: '軽め' }).click()
    const light = await page.getByTestId('cardio-kcal').textContent()
    await page.getByRole('button', { name: 'きつい' }).click()
    const vigorous = await page.getByTestId('cardio-kcal').textContent()

    // Assert
    expect(Number.parseInt(vigorous ?? '0', 10)).toBeGreaterThan(
      Number.parseInt(light ?? '0', 10),
    )
  })

  test('記録すると、時間と強度で残る', async ({ page }) => {
    // Arrange
    await recordBody(page)
    await page.getByRole('button', { name: 'ランニング・自重トレを記録' }).click()
    await page.getByRole('button', { name: '自重トレ', exact: true }).click()
    await page.getByLabel('時間（分）').fill('10')

    // Act
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert: 距離ではなく時間で出る
    await expect(page.getByRole('main')).toContainText('自重トレ 10:00')
    await expect(page.getByRole('main')).toContainText('強度 ふつう')
    await expect(page.getByTestId('active-kcal')).not.toHaveText('0')
  })
})
