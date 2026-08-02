/**
 * ビルド後の後処理。
 *
 * GitHub Pages には SPA 用のフォールバック設定が無く、
 * `/history` のような URL を直接開くと 404 になる。
 * 404 応答時に返される 404.html を index.html の複製にしておくことで、
 * どのパスで開いてもアプリが起動しルーターが解決できるようにする。
 */
import { copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST_DIR = fileURLToPath(new URL('../dist', import.meta.url))

await copyFile(path.join(DIST_DIR, 'index.html'), path.join(DIST_DIR, '404.html'))
console.log('generated dist/404.html (SPA fallback for GitHub Pages)')
