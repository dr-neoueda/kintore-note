import { expect, test, type Page } from '@playwright/test'
import { waitForPersisted } from './helpers/persistence'

/**
 * 体組成を測っていない日は、直近の記録を当てはめる。
 * 毎日測るとは限らないので、測らなかった日だけ収支が出ないと使いものにならない。
 */

/** 何日か前の日付を、カレンダーから選べる形で返す。 */
function pastDate(offsetDays: number): Date {
  const target = new Date()
  target.setDate(target.getDate() - offsetDays)
  return target
}

async function selectDate(page: Page, target: Date): Promise<void> {
  const today = new Date()
  const monthsBack =
    (today.getFullYear() - target.getFullYear()) * 12 + (today.getMonth() - target.getMonth())

  await page.getByRole('button', { name: '別の日にする' }).click()
  for (let i = 0; i < monthsBack; i += 1) {
    await page.getByRole('button', { name: '前の月' }).click()
  }

  const label = `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日`
  await page.getByRole('button', { name: new RegExp(`^${label}`) }).click()
}

async function recordBodyOn(
  page: Page,
  offsetDays: number,
  weight: string,
  bmr: string,
): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '体組成を記録' }).click()
  if (offsetDays > 0) await selectDate(page, pastDate(offsetDays))
  await page.getByLabel('体重').fill(weight)
  await page.getByLabel('基礎代謝量').fill(bmr)
  await page.getByRole('button', { name: '保存する' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function recordBananaToday(page: Page): Promise<void> {
  await page.goto('/meals')
  await page.getByRole('button', { name: '朝食に追加' }).click()
  await page.getByLabel('食品名で探す').fill('バナナ')
  await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
  await page.getByRole('button', { name: '記録する' }).click()
}

test.describe('測っていない日の体組成', () => {
  test('食事タブの収支に、直近の基礎代謝を使う', async ({ page }) => {
    // Arrange: 2日前に測り、今日は測っていない
    await recordBodyOn(page, 2, '70', '1600')

    // Act
    await recordBananaToday(page)

    // Assert: バナナ84 − 1600 = −1516
    await expect(page.getByTestId('energy-balance')).toContainText('-1516')
  })

  test('今日測り直せば、その値を使う', async ({ page }) => {
    // Arrange
    await recordBodyOn(page, 2, '70', '1600')
    await recordBodyOn(page, 0, '69', '1500')

    // Act
    await recordBananaToday(page)

    // Assert: 84 − 1500 = −1416
    await expect(page.getByTestId('energy-balance')).toContainText('-1416')
  })

  test('一度も測っていなければ収支は出さない', async ({ page }) => {
    // Arrange & Act: 当て推量の数字は出さない
    await recordBananaToday(page)

    // Assert
    await expect(page.getByTestId('energy-balance')).toHaveCount(0)
  })

  test('グラフの収支にも、測っていない日を含める', async ({ page }) => {
    // Arrange: 2日前に測り、今日食べた
    await recordBodyOn(page, 2, '70', '1600')
    await recordBananaToday(page)

    // Act: 書き込みが確定してからグラフへ移る
    await waitForPersisted(page, 'meals', 1)
    await page.goto('/meals/charts')

    // Assert: 今日は測っていないが、収支の対象になる
    await expect(page.getByTestId('fat-estimate')).toContainText('-1516')
  })

  test('ホームには、その日に測った値だけを出す', async ({ page }) => {
    // Arrange: 2日前だけ測った
    await recordBodyOn(page, 2, '70', '1600')

    // Act
    await page.goto('/')

    // Assert: 今日はまだ測っていないと分かるようにする
    await expect(page.getByRole('button', { name: '体組成を記録' })).toBeVisible()
    await expect(page.getByRole('main')).not.toContainText('70 kg')
  })
})
