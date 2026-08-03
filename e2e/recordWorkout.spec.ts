import { expect, test, type Page } from '@playwright/test'

/**
 * 記録の主要フローを実機と同じ画面幅で確認する。
 * 種目名は前方一致で選ぶ（一覧のボタンには「両手」などの補足が付くため）。
 */

async function addExercise(page: Page, namePattern: RegExp): Promise<void> {
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: namePattern }).click()
}

async function recordSet(page: Page): Promise<void> {
  await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()
}

test.describe('筋トレの記録', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
  })

  test('種目を追加してセットを記録できる', async ({ page }) => {
    // Arrange
    await addExercise(page, /^インクラインダンベルプレス/)

    // Act
    await page.getByRole('button', { name: 'セットを追加' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: '重量を上げる' }).click()
    await recordSet(page)

    // Assert: 最軽量の 2.5kg から1段階上がって 3.5kg、回数は目標の下限8回で記録される
    const firstSet = page.getByRole('button', { name: '1セット目を編集' })
    await expect(firstSet).toContainText('3.5 kg')
    await expect(firstSet).toContainText('8')
  })

  test('その日の種目数とセット数を集計する', async ({ page }) => {
    // Arrange
    await addExercise(page, /^インクラインダンベルプレス/)

    // Act
    await page.getByRole('button', { name: 'セットを追加' }).click()
    await recordSet(page)

    // Assert
    await expect(page.getByTestId('exercise-count')).toHaveText('1')
    await expect(page.getByTestId('set-count')).toHaveText('1')
  })

  test('追加しただけの種目は数えず、記録した種目だけを数える', async ({ page }) => {
    // Arrange: 2種目を追加し、片方だけ記録する
    await addExercise(page, /^インクラインダンベルプレス/)
    await addExercise(page, /^ワンハンドダンベルロウ/)

    // Act
    await page.getByRole('button', { name: 'セットを追加' }).first().click()
    await recordSet(page)

    // Assert
    await expect(page.getByTestId('exercise-count')).toHaveText('1')

    // Act: もう片方も記録する
    await page.getByRole('button', { name: 'セットを追加' }).last().click()
    await recordSet(page)

    // Assert
    await expect(page.getByTestId('exercise-count')).toHaveText('2')
    await expect(page.getByTestId('set-count')).toHaveText('2')
  })

  test('筋の構造によって既定の回数レンジが変わる', async ({ page }) => {
    // Arrange: 羽状筋の胸種目は 8〜12回、平行筋の背中種目は 10〜15回 が既定
    await addExercise(page, /^インクラインダンベルプレス/)

    // Act
    await page.getByRole('button', { name: 'セットを追加' }).click()

    // Assert: 羽状筋なので下限8回から始まる
    await expect(page.getByRole('dialog')).toContainText('8')
    await page.getByRole('dialog').getByRole('button', { name: '閉じる' }).click()

    // Act: 平行筋の種目を追加する
    await addExercise(page, /^ワンハンドダンベルロウ/)
    await page.getByRole('button', { name: 'セットを追加' }).last().click()

    // Assert: 平行筋なので下限10回から始まる
    await expect(page.getByRole('dialog')).toContainText('10')
  })

  test('2セット目の初期値に直前のセットが引き継がれる', async ({ page }) => {
    // Arrange
    await addExercise(page, /^サイドレイズ/)
    await page.getByRole('button', { name: 'セットを追加' }).click()
    await page.getByRole('button', { name: '重量を上げる' }).click()
    await page.getByRole('button', { name: '重量を上げる' }).click()
    await recordSet(page)

    // Act
    await page.getByRole('button', { name: 'セットを追加' }).click()

    // Assert: 4.5kg が初期値として入っている
    await expect(page.getByRole('dialog')).toContainText('4.5')
  })

  test('記録後に休憩タイマーが表示される', async ({ page }) => {
    // Arrange
    await addExercise(page, /^サイドレイズ/)

    // Act
    await page.getByRole('button', { name: 'セットを追加' }).click()
    await recordSet(page)

    // Assert
    await expect(page.getByRole('status')).toContainText('休憩')
  })

  test('休憩タイマーの表示中でもセット追加ボタンを押せる', async ({ page }) => {
    // Arrange: 画面下部に固定表示されるタイマーがボタンを覆わないことの回帰テスト
    await addExercise(page, /^サイドレイズ/)
    await page.getByRole('button', { name: 'セットを追加' }).click()
    await recordSet(page)
    await expect(page.getByRole('status')).toBeVisible()

    // Act: タイマーに覆われているとここでタイムアウトする
    await page.getByRole('button', { name: 'セットを追加' }).click({ timeout: 5_000 })

    // Assert
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('記録した内容が履歴に反映される', async ({ page }) => {
    // Arrange
    await addExercise(page, /^ダンベルカール/)
    await page.getByRole('button', { name: 'セットを追加' }).click()
    await recordSet(page)

    // Act
    await page.getByRole('link', { name: '履歴' }).click()

    // Assert
    await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible()
    await expect(page.getByRole('main')).toContainText('ダンベルカール')
  })

  test('自重種目では重量ではなく回数だけを記録する', async ({ page }) => {
    // Arrange
    await addExercise(page, /^プッシュアップ/)

    // Act
    await page.getByRole('button', { name: 'セットを追加' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('自重種目のため回数のみ記録します')
    await expect(page.getByRole('button', { name: '重量を上げる' })).toHaveCount(0)
  })
})

test.describe('画面の遷移', () => {
  test('タブから各画面へ移動できる', async ({ page }) => {
    // Arrange
    await page.goto('/')

    // Act & Assert
    await page.getByRole('link', { name: 'グラフ' }).click()
    await expect(page.getByRole('heading', { name: 'グラフ' })).toBeVisible()

    await page.getByRole('link', { name: 'メニュー' }).click()
    await expect(page.getByRole('heading', { name: 'メニュー' })).toBeVisible()

    await page.getByRole('link', { name: '設定' }).click()
    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()
  })

  test('設定に所有しているダンベルの段階が入っている', async ({ page }) => {
    // Arrange
    await page.goto('/settings')

    // Assert: 段階の上下端が初期値として入っている
    const stepsInput = page.getByLabel('ダンベルの重量段階')
    await expect(stepsInput).toHaveValue(/2\.5/)
    await expect(stepsInput).toHaveValue(/24/)
  })
})
