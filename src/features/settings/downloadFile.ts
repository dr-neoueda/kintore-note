/**
 * テキストをファイルとしてダウンロードさせる。
 * iOS Safari ではダウンロード操作が共有シートとして開き、
 * 「ファイル」アプリや iCloud Drive に保存できる。
 */
export function downloadTextFile(
  fileName: string,
  text: string,
  mimeType = 'application/json',
): void {
  const blob = new Blob([text], { type: mimeType })
  const objectUrl = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  URL.revokeObjectURL(objectUrl)
}
