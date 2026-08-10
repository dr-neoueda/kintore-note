import { expect, test, type Page } from '@playwright/test'

/** 測り忘れた日の体組成と、身長から出す BMI。 */

async function openMeasurementSheet(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '体組成を記録' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

/**
 * 先月の15日を選ぶ。
 * 今日が何日でも過去になるので、月初に走らせても落ちない。
 */
async function selectPastDate(page: Page): Promise<void> {
  await page.getByRole('button', { name: '別の日にする' }).click()
  await page.getByRole('button', { name: '前の月' }).click()
  await page.getByRole('button', { name: /月15日/ }).click()
}

test.describe('過去の体組成', () => {
  test('はじめは今日の日付で開く', async ({ page }) => {
    // Arrange & Act
    await openMeasurementSheet(page)

    // Assert
    await expect(page.getByTestId('measurement-date')).toContainText('年')
  })

  test('別の日を選んで記録できる', async ({ page }) => {
    // Arrange
    await openMeasurementSheet(page)

    // Act
    await selectPastDate(page)
    await page.getByLabel('体重').fill('68.5')
    await page.getByRole('button', { name: '保存する' }).click()

    // Assert: 今日の体重としては出ない
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('main')).not.toContainText('68.5 kg')
  })

  test('記録済みの日を開くと、その日の値が出る', async ({ page }) => {
    // Arrange
    await openMeasurementSheet(page)
    await selectPastDate(page)
    await page.getByLabel('体重').fill('68.5')
    await page.getByRole('button', { name: '保存する' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // Act
    await openMeasurementSheet(page)
    await selectPastDate(page)

    // Assert
    await expect(page.getByLabel('体重')).toHaveValue('68.5')
  })

  test('日を移すと、その日の記録に入れ替わる', async ({ page }) => {
    // Arrange: 今日の体重を入れる
    await openMeasurementSheet(page)
    await page.getByLabel('体重').fill('70')
    await page.getByRole('button', { name: '保存する' }).click()
    await expect(page.getByRole('main')).toContainText('70 kg')

    // Act: 記録の無い日へ移す
    await openMeasurementSheet(page)
    await selectPastDate(page)

    // Assert: 今日の値を持ち込まない
    await expect(page.getByLabel('体重')).toHaveValue('')
  })
})

test.describe('身長とBMI', () => {
  test('身長を入れるとBMIが出る', async ({ page }) => {
    // Arrange
    await openMeasurementSheet(page)

    // Act: 70kg / 170cm
    await page.getByLabel('体重').fill('70')
    await page.getByLabel('身長').fill('170')

    // Assert
    await expect(page.getByTestId('measurement-bmi')).toContainText('24.2')
  })

  test('身長を入れなければBMIは出さない', async ({ page }) => {
    // Arrange & Act: 当て推量の数字は出さない
    await openMeasurementSheet(page)
    await page.getByLabel('体重').fill('70')

    // Assert
    await expect(page.getByTestId('measurement-bmi')).toHaveCount(0)
  })

  test('身長は次に開いたときも残る', async ({ page }) => {
    // Arrange
    await openMeasurementSheet(page)
    await page.getByLabel('体重').fill('70')
    await page.getByLabel('身長').fill('172')
    await page.getByRole('button', { name: '保存する' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // Act
    await page.reload()
    await page.getByRole('button', { name: '体組成を記録' }).click()

    // Assert
    await expect(page.getByLabel('身長')).toHaveValue('172')
  })
})
