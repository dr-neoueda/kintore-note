import { expect, test, type Page } from '@playwright/test'
import { selectDateInCalendar } from './helpers/calendar'

/**
 * 履歴の日付選択。
 * `input[type="date"]` は iOS Safari だと開いた瞬間に今日が確定してしまい、
 * 過去の日を選べなかった。自前のカレンダーに置き換えている。
 */

function pastDateKey(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const heading = (page: Page) => page.getByRole('heading', { name: /^\d{4}年\d{1,2}月$/ })

test.describe('履歴のカレンダー', () => {
  test('開いた時点では今日の月を出し、勝手に日付を選ばない', async ({ page }) => {
    // Arrange & Act
    await page.goto('/history')

    // Assert: 画面が切り替わらず、履歴のままでいる
    await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible()
    await expect(page).toHaveURL(/\/history$/)

    const today = new Date()
    await expect(heading(page)).toHaveText(`${today.getFullYear()}年${today.getMonth() + 1}月`)
  })

  test('過去の日を選ぶと、その日の記録が開く', async ({ page }) => {
    // Arrange
    await page.goto('/history')
    const target = pastDateKey(3)

    // Act
    await selectDateInCalendar(page, target)

    // Assert
    await expect(page).toHaveURL(new RegExp(`/history/${target}$`))
  })

  test('前の月にさかのぼれる', async ({ page }) => {
    // Arrange
    await page.goto('/history')
    const label = await heading(page).textContent()

    // Act
    await page.getByRole('button', { name: '前の月' }).click()

    // Assert
    await expect(heading(page)).not.toHaveText(label ?? '')
  })

  test('未来の月には進めない', async ({ page }) => {
    // Arrange & Act
    await page.goto('/history')

    // Assert: 今月を表示している間は次の月へ進めない
    await expect(page.getByRole('button', { name: '次の月' })).toBeDisabled()

    // Act
    await page.getByRole('button', { name: '前の月' }).click()

    // Assert: さかのぼれば戻れる
    await expect(page.getByRole('button', { name: '次の月' })).toBeEnabled()
  })

  test('未来の日は選べない', async ({ page }) => {
    // Arrange: 月末が今日より後になる月を選ぶため、今月を見る
    await page.goto('/history')

    const today = new Date()
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()

    // 今日が月末なら未来の日が無いので、この確認は行わない
    test.skip(today.getDate() === lastDayOfMonth, '今日が月末のため未来の日が無い')

    // Act & Assert
    const monthLabel = `${today.getFullYear()}年${today.getMonth() + 1}月`
    await expect(
      page.getByRole('button', { name: `${monthLabel}${lastDayOfMonth}日` }),
    ).toBeDisabled()
  })

  test('記録がある日には印が付く', async ({ page }) => {
    // Arrange: 今日1セット記録する
    await page.goto('/')
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()
    await page.getByRole('button', { name: 'セットを追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // Act
    await page.goto('/history')

    // Assert
    const today = new Date()
    const label = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（記録あり）`
    await expect(page.getByRole('button', { name: label })).toBeVisible()
  })
})
