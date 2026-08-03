import { expect, test, type Page } from '@playwright/test'

/**
 * 記録し忘れた日を後から入力できることの検証。
 */

/** 今日から指定日数前の 'YYYY-MM-DD'。 */
function pastDateKey(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * 記録の書き込みが画面に反映されるまで待つ。
 * 待たずに次の画面へ移ると、保存が完了する前に遷移してしまうことがある。
 */
async function submitSetAndWait(page: Page, expectedSetCount: number): Promise<void> {
  await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // 種目が複数あると同名のボタンが並ぶため、いま記録した種目（末尾）に絞る
  await expect(
    page
      .locator('section')
      .last()
      .getByRole('button', { name: `${expectedSetCount}セット目を編集` }),
  ).toBeVisible()
}

async function addExerciseAndRecordSet(page: Page, namePattern: RegExp): Promise<void> {
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: namePattern }).click()
  // 追加した種目は末尾に並ぶ。種目が複数あるときのために last() で選ぶ
  await page.getByRole('button', { name: 'セットを追加' }).last().click()
  await submitSetAndWait(page, 1)
}

test.describe('過去の日付の記録', () => {
  test('履歴から日付を選んで、その日の記録を作れる', async ({ page }) => {
    // Arrange
    const targetDate = pastDateKey(3)
    await page.goto('/history')
    await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible()

    // Act
    await page.getByLabel('記録し忘れた日を入力する').fill(targetDate)
    await expect(page.getByRole('main')).toContainText(
      'この日の記録はまだありません',
    )
    await addExerciseAndRecordSet(page, /^インクラインダンベルプレス/)

    // Assert
    await expect(page.getByRole('button', { name: '1セット目を編集' })).toBeVisible()
  })

  test('作った過去の記録が履歴一覧に並ぶ', async ({ page }) => {
    // Arrange
    await page.goto('/history')
    await page.getByLabel('記録し忘れた日を入力する').fill(pastDateKey(3))
    await addExerciseAndRecordSet(page, /^サイドレイズ/)

    // Act
    await page.getByRole('link', { name: '履歴' }).click()

    // Assert
    await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible()
    await expect(page.getByRole('main')).toContainText('サイドレイズ')
  })

  test('既存の記録にセットを追加できる', async ({ page }) => {
    // Arrange: まず今日1セット記録する
    await page.goto('/')
    await addExerciseAndRecordSet(page, /^インクラインダンベルプレス/)

    // Act: 履歴からその日を開いてセットを足す
    await page.getByRole('link', { name: '履歴' }).click()
    // 遷移を待たずに探すと、ホームに残っている同名のリンクに当たってしまう
    await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible()
    await page.getByRole('link', { name: /インクラインダンベルプレス/ }).click()
    await page.getByRole('button', { name: 'セットを追加' }).last().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Assert: 編集ではなく追加になっている（以前は最後のセットを編集してしまっていた）
    await submitSetAndWait(page, 2)
    await expect(page.getByRole('button', { name: '2セット目を編集' })).toBeVisible()
  })

  test('過去の日付でも前回の記録として扱われる順序が保たれる', async ({ page }) => {
    // Arrange: 5日前に 2.5kg、3日前に 3.5kg を記録する
    await page.goto('/history')
    await page.getByLabel('記録し忘れた日を入力する').fill(pastDateKey(5))
    await addExerciseAndRecordSet(page, /^インクラインダンベルプレス/)

    await page.goto('/history')
    await page.getByLabel('記録し忘れた日を入力する').fill(pastDateKey(3))
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()
    await page.getByRole('button', { name: 'セットを追加' }).last().click()
    await page.getByRole('button', { name: '重量を上げる' }).click()
    await submitSetAndWait(page, 1)
    // Act: 今日の画面で前回の記録を見る
    await page.goto('/')
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()

    // Assert: より新しい3日前（3.5kg）が前回として出る
    await expect(page.getByRole('main')).toContainText('前回： 3.5kg')
  })
})

test.describe('バックアップの督促', () => {
  test('記録が無いうちはホームに出さない', async ({ page }) => {
    // Arrange & Act
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()

    // Assert
    await expect(page.getByRole('main')).not.toContainText('バックアップを書き出しましょう')
  })

  test('記録があり未書き出しならホームに出す', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await addExerciseAndRecordSet(page, /^インクラインダンベルプレス/)

    // Assert
    await expect(page.getByRole('main')).toContainText('バックアップを書き出しましょう')
  })

  test('督促から設定画面へ移動できる', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await addExerciseAndRecordSet(page, /^インクラインダンベルプレス/)

    // Act
    await page.getByRole('link', { name: /バックアップを書き出しましょう/ }).click()

    // Assert
    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()
  })
})

test.describe('週あたりの部位別セット数', () => {
  test('記録した部位のセット数が今週として集計される', async ({ page }) => {
    // Arrange: 胸を2セット、肩を1セット
    await page.goto('/')
    await addExerciseAndRecordSet(page, /^インクラインダンベルプレス/)
    await page.getByRole('button', { name: 'セットを追加' }).last().click()
    await submitSetAndWait(page, 2)
    await addExerciseAndRecordSet(page, /^サイドレイズ/)

    // Act
    await page.getByRole('link', { name: 'グラフ' }).click()

    // Assert
    const card = page.getByRole('main').locator('section').first()
    await expect(card).toContainText('今週の部位別セット数')
    await expect(card.getByText('胸', { exact: true }).locator('..')).toContainText('2')
    await expect(card.getByText('肩', { exact: true }).locator('..')).toContainText('1')
  })

  test('記録が無くても部位の一覧は表示される', async ({ page }) => {
    // Arrange & Act: 何が足りていないかを見るため、0でも並べる
    await page.goto('/charts')

    // Assert
    await expect(page.getByRole('main')).toContainText('今週の部位別セット数')
    await expect(page.getByRole('main')).toContainText('背中')
  })
})
