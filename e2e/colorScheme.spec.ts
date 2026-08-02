import { expect, test, type Page } from '@playwright/test'

/**
 * iOS の外観設定（ライト／ダーク）への追従を確認する。
 * 白黒であること自体は変えず、明暗だけが反転する。
 */

const LIGHT_BG = 'rgb(255, 255, 255)'
const LIGHT_TEXT = 'rgb(17, 17, 19)'
const DARK_BG = 'rgb(0, 0, 0)'
const DARK_TEXT = 'rgb(242, 242, 244)'

async function readBodyColors(page: Page): Promise<{ background: string; text: string }> {
  return page.evaluate(() => {
    const style = getComputedStyle(document.body)
    return { background: style.backgroundColor, text: style.color }
  })
}

test.describe('ライトモード', () => {
  test.use({ colorScheme: 'light' })

  test('白背景・黒文字で表示される', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()

    // Act
    const { background, text } = await readBodyColors(page)

    // Assert
    expect(background).toBe(LIGHT_BG)
    expect(text).toBe(LIGHT_TEXT)
  })
})

test.describe('ダークモード', () => {
  test.use({ colorScheme: 'dark' })

  test('黒背景・白文字で表示される', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()

    // Act
    const { background, text } = await readBodyColors(page)

    // Assert
    expect(background).toBe(DARK_BG)
    expect(text).toBe(DARK_TEXT)
  })

  test('主要ボタンの文字色が地色に紛れない', async ({ page }) => {
    // Arrange
    await page.goto('/')
    const primaryButton = page.getByRole('button', { name: '種目を追加' })
    await expect(primaryButton).toBeVisible()

    // Act: ダークでは白地に黒文字へ反転する
    const colors = await primaryButton.evaluate((element) => {
      const style = getComputedStyle(element)
      return { background: style.backgroundColor, text: style.color }
    })

    // Assert
    expect(colors.background).toBe(DARK_TEXT)
    expect(colors.text).toBe(LIGHT_TEXT)
  })

  test('固定表示の帯が透けて文字が重ならない', async ({ page }) => {
    // Arrange: ヘッダー・タブバーの地色がダーク側の値になっているか
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()

    // Act
    const tabbarBackground = await page
      .getByRole('navigation', { name: 'メインナビゲーション' })
      .evaluate((element) => getComputedStyle(element).backgroundColor)

    // Assert
    expect(tabbarBackground).toBe('rgba(10, 10, 12, 0.93)')
  })
})
