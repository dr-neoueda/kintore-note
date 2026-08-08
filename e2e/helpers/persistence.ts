import { expect, type Page } from '@playwright/test'

/**
 * 指定したテーブルに件数ぶん保存されるまで待つ。
 *
 * Dexie の liveQuery は書き込みが確定する前に画面へ反映する（楽観更新）ため、
 * 画面に出た直後に再読み込みすると、まだ確定していない書き込みが巻き戻ることがある。
 * ここでは Dexie を介さず IndexedDB を直接読み、確定した件数だけを数える。
 */
export async function waitForPersisted(
  page: Page,
  storeName: string,
  minimumCount: number,
): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          ([store]) =>
            new Promise<number>((resolve) => {
              const request = indexedDB.open('kintore-note')
              request.onerror = () => resolve(-1)
              request.onsuccess = () => {
                const db = request.result
                if (!db.objectStoreNames.contains(store as string)) {
                  db.close()
                  resolve(-1)
                  return
                }
                const countRequest = db
                  .transaction(store as string, 'readonly')
                  .objectStore(store as string)
                  .count()
                countRequest.onsuccess = () => {
                  db.close()
                  resolve(countRequest.result)
                }
                countRequest.onerror = () => {
                  db.close()
                  resolve(-1)
                }
              }
            }),
          [storeName],
        ),
      { timeout: 5000 },
    )
    .toBeGreaterThanOrEqual(minimumCount)
}
