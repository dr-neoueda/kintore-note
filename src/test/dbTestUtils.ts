import { db } from '@/data/db'

/** 各テストの前に全テーブルを空にする。 */
export async function resetDatabase(): Promise<void> {
  if (!db.isOpen()) {
    await db.open()
  }
  await Promise.all(db.tables.map((table) => table.clear()))
}
