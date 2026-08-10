import { expect, test, type Page } from '@playwright/test'
import { waitForPersisted } from './helpers/persistence'

/** 運動と食事の切り替え、および食事側の各画面。 */

const tabbar = (page: Page) => page.getByRole('navigation', { name: 'メインナビゲーション' })

test.describe('運動と食事の切り替え', () => {
  test('左端のボタンで系統が入れ替わる', async ({ page }) => {
    // Arrange
    await page.goto('/')
    await expect(tabbar(page)).toContainText('メニュー')
    // ボタンの表示と、中央のタブの系統が揃っている
    await expect(page.getByRole('button', { name: '食事に切り替える' })).toHaveText(/運動/)

    // Act
    await page.getByRole('button', { name: '食事に切り替える' }).click()

    // Assert: 食事側のタブに入れ替わり、ボタンの表示も食事になる
    await expect(page.getByRole('heading', { name: '食事' })).toBeVisible()
    await expect(tabbar(page)).toContainText('献立')
    await expect(tabbar(page)).not.toContainText('メニュー')
    await expect(page.getByRole('button', { name: '運動に切り替える' })).toHaveText(/食事/)

    // Act
    await page.getByRole('button', { name: '運動に切り替える' }).click()

    // Assert
    await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
    await expect(tabbar(page)).toContainText('メニュー')
    await expect(page.getByRole('button', { name: '食事に切り替える' })).toHaveText(/運動/)
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
    await expect(page.getByRole('heading', { name: 'グラフ' })).toBeVisible()

    await tabbar(page).getByRole('link', { name: '献立' }).click()
    await expect(page.getByRole('heading', { name: '献立' })).toBeVisible()
  })
})

test.describe('献立', () => {
  async function createTemplate(page: Page, name: string): Promise<void> {
    await page.goto('/meals/templates')
    await page.getByRole('link', { name: '献立を作る' }).click()
    await page.getByLabel('献立の名前').fill(name)
    // 入れる区分は持たない。入れるときの場所で決まる
    await expect(page.getByRole('main')).not.toContainText('入れる区分')
    await page.getByRole('button', { name: '食品を追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
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
    await expect(page.getByRole('main')).toContainText('バナナ')
  })

  test('どの区分からでも献立を入れられる', async ({ page }) => {
    // Arrange
    await createTemplate(page, 'いつもの組み合わせ')

    // Act: 夕食から入れる
    await page.goto('/meals')
    await page.getByRole('button', { name: '夕食に追加' }).click()
    await page.getByRole('button', { name: /いつもの組み合わせ/ }).click()

    // Assert: 開いた区分（夕食）に入る
    await expect(page.getByRole('main')).toContainText('バナナ')
    await expect(page.getByTestId('total-kcal')).not.toHaveText('0')

    const dinner = page.getByRole('main').locator('section').filter({ hasText: '夕食' }).first()
    await expect(dinner).toContainText('バナナ')
  })

  test('同じ献立を別の区分にも入れられる', async ({ page }) => {
    // Arrange
    await createTemplate(page, 'いつもの組み合わせ')
    await page.goto('/meals')

    // Act: 朝食と間食の両方に入れる
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByRole('button', { name: /いつもの組み合わせ/ }).click()
    await expect(page.getByRole('main')).toContainText('バナナ')

    await page.getByRole('button', { name: '間食に追加' }).click()
    await page.getByRole('button', { name: /いつもの組み合わせ/ }).click()

    // Assert: 2品ぶん入っている
    await expect(page.getByRole('main').getByText('バナナ', { exact: true })).toHaveCount(2)
  })

  test('献立の編集では献立を入れられない', async ({ page }) => {
    // Arrange: 献立の中に献立は入れられない
    await createTemplate(page, 'いつもの組み合わせ')
    await page.goto('/meals/templates/new')

    // Act
    await page.getByRole('button', { name: '食品を追加' }).click()

    // Assert
    await expect(page.getByRole('dialog')).not.toContainText('献立からまとめて入れる')
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
    await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('バナナ')
    await waitForPersisted(page, 'meals', 1)
  }

  test('履歴からその日の記録を開ける', async ({ page }) => {
    // Arrange
    await recordBanana(page)

    // Act
    await page.goto('/meals/history')
    // バナナは1本90g（93kcal/100g）から始まる
    await expect(page.getByRole('main')).toContainText('84 kcal')
    await page.getByRole('link').first().click()

    // Assert
    await expect(page.getByRole('main')).toContainText('バナナ')
  })

  test('グラフに平均と推移が出る', async ({ page }) => {
    // Arrange
    await recordBanana(page)

    // Act
    await page.goto('/meals/charts')

    // Assert
    await expect(page.getByRole('main')).toContainText('エネルギーの推移')
    await expect(page.getByRole('main')).toContainText('たんぱく質の推移')

    // Act: 体組成は「からだ」に分けている
    await page.getByRole('tab', { name: 'からだ' }).click()

    // Assert: 測っていなければ案内を出す
    await expect(page.getByRole('main')).toContainText('体組成の記録がありません')
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
    await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('バナナ')

    // Act
    await page.getByRole('button', { name: '今日' }).click()
    await expect(page.getByRole('button', { name: '前の日と同じにする' })).toBeVisible()
    await page.getByRole('button', { name: '前の日と同じにする' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('バナナ')
    await expect(page.getByTestId('total-kcal')).toHaveText('84')
  })

  test('その日に記録があれば出さない', async ({ page }) => {
    // Arrange
    await page.goto('/meals')
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByRole('button', { name: '前の日と同じにする' })).toHaveCount(0)
  })
})
