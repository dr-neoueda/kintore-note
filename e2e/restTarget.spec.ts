import { expect, test, type Page } from '@playwright/test'

/**
 * セットごとの休憩の目安を検証する。
 * ウォームアップで本セットと同じ時間を待たされないことが狙い。
 */

async function openSetEditor(page: Page, namePattern: RegExp): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: namePattern }).click()
  await page.getByRole('button', { name: 'セットを追加' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

const sheet = (page: Page) => page.getByRole('dialog')

test.describe('休憩の目安', () => {
  test('種目の設定が初期値になる', async ({ page }) => {
    // Arrange & Act: 胸の既定は150秒
    await openSetEditor(page, /^インクラインダンベルプレス/)

    // Assert
    await expect(sheet(page)).toContainText('2:30')
  })

  test('ウォームアップに切り替えると短くなる', async ({ page }) => {
    // Arrange
    await openSetEditor(page, /^インクラインダンベルプレス/)

    // Act
    await page.getByRole('button', { name: 'ウォームアップ' }).click()

    // Assert: 2分半も待つ必要はない
    await expect(sheet(page)).toContainText('1:00')
  })

  test('ウォームアップを外すと種目の設定に戻る', async ({ page }) => {
    // Arrange
    await openSetEditor(page, /^インクラインダンベルプレス/)
    await page.getByRole('button', { name: 'ウォームアップ' }).click()

    // Act
    await page.getByRole('button', { name: 'ウォームアップ' }).click()

    // Assert
    await expect(sheet(page)).toContainText('2:30')
  })

  test('± ボタンで15秒ずつ調整できる', async ({ page }) => {
    // Arrange
    await openSetEditor(page, /^インクラインダンベルプレス/)

    // Act
    await page.getByRole('button', { name: '次の休憩を下げる' }).click()

    // Assert
    await expect(sheet(page)).toContainText('2:15')

    // Act
    await page.getByRole('button', { name: '次の休憩を上げる' }).click()
    await page.getByRole('button', { name: '次の休憩を上げる' }).click()

    // Assert
    await expect(sheet(page)).toContainText('2:45')
  })

  test('記録すると、その値が休憩タイマーの目安になる', async ({ page }) => {
    // Arrange
    await openSetEditor(page, /^インクラインダンベルプレス/)
    await page.getByRole('button', { name: 'ウォームアップ' }).click()

    // Act
    await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()

    // Assert: 種目の設定（2:30）ではなくウォームアップの1:00を目指す
    await expect(page.getByRole('status')).toContainText('/ 1:00')
  })

  test('読み込み直しても、記録した目安が残る', async ({ page }) => {
    // Arrange
    await openSetEditor(page, /^インクラインダンベルプレス/)
    await page.getByRole('button', { name: '次の休憩を下げる' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('/ 2:15')

    // Act
    await page.reload()

    // Assert
    await expect(page.getByRole('status')).toContainText('/ 2:15')
  })

  test('記録済みのセットを開くと、保存した目安が出る', async ({ page }) => {
    // Arrange
    await openSetEditor(page, /^インクラインダンベルプレス/)
    await page.getByRole('button', { name: 'ウォームアップ' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()

    // Act
    await page.getByRole('button', { name: '1セット目を編集' }).click()

    // Assert
    await expect(sheet(page)).toContainText('1:00')
  })

  test('次のセットは種目の設定から始まる', async ({ page }) => {
    // Arrange: 1セット目をウォームアップとして記録する
    await openSetEditor(page, /^インクラインダンベルプレス/)
    await page.getByRole('button', { name: 'ウォームアップ' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()

    // Act
    await page.getByRole('button', { name: 'セットを追加' }).click()

    // Assert: ウォームアップの1:00を引きずらない
    await expect(sheet(page)).toContainText('2:30')
  })
})
