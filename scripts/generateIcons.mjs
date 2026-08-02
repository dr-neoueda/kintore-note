/**
 * PWA 用アイコンを SVG から生成する。
 * 依存を増やさずに済むよう、アイコンは単純な図形だけで描いている。
 *
 * 実行: node scripts/generateIcons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url))

const BACKGROUND = '#0f1115'
const ACCENT = '#ff6b35'

/**
 * ダンベルのアイコン。
 * safeRatio はマスカブルアイコン用に図形を内側へ縮める割合。
 */
function buildSvg({ size, cornerRadius, safeRatio }) {
  const scale = safeRatio
  const offset = (1 - scale) / 2
  const viewBoxScale = 64

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${viewBoxScale} ${viewBoxScale}">
  <rect width="${viewBoxScale}" height="${viewBoxScale}" rx="${cornerRadius}" fill="${BACKGROUND}"/>
  <g transform="translate(${offset * viewBoxScale} ${offset * viewBoxScale}) scale(${scale})"
     stroke="${ACCENT}" stroke-width="5" stroke-linecap="round" fill="none">
    <path d="M14 25v14"/>
    <path d="M23 19v26"/>
    <path d="M41 19v26"/>
    <path d="M50 25v14"/>
    <path d="M23 32h18"/>
  </g>
</svg>`
}

const TARGETS = [
  { file: 'pwa-192x192.png', size: 192, cornerRadius: 14, safeRatio: 1 },
  { file: 'pwa-512x512.png', size: 512, cornerRadius: 14, safeRatio: 1 },
  // マスカブルは端が切り取られるため、図形を中央 80% に収める
  { file: 'pwa-maskable-512x512.png', size: 512, cornerRadius: 0, safeRatio: 0.8 },
  // iOS のホーム画面アイコン。角丸は OS 側が付けるため矩形で書き出す
  { file: 'apple-touch-icon.png', size: 180, cornerRadius: 0, safeRatio: 0.86 },
]

await mkdir(PUBLIC_DIR, { recursive: true })

for (const target of TARGETS) {
  const svg = buildSvg(target)
  const png = await sharp(Buffer.from(svg)).resize(target.size, target.size).png().toBuffer()
  await writeFile(path.join(PUBLIC_DIR, target.file), png)
  console.log(`generated ${target.file} (${target.size}x${target.size})`)
}
