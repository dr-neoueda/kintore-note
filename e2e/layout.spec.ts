import { expect, test, type Page } from '@playwright/test'

/**
 * 画面が横にはみ出していないことの検証。
 *
 * 幅375pxの端末で、要素が親や画面の外へ出ていないかを機械的に確かめる。
 * とくに入力欄は、flex の子要素として既定の最小幅（内容幅）を持つため、
 * min-width を明示しないと縮まずにはみ出しやすい。
 */

const PAGES: readonly { readonly path: string; readonly heading: string }[] = [
  { path: '/', heading: 'ホーム' },
  { path: '/history', heading: '履歴' },
  { path: '/charts', heading: 'グラフ' },
  { path: '/templates', heading: 'メニュー' },
  { path: '/settings', heading: '設定' },
  { path: '/settings/exercises', heading: '種目の管理' },
  { path: '/exercises/1', heading: 'インクラインダンベルプレス' },
]

/** 画面全体が横スクロールしないこと。 */
async function readHorizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

/** 入力欄が親要素の右端をはみ出していないこと。 */
async function readWidestInputOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const fields = [...document.querySelectorAll('input, select, textarea')]
    return fields.reduce((worst, field) => {
      const parent = field.parentElement
      if (parent === null) return worst

      const fieldRect = field.getBoundingClientRect()
      const parentRect = parent.getBoundingClientRect()
      if (fieldRect.width === 0) return worst

      const overflow = Math.max(
        fieldRect.right - parentRect.right,
        parentRect.left - fieldRect.left,
      )
      return Math.max(worst, overflow)
    }, 0)
  })
}

for (const { path, heading } of PAGES) {
  test(`${heading}: 横にはみ出さない`, async ({ page }) => {
    // Arrange
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()

    // Act & Assert: 小数の丸め誤差を考慮して1pxまで許容する
    expect(await readHorizontalOverflow(page)).toBeLessThanOrEqual(1)
    expect(await readWidestInputOverflow(page)).toBeLessThanOrEqual(1)
  })
}

test('日付の選択欄が枠の中に収まる', async ({ page }) => {
  // Arrange
  await page.goto('/history')
  await expect(page.getByRole('heading', { name: '履歴' })).toBeVisible()

  // Act
  const measured = await page.evaluate(() => {
    const input = document.querySelector('#history-date')
    const field = input?.parentElement
    const card = field?.parentElement
    if (!input || !field || !card) return null

    const inputRect = input.getBoundingClientRect()
    const fieldRect = field.getBoundingClientRect()
    const cardRect = card.getBoundingClientRect()

    return {
      fieldWithinCard:
        fieldRect.right <= cardRect.right + 1 && fieldRect.left >= cardRect.left - 1,
      inputWithinField:
        inputRect.right <= fieldRect.right + 1 && inputRect.left >= fieldRect.left - 1,
      // 流れから外れていれば、ネイティブの大きさが枠を押し広げることはない
      inputPosition: getComputedStyle(input).position,
    }
  })

  // Assert
  expect(measured?.fieldWithinCard).toBe(true)
  expect(measured?.inputWithinField).toBe(true)
  expect(measured?.inputPosition).toBe('absolute')
})
