import { expect, test, type Page } from '@playwright/test'

/**
 * 休憩終了アラームの検証。
 *
 * 音そのものは検証できないため、Web Audio API の呼び出しを計測して
 * 「利用者の操作で音声が解錠されたか」「目標時間に達したときに発音したか」を確認する。
 */

interface AudioProbe {
  __audioContextCreated: number
  __oscillatorStarts: number
}

/** AudioContext を包んで、生成回数と発音回数を数える。 */
async function installAudioProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe = window as unknown as AudioProbe
    probe.__audioContextCreated = 0
    probe.__oscillatorStarts = 0

    const OriginalAudioContext = window.AudioContext
    if (OriginalAudioContext === undefined) return

    class InstrumentedAudioContext extends OriginalAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options)
        probe.__audioContextCreated += 1
      }

      override createOscillator(): OscillatorNode {
        const oscillator = super.createOscillator()
        const originalStart = oscillator.start.bind(oscillator)
        oscillator.start = (when?: number) => {
          probe.__oscillatorStarts += 1
          originalStart(when)
        }
        return oscillator
      }
    }

    window.AudioContext = InstrumentedAudioContext
  })
}

const readProbe = (page: Page, key: keyof AudioProbe) =>
  page.evaluate((name) => (window as unknown as AudioProbe)[name as keyof AudioProbe], key)

/**
 * 種目の休憩目標を最短の15秒にする（既定は胸=150秒）。
 *
 * シートが開いている間はステッパーの表示も main に含まれるため、
 * 閉じたことを確認してから保存結果を検証する。
 * これを怠ると、書き込みが終わる前に次の操作へ進んでしまう。
 */
async function shortenRestTargetTo15Seconds(page: Page): Promise<void> {
  await page.goto('/exercises/1')
  await expect(page.getByRole('heading', { name: 'インクラインダンベルプレス' })).toBeVisible()

  await page.getByRole('button', { name: '変更' }).click()
  for (let index = 0; index < 9; index += 1) {
    await page.getByRole('button', { name: 'セット間の休憩を下げる' }).click()
  }
  await expect(page.getByRole('dialog')).toContainText('0:15')
  await page.getByRole('button', { name: '決定' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('main')).toContainText('0:15')
}

async function recordOneSet(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()
  await page.getByRole('button', { name: 'セットを追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()
}

test.describe('休憩終了のアラーム', () => {
  test.beforeEach(async ({ page }) => {
    await installAudioProbe(page)
  })

  test('セットの記録を起点に音声が解錠される', async ({ page }) => {
    // Arrange & Act: iOS は利用者の操作なしに音を鳴らせないため、記録時に解錠する
    await recordOneSet(page)

    // Assert
    await expect(page.getByRole('status')).toContainText('休憩')
    expect(await readProbe(page, '__audioContextCreated')).toBeGreaterThan(0)
  })

  test('目標時間に達したら発音する', async ({ page }) => {
    // Arrange
    await shortenRestTargetTo15Seconds(page)

    // Act
    await recordOneSet(page)
    expect(await readProbe(page, '__oscillatorStarts')).toBe(0)

    // Assert: 15秒経過で鳴る
    await expect
      .poll(() => readProbe(page, '__oscillatorStarts'), { timeout: 30_000 })
      .toBeGreaterThan(0)
  })

  test('設定でオフにすると鳴らさない', async ({ page }) => {
    // Arrange
    await shortenRestTargetTo15Seconds(page)

    await page.goto('/settings')
    await page.getByRole('button', { name: '音で知らせる：オン' }).click()
    await expect(page.getByRole('button', { name: '音で知らせる：オフ' })).toBeVisible()

    // Act
    await recordOneSet(page)
    await page.waitForTimeout(20_000)

    // Assert
    expect(await readProbe(page, '__oscillatorStarts')).toBe(0)
  })

  test('設定の切り替えが保存される', async ({ page }) => {
    // Arrange
    await page.goto('/settings')
    await page.getByRole('button', { name: '音で知らせる：オン' }).click()
    // 保存が終わるのを、表示が切り替わったことで確認してから読み込み直す
    await expect(page.getByRole('button', { name: '音で知らせる：オフ' })).toBeVisible()

    // Act
    await page.reload()

    // Assert
    await expect(page.getByRole('button', { name: '音で知らせる：オフ' })).toBeVisible()
  })
})
