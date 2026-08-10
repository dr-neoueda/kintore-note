import { expect, test, type Page } from '@playwright/test'

/** 体組成の推移と、摂取・消費の収支からの分析。 */

/** 日付を選んで体組成を記録する。offsetDays は今日から何日前か。 */
async function recordBodyOn(
  page: Page,
  offsetDays: number,
  values: { weight: string; bodyFat?: string; bmr?: string; height?: string },
): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: '体組成を記録' }).click()

  if (offsetDays > 0) {
    const today = new Date()
    const target = new Date()
    target.setDate(target.getDate() - offsetDays)

    // カレンダーは今月から始まる。目当ての月まで戻してから日を選ぶ
    const monthsBack =
      (today.getFullYear() - target.getFullYear()) * 12 +
      (today.getMonth() - target.getMonth())

    await page.getByRole('button', { name: '別の日にする' }).click()
    for (let i = 0; i < monthsBack; i += 1) {
      await page.getByRole('button', { name: '前の月' }).click()
    }

    const label = `${target.getFullYear()}年${target.getMonth() + 1}月${target.getDate()}日`
    await page.getByRole('button', { name: new RegExp(`^${label}`) }).click()
  }

  await page.getByLabel('体重').fill(values.weight)
  if (values.bodyFat !== undefined) await page.getByLabel('体脂肪率').fill(values.bodyFat)
  if (values.bmr !== undefined) await page.getByLabel('基礎代謝量').fill(values.bmr)
  if (values.height !== undefined) await page.getByLabel('身長').fill(values.height)
  await page.getByRole('button', { name: '保存する' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

async function openBodyCharts(page: Page): Promise<void> {
  await page.goto('/meals/charts')
  await page.getByRole('tab', { name: 'からだ' }).click()
}

test.describe('体組成のグラフ', () => {
  test('体重の推移と移動平均が出る', async ({ page }) => {
    // Arrange
    await recordBodyOn(page, 3, { weight: '71' })
    await recordBodyOn(page, 0, { weight: '70' })

    // Act
    await openBodyCharts(page)

    // Assert
    await expect(page.getByRole('main')).toContainText('体重の推移')
    await expect(page.getByRole('main')).toContainText('7日移動平均')
  })

  test('期間の変化を出す', async ({ page }) => {
    // Arrange: 3日で 1kg 減った
    await recordBodyOn(page, 3, { weight: '71' })
    await recordBodyOn(page, 0, { weight: '70' })

    // Act
    await openBodyCharts(page)

    // Assert
    await expect(page.getByTestId('change-体重')).toContainText('-1')
  })

  test('1回しか測っていなければ変化は出さない', async ({ page }) => {
    // Arrange & Act: 当て推量の傾向は示さない
    await recordBodyOn(page, 0, { weight: '70' })
    await openBodyCharts(page)

    // Assert
    await expect(page.getByRole('main')).toContainText('2回以上測ると出ます')
  })

  test('体脂肪率を測っていれば、除脂肪体重も出る', async ({ page }) => {
    // Arrange
    await recordBodyOn(page, 3, { weight: '71', bodyFat: '16' })
    await recordBodyOn(page, 0, { weight: '70', bodyFat: '15' })

    // Act
    await openBodyCharts(page)

    // Assert
    await expect(page.getByRole('main')).toContainText('体脂肪と除脂肪体重')
    await expect(page.getByTestId('change-体脂肪率')).toBeVisible()
  })

  test('体脂肪率が無ければ、その項目は出さない', async ({ page }) => {
    // Arrange & Act
    await recordBodyOn(page, 3, { weight: '71' })
    await recordBodyOn(page, 0, { weight: '70' })
    await openBodyCharts(page)

    // Assert
    await expect(page.getByTestId('change-体脂肪率')).toHaveCount(0)
  })

  test('身長を入れていれば BMI が出る', async ({ page }) => {
    // Arrange
    await recordBodyOn(page, 0, { weight: '70', height: '170' })

    // Act
    await openBodyCharts(page)

    // Assert
    await expect(page.getByTestId('latest-bmi')).toContainText('24.2')
  })

  test('記録が無ければ案内を出す', async ({ page }) => {
    // Arrange: 食事だけ記録して、グラフ自体は開ける状態にする
    await page.goto('/meals')
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
    await page.getByRole('button', { name: '記録する' }).click()

    // Act
    await openBodyCharts(page)

    // Assert
    await expect(page.getByRole('main')).toContainText('体組成の記録がありません')
  })
})

test.describe('期間の切り替え', () => {
  test('期間を変えると対象が変わる', async ({ page }) => {
    // Arrange: 40日前と今日。2週間では40日前は入らない
    await recordBodyOn(page, 40, { weight: '75' })
    await recordBodyOn(page, 0, { weight: '70' })

    // Act
    await openBodyCharts(page)

    // Assert: 2週間では1件だけなので変化を出せない
    await expect(page.getByRole('main')).toContainText('2回以上測ると出ます')

    // Act: 3か月に広げる
    await page.getByRole('button', { name: '3か月' }).click()

    // Assert: 75 → 70 で −5kg
    await expect(page.getByTestId('change-体重')).toContainText('-5')
  })

  test('選んだ期間が残る', async ({ page }) => {
    // Arrange
    await recordBodyOn(page, 0, { weight: '70' })
    await openBodyCharts(page)

    // Act
    await page.getByRole('button', { name: '1か月' }).click()

    // Assert
    await expect(page.getByRole('button', { name: '1か月' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})

test.describe('エネルギー収支の分析', () => {
  test('収支の累計を体脂肪の重さに直して出す', async ({ page }) => {
    // Arrange: 基礎代謝1600、食事はバナナ1本だけ
    await recordBodyOn(page, 0, { weight: '70', bmr: '1600' })
    await page.goto('/meals')
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
    await page.getByRole('button', { name: '記録する' }).click()

    // Act
    await page.goto('/meals/charts')

    // Assert: 84 − 1600 = −1516 kcal ≒ 体脂肪 −0.21kg
    await expect(page.getByTestId('fat-estimate')).toContainText('-1516')
    await expect(page.getByTestId('fat-estimate')).toContainText('-0.21 kg')
  })

  test('基礎代謝が無ければ収支は出さない', async ({ page }) => {
    // Arrange: 基礎代謝まで推定すると誤差の上に誤差を重ねる
    await recordBodyOn(page, 0, { weight: '70' })
    await page.goto('/meals')
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
    await page.getByRole('button', { name: '記録する' }).click()

    // Act
    await page.goto('/meals/charts')

    // Assert
    await expect(page.getByTestId('fat-estimate')).toHaveCount(0)
  })

  test('PFC のエネルギー比を出す', async ({ page }) => {
    // Arrange
    await page.goto('/meals')
    await page.getByRole('button', { name: '朝食に追加' }).click()
    await page.getByLabel('食品名で探す').fill('バナナ')
    await page.getByRole('dialog').getByRole('button', { name: 'バナナを選ぶ' }).click()
    await page.getByRole('button', { name: '記録する' }).click()

    // Act
    await page.goto('/meals/charts')

    // Assert
    await expect(page.getByTestId('energy-share')).toContainText('エネルギー比')
  })
})
