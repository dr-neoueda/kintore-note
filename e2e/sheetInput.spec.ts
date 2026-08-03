import { expect, test, type Page } from '@playwright/test'

/**
 * シートに入力した内容が、背後の再描画で失われないことの検証。
 *
 * ホーム画面は休憩タイマーのために毎秒再描画される。
 * シートの初期値が描画のたびに作り直されると、入力中の内容が上書きされてしまう。
 */

async function recordOneSet(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()
  await page.getByRole('button', { name: 'セットを追加' }).last().click()
  await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test.describe('シートの入力', () => {
  test('休憩タイマーが動いていてもメモの入力が消えない', async ({ page }) => {
    // Arrange: セットを記録すると休憩タイマーが動き出す
    await recordOneSet(page)
    await expect(page.getByRole('status')).toContainText('休憩')

    // Act
    await page.getByRole('button', { name: /体重・メモを記録する/ }).click()
    await page.getByRole('textbox', { name: 'メモ', exact: true }).fill('肘の角度を意識した')
    await page.getByRole('spinbutton', { name: '体重（kg）' }).fill('68.4')

    // タイマーが2回以上進むまで待つ
    await page.waitForTimeout(2500)

    // Assert
    await expect(page.getByRole('textbox', { name: 'メモ', exact: true })).toHaveValue('肘の角度を意識した')
    await expect(page.getByRole('spinbutton', { name: '体重（kg）' })).toHaveValue('68.4')
  })

  test('入力したメモと体重を保存できる', async ({ page }) => {
    // Arrange
    await recordOneSet(page)

    // Act
    await page.getByRole('button', { name: /体重・メモを記録する/ }).click()
    await page.getByRole('textbox', { name: 'メモ', exact: true }).fill('調子が良い')
    await page.getByRole('spinbutton', { name: '体重（kg）' }).fill('68.4')
    await page.waitForTimeout(2500)
    await page.getByRole('button', { name: '保存する' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByRole('main')).toContainText('調子が良い')
    await expect(page.getByRole('main')).toContainText('68.4')
  })

  test('種目の設定シートでも入力が消えない', async ({ page }) => {
    // Arrange
    await page.goto('/exercises/1')
    await page.getByRole('button', { name: '変更' }).click()

    // Act
    await page.getByLabel('フォームの参考リンク').fill('https://example.com/form')
    await page.waitForTimeout(1500)

    // Assert
    await expect(page.getByLabel('フォームの参考リンク')).toHaveValue(
      'https://example.com/form',
    )
  })
})

test.describe('保存される値', () => {
  test('ダンベルの段階を変えても、既存セットの重量は勝手に変わらない', async ({ page }) => {
    // Arrange: 2.5kg で1セット記録する
    await recordOneSet(page)

    // 段階から 2.5 を外す
    await page.goto('/settings')
    await page.getByLabel('ダンベルの重量段階').fill('5, 10, 15')
    await page.getByRole('button', { name: '段階を保存' }).click()
    await expect(page.getByRole('main')).toContainText('段階を保存しました')

    // Act: 回数だけ直して保存する
    await page.goto('/')
    await page.getByRole('button', { name: '1セット目を編集' }).click()
    await page.getByRole('button', { name: '回数を上げる' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '更新する' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // Assert: 画面に出ていた 2.5kg のまま保存される
    await expect(page.getByRole('button', { name: '1セット目を編集' })).toContainText('2.5 kg')
  })

  test('休憩時間を空にしたまま保存できない', async ({ page }) => {
    // Arrange
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()

    // Act
    await page.getByLabel('胸', { exact: true }).fill('')
    await page.getByRole('button', { name: '休憩時間を保存' }).click()

    // Assert: 0秒として保存されると、その部位のアラームが鳴らなくなる
    await expect(page.getByRole('main')).toContainText('0以上の秒数で入力してください')
  })
})
