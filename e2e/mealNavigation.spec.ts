import { expect, test, type Page } from '@playwright/test'

/** 運動と食事の切り替え、および食事側の各画面。 */

const tabbar = (page: Page) => page.getByRole('navigation', { name: 'メインナビゲーション' })

test.describe('運動と食事の切り替え', () => {
  test('左端のボタンで系統が入れ替わる', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await expect(tabbar(page)).toContainText('メニュー')

    // Act
    await page.getByRole('button', { name: '食事に切り替える' }).click()

    // Assert: 食事側のタブに入れ替わる
    await expect(page.getByRole('heading', { name: '食事' })).toBeVisible()
    await expect(tabbar(page)).toContainText('献立')
    await expect(tabbar(page)).not.toContainText('メニュー')

    // Act
    await page.getByRole('button', { name: '運動に切り替える' }).click()

    // Assert
    await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
    await expect(tabbar(page)).toContainText('メニュー')
  })

  test('設定はどちらの系統でも右端に出る', async ({ page }) => {
    // Arrange & Act & Assert
    await page.goto('/')
    await expect(tabbar(page).getByRole('link', { name: '設定' })).toBeVisible()

    await page.goto('/meals')
    await expect(tabbar(page).getByRole('link', { name: '設定' })).toBeVisible()
  })

  test('設定を開いても、直前の系統のタブが出たままになる', async ({ page }) => {
    // Arrange: 食事側にいる
    await page.goto('/meals')
    await expect(tabbar(page)).toContainText('献立')

    // Act
    await tabbar(page).getByRole('link', { name: '設定' }).click()

    // Assert: 設定は共通なので、食事側のタブを保つ
    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()
    await expect(tabbar(page)).toContainText('献立')
  })

  test('食事側のタブから各画面へ移動できる', async ({ page }) => {
    // Arrange
    await page.goto('/meals')

    // Act & Assert
    await tabbar(page).getByRole('link', { name: '履歴' }).click()
    await expect(page.getByRole('heading', { name: '食事の履歴' })).toBeVisible()

    await tabbar(page).getByRole('link', { name: 'グラフ' }).click()
    await expect(page.getByRole('heading', { name: '食事のグラフ' })).toBeVisible()

    await tabbar(page).getByRole('link', { name: '献立' }).click()
    await expect(page.getByRole('heading', { name: '献立' })).toBeVisible()
  })
})

test.describe('献立', () => {
  async function createTemplate(page: Page, name: string): Promise<void> {
    await page.goto('/meals/templates')
    await page.getByRole('link', { name: '献立を作る' }).click()
    await page.getByLabel('献立の名前').fill(name)
    await page.getByRole('button', { name: '食品を追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: /^バナナ 生/ }).click()
    await page.getByRole('button', { name: '記録する' }).click()
    await page.getByRole('button', { name: '保存する' }).click()
    // 保存が終わる前に遷移すると、書き込みが中断される
    await expect(page.getByRole('main')).toContainText(name)
  }

  test('献立を作ると一覧に出る', async ({ page }) => {
    // Arrange & Act
    await createTemplate(page, 'いつもの朝食')

    // Assert
    await expect(page.getByRole('heading', { name: '献立' })).toBeVisible()
    await expect(page.getByRole('main')).toContainText('いつもの朝食')
    await expect(page.getByRole('main')).toContainText('バナナ 生')
  })

  test('献立をまとめて記録に入れられる', async ({ page }) => {
    // Arrange
    await createTemplate(page, 'いつもの朝食')

    // Act
    await page.goto('/meals')
    await page.getByRole('button', { name: /いつもの朝食/ }).click()

    // Assert: 朝食に入る
    await expect(page.getByRole('main')).toContainText('バナナ 生')
    await expect(page.getByTestId('total-kcal')).not.toHaveText('0')
  })

  test('献立を削除できる', async ({ page }) => {
    // Arrange
    await createTemplate(page, '消す献立')
    await page.getByRole('link', { name: /消す献立/ }).click()

    // Act
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'この献立を削除' }).click()

    // Assert
    await expect(page.getByRole('main')).not.toContainText('消す献立')
  })
})

test.describe('食事の履歴とグラフ', () => {
  async function recordBanana(page: Page): Promise<void> {
    await page.goto('/meals')
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: /^バナナ 生/ }).click()
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('バナナ 生')
  }

  test('履歴からその日の記録を開ける', async ({ page }) => {
    // Arrange
    await recordBanana(page)

    // Act
    await page.goto('/meals/history')
    await expect(page.getByRole('main')).toContainText('93 kcal')
    await page.getByRole('link').first().click()

    // Assert
    await expect(page.getByRole('main')).toContainText('バナナ 生')
  })

  test('グラフに平均と推移が出る', async ({ page }) => {
    // Arrange
    await recordBanana(page)

    // Act
    await page.goto('/meals/charts')

    // Assert
    await expect(page.getByRole('main')).toContainText('エネルギーの推移')
    await expect(page.getByRole('main')).toContainText('たんぱく質の推移')
    await expect(page.getByRole('main')).toContainText('体重の推移')
  })

  test('記録が無ければグラフは案内だけ出す', async ({ page }) => {
    // Arrange & Act
    await page.goto('/meals/charts')

    // Assert
    await expect(page.getByRole('main')).toContainText('記録が貯まると')
  })
})

test.describe('前の日をなぞる', () => {
  test('前の日と同じ内容にできる', async ({ page }) => {
    // Arrange: 前日に記録する
    await page.goto('/meals')
    await page.getByRole('button', { name: '前の日' }).click()
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: /^バナナ 生/ }).click()
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('バナナ 生')

    // Act
    await page.getByRole('button', { name: '今日' }).click()
    await expect(page.getByRole('button', { name: '前の日と同じにする' })).toBeVisible()
    await page.getByRole('button', { name: '前の日と同じにする' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('バナナ 生')
    await expect(page.getByTestId('total-kcal')).toHaveText('93')
  })

  test('その日に記録があれば出さない', async ({ page }) => {
    // Arrange
    await page.goto('/meals')
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: /^バナナ 生/ }).click()
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByRole('button', { name: '前の日と同じにする' })).toHaveCount(0)
  })
})
