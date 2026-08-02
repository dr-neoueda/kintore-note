import { expect, test, type Page } from '@playwright/test'

/**
 * フォーム確認のリンクを検証する。
 * 外部サイトへ遷移させたくないので、クリックではなく href を確認する。
 */

const YOUTUBE_SEARCH_PREFIX = 'https://www.youtube.com/results?search_query='

async function addInclinePress(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()
}

test.describe('フォームの参考リンク', () => {
  test('未設定でも種目名での YouTube 検索を開ける', async ({ page }) => {
    // Arrange
    await addInclinePress(page)

    // Act
    const link = page.getByRole('link', { name: 'インクラインダンベルプレスのフォームを確認' })

    // Assert: 種目名と「フォーム」で検索する URL になっている
    const href = await link.getAttribute('href')
    expect(href).toContain(YOUTUBE_SEARCH_PREFIX)
    expect(href).toContain(encodeURIComponent('インクラインダンベルプレス フォーム'))
  })

  test('新しいタブで開き、参照元を渡さない', async ({ page }) => {
    // Arrange
    await addInclinePress(page)

    // Act
    const link = page.getByRole('link', { name: 'インクラインダンベルプレスのフォームを確認' })

    // Assert
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('カルテ画面から参考リンクを保存できる', async ({ page }) => {
    // Arrange
    await page.goto('/exercises/1')
    await expect(page.getByRole('button', { name: '変更' })).toBeVisible()

    // Act
    await page.getByRole('button', { name: '変更' }).click()
    await page
      .getByLabel('フォームの参考リンク')
      .fill('https://www.youtube.com/watch?v=example')
    await page.getByRole('button', { name: '決定' }).click()

    // Assert: 保存済みの表示に変わり、ボタンの遷移先も差し替わる
    await expect(page.getByRole('main')).toContainText('保存済み')
    await expect(page.getByRole('link', { name: 'フォームを確認' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=example',
    )
  })

  test('スキームを省略して貼り付けても https として保存する', async ({ page }) => {
    // Arrange
    await page.goto('/exercises/1')
    await page.getByRole('button', { name: '変更' }).click()

    // Act
    await page.getByLabel('フォームの参考リンク').fill('www.youtube.com/watch?v=abc')
    await page.getByRole('button', { name: '決定' }).click()

    // Assert
    await expect(page.getByRole('link', { name: 'フォームを確認' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=abc',
    )
  })

  test('実行され得るスキームは保存できない', async ({ page }) => {
    // Arrange
    await page.goto('/exercises/1')
    await page.getByRole('button', { name: '変更' }).click()

    // Act
    await page.getByLabel('フォームの参考リンク').fill('javascript:alert(1)')
    await page.getByRole('button', { name: '決定' }).click()

    // Assert: シートは閉じず、理由が表示される
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('dialog')).toContainText(
      'http または https で始まる URL を入力してください',
    )
  })

  test('保存したリンクを空欄にすると検索に戻る', async ({ page }) => {
    // Arrange
    await page.goto('/exercises/1')
    await page.getByRole('button', { name: '変更' }).click()
    await page.getByLabel('フォームの参考リンク').fill('https://example.com/form')
    await page.getByRole('button', { name: '決定' }).click()
    await expect(page.getByRole('main')).toContainText('保存済み')

    // Act
    await page.getByRole('button', { name: '変更' }).click()
    await page.getByLabel('フォームの参考リンク').fill('')
    await page.getByRole('button', { name: '決定' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('未設定（検索）')
    await expect(
      page.getByRole('link', { name: 'YouTubeでフォームを検索' }),
    ).toBeVisible()
  })
})
