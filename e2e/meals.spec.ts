import { expect, test, type Page } from '@playwright/test'
import { waitForPersisted } from './helpers/persistence'

/** 食事の記録と栄養計算を、実機と同じ画面幅で確認する。 */

async function openMeals(page: Page): Promise<void> {
  await page.goto('/meals')
  await expect(page.getByRole('heading', { name: '食事' })).toBeVisible()
}

async function addFood(page: Page, mealType: string, keyword: string): Promise<void> {
  await page.getByRole('button', { name: `${mealType}に追加` }).click()
  await page.getByLabel('食品名で探す').fill(keyword)
  await page.getByRole('dialog').getByRole('button').filter({ hasText: keyword }).first().click()
}

test.describe('食事の記録', () => {
  test('食品を探して記録できる', async ({ page }) => {
    // Arrange
    await openMeals(page)

    // Act: バナナ（100gあたり93kcal）は1本90gから始まる
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
    await page.getByRole('button', { name: '量を増やす' }).click()

    // Assert: 分量に応じて栄養が変わる
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('2')
    await expect(page.getByTestId('amount-grams')).toHaveText('180 g')

    // Act
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('バナナ')
    await expect(page.getByTestId('total-kcal')).not.toHaveText('0')
  })

  test('量を変えるとエネルギーも変わる', async ({ page }) => {
    // Arrange
    await openMeals(page)
    await page.getByRole('button', { name: '昼食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()

    // Act: g に切り替えてから 200g にする
    await page.getByRole('button', { name: /単位を切り替える/ }).click()
    await page.getByRole('button', { name: '200g', exact: true }).click()

    // Assert: 100g あたり93kcal なので 186kcal
    await expect(page.getByRole('dialog')).toContainText('186')
  })

  test('記録した合計が目標と並んで出る', async ({ page }) => {
    // Arrange
    await openMeals(page)

    // Act
    await addFood(page, '夕食', 'バナナ')
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('/ 2000 kcal')
    await expect(page.getByRole('main')).toContainText('たんぱく質')
  })

  test('記録を開いて量を直せる', async ({ page }) => {
    // Arrange
    await openMeals(page)
    await addFood(page, '朝食', 'バナナ')
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('90 g')

    // Act
    await page.getByRole('button', { name: 'バナナの記録を編集' }).click()
    await page.getByRole('button', { name: /単位を切り替える/ }).click()
    await page.getByRole('button', { name: '50g', exact: true }).click()
    await page.getByRole('button', { name: '更新する' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('50 g')
  })

  test('記録を削除できる', async ({ page }) => {
    // Arrange
    await openMeals(page)
    await addFood(page, '朝食', 'バナナ')
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('バナナ')

    // Act
    await page.getByRole('button', { name: 'バナナの記録を編集' }).click()
    await page.getByRole('button', { name: 'この記録を削除' }).click()

    // Assert
    await expect(page.getByRole('main')).not.toContainText('バナナ')
    await expect(page.getByTestId('total-kcal')).toHaveText('0')
  })

  test('読み込み直しても記録が残る', async ({ page }) => {
    // Arrange
    await openMeals(page)
    await addFood(page, '朝食', 'バナナ')
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('バナナ')
    await waitForPersisted(page, 'meals', 1)

    // Act
    await page.reload()

    // Assert
    await expect(page.getByRole('main')).toContainText('バナナ')
  })

  test('前の日に切り替えると、その日の記録になる', async ({ page }) => {
    // Arrange
    await openMeals(page)
    await addFood(page, '朝食', 'バナナ')
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('バナナ')

    // Act
    await page.getByRole('button', { name: '前の日' }).click()

    // Assert: 前日には何も無い
    await expect(page.getByRole('main')).not.toContainText('バナナ')
    await expect(page.getByTestId('total-kcal')).toHaveText('0')

    // Act
    await page.getByRole('button', { name: '今日' }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('バナナ')
  })
})

test.describe('マイ食品', () => {
  test('成分表に無いものを登録して記録できる', async ({ page }) => {
    // Arrange
    await openMeals(page)
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('プロテイン')

    // Assert: 成分表には無い
    await expect(page.getByRole('dialog')).toContainText('該当する食品がありません')

    // Act: 打った語がそのまま名前に入る
    await page.getByRole('button', { name: '「プロテイン」を作る' }).click()
    await expect(page.getByLabel('食品名')).toHaveValue('プロテイン')
    await page.getByLabel('栄養成分表示の基準量').fill('30')
    await page.getByLabel('エネルギー').fill('120')
    await page.getByLabel('たんぱく質').fill('24')
    await page.getByRole('button', { name: '作成する' }).click()

    // Act: 作ったらそのまま量の入力に進む
    await page.getByRole('button', { name: '30g', exact: true }).click()

    // Assert: 1食30gで120kcal
    await expect(page.getByRole('dialog')).toContainText('120')

    // Act
    await page.getByRole('button', { name: '記録する' }).click()

    // Assert
    await expect(page.getByTestId('total-kcal')).toHaveText('120')
  })

  test('同じ名前のマイ食品は作れない', async ({ page }) => {
    // Arrange
    await page.goto('/settings/custom-foods')
    await page.getByRole('button', { name: 'マイ食品を作る' }).click()
    await page.getByLabel('食品名').fill('自作の食品')
    await page.getByRole('button', { name: '作成する' }).click()
    await expect(page.getByRole('main')).toContainText('自作の食品')

    // Act
    await page.getByRole('button', { name: 'マイ食品を作る' }).click()
    await page.getByLabel('食品名').fill('自作の食品')
    await page.getByRole('button', { name: '作成する' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('同じ名前のマイ食品が既にあります')
  })

  test('隠すと食品を選ぶ一覧に出なくなる', async ({ page }) => {
    // Arrange
    await page.goto('/settings/custom-foods')
    await page.getByRole('button', { name: 'マイ食品を作る' }).click()
    await page.getByLabel('食品名').fill('隠す食品')
    await page.getByRole('button', { name: '作成する' }).click()
    await expect(page.getByRole('main')).toContainText('隠す食品')

    // Act
    await page.getByRole('button', { name: '隠す食品を一覧から隠す' }).click()
    await expect(page.getByRole('button', { name: '隠す食品を一覧に戻す' })).toBeVisible()

    await openMeals(page)
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('隠す食品')

    // Assert
    await expect(page.getByRole('dialog')).toContainText('該当する食品がありません')
  })
})

test.describe('栄養の目標', () => {
  test('設定した目標が食事タブに反映される', async ({ page }) => {
    // Arrange
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: '栄養の目標' })).toBeVisible()

    // Act
    await page.getByLabel('エネルギー').fill('2600')
    await page.getByRole('button', { name: '栄養の目標を保存' }).click()
    await expect(page.getByRole('main')).toContainText('栄養の目標を保存しました')

    // Assert
    await openMeals(page)
    await expect(page.getByRole('main')).toContainText('/ 2600 kcal')
  })
})
