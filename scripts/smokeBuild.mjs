/**
 * 本番ビルドの煙テスト。
 *
 * GitHub Pages はリポジトリ名のサブディレクトリで配信されるため、
 * 開発サーバー（ルート配信）では気づけない不具合が起きうる。
 * 公開前に、実際のベースパスで起動・遷移・アセット取得を確認する。
 *
 * 実行:
 *   VITE_BASE_PATH=/kintore-note/ npm run build
 *   VITE_BASE_PATH=/kintore-note/ npx vite preview --port 4173
 *   node scripts/smokeBuild.mjs
 */
import { chromium, devices } from '@playwright/test'

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://localhost:4173/kintore-note/'

const browser = await chromium.launch()
const context = await browser.newContext({ ...devices['iPhone 13 Mini'], isMobile: false })
const page = await context.newPage()

const loadFailures = []
page.on('pageerror', (error) => loadFailures.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error') loadFailures.push(`console: ${message.text()}`)
})
page.on('requestfailed', (request) =>
  loadFailures.push(`requestfailed: ${request.url()} (${request.failure()?.errorText})`),
)

const check = async (name, run) => {
  try {
    await run()
    console.log(`OK   ${name}`)
  } catch (error) {
    console.log(`NG   ${name}: ${String(error.message).split('\n')[0]}`)
    process.exitCode = 1
  }
}

await check('トップが開き、ホームが表示される', async () => {
  await page.goto(BASE_URL)
  await page.getByRole('heading', { name: 'ホーム' }).waitFor({ timeout: 15_000 })
})

await check('種目の初期データが投入されている', async () => {
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^インクラインダンベルプレス/ })
    .waitFor({ timeout: 5_000 })
  await page.getByRole('dialog').getByRole('button', { name: '閉じる' }).click()
})

await check('タブ遷移ができる', async () => {
  await page.getByRole('link', { name: '設定' }).click()
  await page.getByRole('heading', { name: '設定' }).waitFor({ timeout: 5_000 })
})

await check('遷移後もベースパスが保たれる', async () => {
  const currentUrl = page.url()
  if (!currentUrl.includes(new URL(BASE_URL).pathname + 'settings')) {
    throw new Error(`想定外の URL: ${currentUrl}`)
  }
})

await check('404.html から起動できる（SPA フォールバック）', async () => {
  await page.goto(`${BASE_URL}404.html`)
  await page.getByRole('heading', { name: 'ホーム' }).waitFor({ timeout: 15_000 })
})

await check('マニフェストとアイコンを取得できる', async () => {
  for (const asset of ['manifest.webmanifest', 'pwa-192x192.png', 'apple-touch-icon.png']) {
    const response = await page.request.get(`${BASE_URL}${asset}`)
    if (!response.ok()) throw new Error(`${asset} が ${response.status()}`)
  }
})

if (loadFailures.length > 0) {
  console.log('\n--- 読み込み中に検出したエラー ---')
  for (const failure of loadFailures) console.log(`  ${failure}`)
  process.exitCode = 1
} else {
  console.log('\n読み込みエラーなし')
}

await browser.close()
