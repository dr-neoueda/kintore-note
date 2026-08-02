/**
 * 画面の見た目を iPhone 13 mini のサイズで書き出す。
 *
 * 実行: node scripts/screenshots.mjs [出力ディレクトリ]
 * 外観: COLOR_SCHEME=dark node scripts/screenshots.mjs out-dark
 */
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium, devices } from '@playwright/test'

const BASE_URL = process.env.SCREENSHOT_BASE_URL ?? 'http://localhost:5173'
const OUT_DIR = process.argv[2] ?? 'screenshots'

await mkdir(OUT_DIR, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  ...devices['iPhone 13 Mini'],
  isMobile: false,
  colorScheme: process.env.COLOR_SCHEME === 'dark' ? 'dark' : 'light',
})
const page = await context.newPage()

const shot = async (name) => {
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`) })
  console.log(`captured ${name}.png`)
}

await page.goto(BASE_URL)
await page.getByRole('heading', { name: 'ホーム' }).waitFor()
await shot('01-today-empty')

// 種目を追加する画面
await page.getByRole('button', { name: '種目を追加' }).click()
await shot('02-exercise-picker')
await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()

// セット入力
await page.getByRole('button', { name: 'セットを追加' }).click()
await page.getByRole('button', { name: '重量を上げる' }).click()
await page.getByRole('button', { name: '重量を上げる' }).click()
await page.getByRole('button', { name: '重量を上げる' }).click()
await page.getByRole('button', { name: '重量を上げる' }).click()
await page.getByRole('button', { name: '重量を上げる' }).click()
await page.getByRole('button', { name: '重量を上げる' }).click()
await page.getByRole('button', { name: '重量を上げる' }).click()
await page.getByRole('button', { name: '重量を上げる' }).click()
await page.getByRole('dialog').getByRole('button', { name: '8', exact: true }).click()
await shot('03-set-editor')
await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()

// もう2セット記録して一覧の見た目を作る
for (const reps of [1, 2]) {
  await page.getByRole('button', { name: 'セットを追加' }).click()
  for (let i = 0; i < reps; i += 1) {
    await page.getByRole('button', { name: '回数を下げる' }).click()
  }
  await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()
}

// 2種目目
await page.getByRole('button', { name: '種目を追加' }).click()
await page.getByRole('dialog').getByRole('button', { name: /^サイドレイズ/ }).click()
await page.getByRole('button', { name: 'セットを追加' }).last().click()
await page.getByRole('dialog').getByRole('button', { name: '記録する', exact: true }).click()

await shot('04-today-recorded')

await page.getByRole('link', { name: '履歴' }).click()
await shot('05-history')

await page.getByRole('link', { name: 'グラフ' }).click()
await shot('06-charts')

await page.getByRole('link', { name: 'メニュー' }).click()
await shot('07-templates')

// メニューの目標設定（記録画面と同じ ± 形式）
await page.getByRole('link', { name: 'メニューを作る' }).click()
await page.getByLabel('メニュー名').fill('胸の日')
await page.getByRole('button', { name: '種目を追加' }).click()
await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()
await page.getByRole('button', { name: '指定なし' }).click()
for (let i = 0; i < 8; i += 1) {
  await page.getByRole('button', { name: '重量を上げる' }).click()
}
await shot('08-template-item-sheet')
await page.getByRole('button', { name: '決定' }).click()

await page.getByRole('button', { name: '種目を追加' }).click()
await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルフライ/ }).click()
await page.getByRole('button', { name: '決定' }).click()
await shot('09-template-editor')

await page.getByRole('link', { name: '設定' }).click()
await shot('10-settings')

await browser.close()
