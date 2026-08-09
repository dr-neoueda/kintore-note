import { expect, type Page } from '@playwright/test'

/**
 * 履歴のカレンダーから日付を選ぶ。
 * 前の月にさかのぼる必要があれば、月送りしてから選ぶ。
 */
export async function selectDateInCalendar(page: Page, dateKey: string): Promise<void> {
  const [year, month, day] = dateKey.split('-').map(Number)
  const monthLabel = `${year}年${month}月`
  const dayLabel = `${monthLabel}${day}日`

  const heading = page.getByRole('heading', { name: /^\d{4}年\d{1,2}月$/ })

  // 同じ月に着くまでさかのぼる。行き過ぎないよう回数に上限を置く
  for (let attempt = 0; attempt < 24; attempt += 1) {
    if ((await heading.textContent()) === monthLabel) break
    await page.getByRole('button', { name: '前の月' }).click()
  }
  await expect(heading).toHaveText(monthLabel)

  await page.getByRole('button', { name: dayLabel }).click()
}
