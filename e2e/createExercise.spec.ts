import { expect, test, type Page } from '@playwright/test'

/**
 * 種目を自由に追加できること、追加した種目が以後も選べることの検証。
 */

async function openPickerFromHome(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
  await page.getByRole('button', { name: '種目を追加' }).click()
}

test.describe('種目を作る', () => {
  test('種目を選ぶ画面から、その場で作れる', async ({ page }) => {
    // Arrange
    await openPickerFromHome(page)

    // Act
    await page.getByRole('button', { name: '新しい種目を作る' }).click()
    await page.getByLabel('種目名').fill('インクラインリアレイズ')
    await page.getByRole('button', { name: '肩', exact: true }).click()
    await page.getByRole('button', { name: '作成する' }).click()

    // Assert: 作った種目がそのまま今日のメニューに入る
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('main')).toContainText('インクラインリアレイズ')
  })

  test('検索して見つからないとき、その語のまま作れる', async ({ page }) => {
    // Arrange
    await openPickerFromHome(page)

    // Act
    await page.getByLabel('種目名で絞り込む').fill('ケーブルクロスオーバー')
    await expect(page.getByRole('dialog')).toContainText('該当する種目がありません')
    await page.getByRole('button', { name: '「ケーブルクロスオーバー」を作る' }).click()

    // Assert: 入力していた語が名前に入っている
    await expect(page.getByLabel('種目名')).toHaveValue('ケーブルクロスオーバー')
  })

  test('作った種目は次回以降も一覧から選べる', async ({ page }) => {
    // Arrange
    await openPickerFromHome(page)
    await page.getByRole('button', { name: '新しい種目を作る' }).click()
    await page.getByLabel('種目名').fill('自作の背中種目')
    await page.getByRole('button', { name: '背中', exact: true }).click()
    await page.getByRole('button', { name: '作成する' }).click()
    await expect(page.getByRole('main')).toContainText('自作の背中種目')

    // Act: 読み込み直してから一覧を開く
    await page.reload()
    await page.getByRole('button', { name: '種目を追加' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('自作の背中種目')
  })

  test('部位に応じた休憩時間と回数が自動で設定される', async ({ page }) => {
    // Arrange: 脚は180秒、羽状筋なので8〜12回
    await openPickerFromHome(page)
    await page.getByRole('button', { name: '新しい種目を作る' }).click()
    await page.getByLabel('種目名').fill('自作の脚種目')
    await page.getByRole('button', { name: '脚', exact: true }).click()
    await page.getByRole('button', { name: '作成する' }).click()

    // Act
    await page.getByRole('link', { name: '自作の脚種目', exact: true }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('3:00')
    await expect(page.getByRole('main')).toContainText('8〜12回 × 3セット')
  })

  test('同じ名前の種目は作れない', async ({ page }) => {
    // Arrange
    await openPickerFromHome(page)

    // Act
    await page.getByRole('button', { name: '新しい種目を作る' }).click()
    await page.getByLabel('種目名').fill('インクラインダンベルプレス')
    await page.getByRole('button', { name: '作成する' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('同じ名前の種目が既にあります')
  })

  test('名前が空だと作れない', async ({ page }) => {
    // Arrange
    await openPickerFromHome(page)

    // Act
    await page.getByRole('button', { name: '新しい種目を作る' }).click()
    await page.getByRole('button', { name: '作成する' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('種目名を入力してください')
  })

  test('設定の種目管理からも作れる', async ({ page }) => {
    // Arrange
    await page.goto('/settings/exercises')
    await expect(page.getByRole('heading', { name: '種目の管理' })).toBeVisible()

    // Act
    await page.getByRole('button', { name: '種目を作る' }).click()
    await page.getByLabel('種目名').fill('自作の体幹種目')
    await page.getByRole('button', { name: '体幹', exact: true }).click()
    await page.getByRole('button', { name: '作成する' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('main')).toContainText('自作の体幹種目')
  })
})

test.describe('作成後の修正', () => {
  test('カルテから器具と両手・片手を変更できる', async ({ page }) => {
    // Arrange: 既定はダンベル・両手に1個ずつ
    await page.goto('/exercises/1')
    await expect(page.getByRole('main')).toContainText('両手に1個ずつ')

    // Act
    await page.getByRole('button', { name: '変更' }).click()
    await page.getByRole('button', { name: '片手ずつ・両手で1個' }).click()
    await page.getByRole('button', { name: '決定' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('main')).toContainText('片手ずつ')
  })

  test('自重に変えるとダンベルの数は問われない', async ({ page }) => {
    // Arrange
    await page.goto('/exercises/1')
    await page.getByRole('button', { name: '変更' }).click()

    // Act
    await page.getByRole('button', { name: '自重', exact: true }).click()

    // Assert
    await expect(
      page.getByRole('dialog').getByText('同時に使うダンベルの数'),
    ).toHaveCount(0)
  })
})
