import { expect, test, type Page } from '@playwright/test'

/**
 * 食品の選びやすさ。
 * 成分表は同じ食品に多くの版があり、生と調理済みでエネルギーが倍近く違う。
 */

async function openPicker(page: Page, keyword: string): Promise<void> {
  await page.goto('/meals')
  await page.getByRole('button', { name: '朝食に追加' }).click()
  await page.getByLabel('食品名で探す').fill(keyword)
}

test.describe('よく使うものを先頭に出す', () => {
  test('白米で「炊いたごはん」が先頭に出る', async ({ page }) => {
    // Arrange & Act
    await openPicker(page, '白米')

    // Assert: 生の米（342kcal）ではなく炊いた状態（156kcal）
    const suggestion = page.getByRole('button', { name: 'ごはん（白米・炊いた）を選ぶ' })
    await expect(suggestion).toBeVisible()
    await expect(suggestion).toContainText('156 kcal')
  })

  test('言い方が違っても同じものに当たる', async ({ page }) => {
    for (const keyword of ['ごはん', 'ライス']) {
      await openPicker(page, keyword)
      await expect(page.getByRole('button', { name: 'ごはん（白米・炊いた）を選ぶ' })).toBeVisible()
    }
  })

  test('分かりやすい名前のまま記録される', async ({ page }) => {
    // Arrange
    await openPicker(page, '白米')

    // Act
    await page.getByRole('button', { name: 'ごはん（白米・炊いた）を選ぶ' }).click()

    // Assert: 成分表の正式名ではなく、選んだときの名前で残る
    await expect(page.getByRole('dialog')).toContainText('ごはん（白米・炊いた）')
    await page.getByRole('button', { name: '記録する' }).click()
    await expect(page.getByRole('main')).toContainText('ごはん（白米・炊いた）')
  })

  test('よく使うものと同じ食品を、下の一覧に重ねて出さない', async ({ page }) => {
    // Arrange & Act
    await openPicker(page, '白米')

    // Assert
    await expect(
      page.getByRole('button', { name: /水稲めし］ 精白米 うるち米$/ }),
    ).toHaveCount(0)
  })
})

test.describe('量の入れやすさ', () => {
  test('「茶碗1杯」のような目安から入れられる', async ({ page }) => {
    // Arrange
    await openPicker(page, '白米')
    await page.getByRole('button', { name: 'ごはん（白米・炊いた）を選ぶ' }).click()

    // Act: 茶碗1杯は180g
    await page.getByRole('button', { name: /茶碗1杯/ }).click()

    // Assert: 156 × 1.8 = 281
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('180')
    await expect(page.getByRole('dialog')).toContainText('281')
  })

  test('目安が無い食品でも、これまで通り数値で入れられる', async ({ page }) => {
    // Arrange
    await openPicker(page, 'アマランサス')

    // Act
    await page.getByRole('dialog').getByRole('button', { name: /アマランサス/ }).click()
    await page.getByRole('button', { name: '200g', exact: true }).click()

    // Assert
    await expect(page.getByRole('spinbutton', { name: '量' })).toHaveValue('200')
  })
})

test.describe('生か調理済みかを見分けられる', () => {
  test('調理の状態を印で出す', async ({ page }) => {
    // Arrange & Act
    await openPicker(page, '精白米')

    // Assert
    await expect(page.getByRole('dialog')).toContainText('めし')
    await expect(page.getByRole('dialog')).toContainText('エネルギーが倍近く違います')
  })

  test('名前から分類の飾りを外して読みやすくする', async ({ page }) => {
    // Arrange & Act
    await openPicker(page, 'ささみ')

    // Assert: ＜鳥肉類＞ の部分は落とす
    await expect(page.getByRole('dialog')).not.toContainText('＜鳥肉類＞')
    await expect(page.getByRole('dialog')).toContainText('にわとり')
  })
})
