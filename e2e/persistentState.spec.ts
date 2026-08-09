import { expect, test, type Page } from '@playwright/test'

/**
 * 画面を移っても消えてはいけないもの。
 * - メニューから選んだ種目（まだ1セットも記録していない）
 * - 休憩タイマー
 */

const tabbar = (page: Page) => page.getByRole('navigation', { name: 'メインナビゲーション' })

async function createTemplate(page: Page, name: string): Promise<void> {
  await page.goto('/templates/new')
  await page.getByLabel('メニュー名').fill(name)
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()
  await page.getByRole('button', { name: '決定' }).click()
  await page.getByRole('button', { name: '保存する' }).click()
  await expect(page.getByRole('main')).toContainText(name)
}

async function recordOneSet(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()
  await page.getByRole('button', { name: 'セットを追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test.describe('選んだ種目が消えない', () => {
  test('メニューを選んだあと、履歴やグラフを見て戻っても残る', async ({ page }) => {
    // Arrange
    await createTemplate(page, '胸の日')
    await page.goto('/')
    await page.getByRole('button', { name: '胸の日' }).click()
    await expect(page.getByRole('main')).toContainText('インクラインダンベルプレス')

    // Act: 記録する前に他のタブを見に行く
    await tabbar(page).getByRole('link', { name: '履歴' }).click()
    await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible()
    await tabbar(page).getByRole('link', { name: 'グラフ' }).click()
    await tabbar(page).getByRole('link', { name: 'ホーム' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('インクラインダンベルプレス')
  })

  test('食事の系統に移って戻っても残る', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^サイドレイズ/ }).click()
    await expect(page.getByRole('main')).toContainText('サイドレイズ')

    // Act
    await page.getByRole('button', { name: '食事へ切り替える' }).click()
    await expect(page.getByRole('heading', { name: '食事' })).toBeVisible()
    await page.getByRole('button', { name: '運動へ切り替える' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('サイドレイズ')
  })

  test('読み込み直しても残る', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^サイドレイズ/ }).click()
    await expect(page.getByRole('main')).toContainText('サイドレイズ')

    // Act
    await page.reload()

    // Assert
    await expect(page.getByRole('main')).toContainText('サイドレイズ')
  })

  test('外した種目は戻ってこない', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^サイドレイズ/ }).click()
    await expect(page.getByRole('main')).toContainText('サイドレイズ')

    // Act
    await page.getByRole('button', { name: 'サイドレイズを今日のメニューから外す' }).click()
    await tabbar(page).getByRole('link', { name: '履歴' }).click()
    await tabbar(page).getByRole('link', { name: 'ホーム' }).click()

    // Assert
    await expect(page.getByRole('main')).not.toContainText('サイドレイズ')
  })
})

test.describe('休憩タイマーが画面をまたぐ', () => {
  test('履歴やグラフに移っても出たままになる', async ({ page }) => {
    // Arrange
    await recordOneSet(page)
    await expect(page.getByRole('status')).toContainText('休憩')

    // Act & Assert
    await tabbar(page).getByRole('link', { name: '履歴' }).click()
    await expect(page.getByRole('status')).toContainText('休憩')

    await tabbar(page).getByRole('link', { name: 'グラフ' }).click()
    await expect(page.getByRole('status')).toContainText('休憩')
  })

  test('食事の系統でも出たままになる', async ({ page }) => {
    // Arrange
    await recordOneSet(page)
    await expect(page.getByRole('status')).toContainText('休憩')

    // Act
    await page.getByRole('button', { name: '食事へ切り替える' }).click()
    await expect(page.getByRole('heading', { name: '食事' })).toBeVisible()

    // Assert
    await expect(page.getByRole('status')).toContainText('休憩')
  })

  test('設定画面でも出たままになる', async ({ page }) => {
    // Arrange
    await recordOneSet(page)

    // Act
    await tabbar(page).getByRole('link', { name: '設定' }).click()

    // Assert
    await expect(page.getByRole('status')).toContainText('休憩')
  })

  test('閉じると消え、次のセットを記録すると出直す', async ({ page }) => {
    // Arrange
    await recordOneSet(page)
    await expect(page.getByRole('status')).toContainText('休憩')

    // Act
    await page.getByRole('button', { name: '休憩タイマーを閉じる' }).click()

    // Assert
    await expect(page.getByRole('status')).toHaveCount(0)

    // Act: 2セット目を記録する
    await page.getByRole('button', { name: 'セットを追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()

    // Assert
    await expect(page.getByRole('status')).toContainText('休憩')
  })

  test('閉じたあと他の画面へ移っても、閉じたままになる', async ({ page }) => {
    // Arrange
    await recordOneSet(page)
    await page.getByRole('button', { name: '休憩タイマーを閉じる' }).click()
    await expect(page.getByRole('status')).toHaveCount(0)

    // Act
    await tabbar(page).getByRole('link', { name: '履歴' }).click()

    // Assert
    await expect(page.getByRole('status')).toHaveCount(0)
  })
})
