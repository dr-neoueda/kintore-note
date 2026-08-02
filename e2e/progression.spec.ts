import { expect, test, type Page } from '@playwright/test'

/**
 * 「前回何kgでやったか」と「今回上げるべきか」の提案を確認する。
 *
 * 提案は前回セッションの実績から決まるため、過去の記録が必要になる。
 * バックアップ復元機能を使って過去データを流し込み、実際の複数セッションを再現する。
 */

const EXERCISE_NAME = 'テストプレス'
const TARGET = { repsMin: 8, repsMax: 12, sets: 3 }

/** 今日から指定日数前の 'YYYY-MM-DD'。 */
function pastDateKey(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function buildBackup(repsPerSet: readonly number[], weightKg: number): string {
  const date = pastDateKey(3)
  const recordedAt = `${date}T10:00:00.000Z`

  return JSON.stringify({
    app: 'kintore-note',
    version: 1,
    exportedAt: recordedAt,
    data: {
      exercises: [
        {
          id: 1,
          name: EXERCISE_NAME,
          muscleGroup: 'chest',
          equipment: 'dumbbell',
          dumbbellCount: 2,
          target: TARGET,
          isArchived: false,
          createdAt: recordedAt,
        },
      ],
      workouts: [
        {
          id: 1,
          date,
          note: '',
          bodyWeightKg: null,
          startedAt: recordedAt,
          finishedAt: null,
        },
      ],
      sets: repsPerSet.map((reps, index) => ({
        id: index + 1,
        workoutId: 1,
        exerciseId: 1,
        order: index + 1,
        weightKg,
        reps,
        rpe: null,
        restSec: null,
        isWarmup: false,
        recordedAt,
      })),
      templates: [],
      settings: null,
    },
  })
}

/** バックアップ復元で過去の記録を用意する。 */
async function restorePastSession(
  page: Page,
  repsPerSet: readonly number[],
  weightKg: number,
): Promise<void> {
  page.on('dialog', (dialog) => void dialog.accept())

  await page.goto('/settings')
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(buildBackup(repsPerSet, weightKg), 'utf-8'),
  })

  // 取り込みの完了は、消えてしまうトーストではなく保存された種目そのもので確認する
  await page.goto('/exercises/1')
  await expect(page.getByRole('heading', { name: EXERCISE_NAME })).toBeVisible()
}

async function openExerciseOnHome(page: Page): Promise<void> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
  await page.getByRole('button', { name: '種目を追加' }).click()
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(`^${EXERCISE_NAME}`) }).click()
}

test.describe('重量の提案', () => {
  test('記録が無ければ最も軽い段階から始めるよう促す', async ({ page }) => {
    // Arrange & Act
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'ホーム' })).toBeVisible()
    await page.getByRole('button', { name: '種目を追加' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^インクラインダンベルプレス/ }).click()

    // Assert
    await expect(page.getByRole('main')).toContainText('2.5kg から始めましょう')
  })

  test('目標に届いていなければ同じ重量を提案し、次の条件を示す', async ({ page }) => {
    // Arrange: 11.5kg × 12,12,11 は上限12回を全セットで満たしていない
    await restorePastSession(page, [12, 12, 11], 11.5)

    // Act
    await openExerciseOnHome(page)

    // Assert
    await expect(page.getByRole('main')).toContainText('今回も 11.5kg')
    await expect(page.getByRole('main')).toContainText('全3セットで12回できたら次は 13.5kg')
  })

  test('全セットで目標に達していれば1段階上げるよう提案する', async ({ page }) => {
    // Arrange: 11.5kg × 12,12,12 は目標達成
    await restorePastSession(page, [12, 12, 12], 11.5)

    // Act
    await openExerciseOnHome(page)

    // Assert: 所有しているダンベルの次の段階は 13.5kg
    await expect(page.getByRole('main')).toContainText('13.5kg に上げる')
    await expect(page.getByRole('main')).toContainText('前回 全3セットで12回を達成')
  })

  test('提案した重量がセット入力の初期値になる', async ({ page }) => {
    // Arrange
    await restorePastSession(page, [12, 12, 12], 11.5)
    await openExerciseOnHome(page)

    // Act
    await page.getByRole('button', { name: 'セットを追加' }).click()

    // Assert: 増量後は下限回数から仕切り直す
    const sheet = page.getByRole('dialog')
    await expect(sheet).toContainText('13.5')
    await expect(sheet).toContainText('8')
  })

  test('種目を選ぶ前に前回の重量が見える', async ({ page }) => {
    // Arrange
    await restorePastSession(page, [12, 12, 11], 11.5)

    // Act
    await page.goto('/')
    await page.getByRole('button', { name: '種目を追加' }).click()

    // Assert
    await expect(page.getByRole('dialog')).toContainText('前回 11.5kg')
  })
})

test.describe('種目カルテ', () => {
  test('種目名から履歴と推奨をまとめて確認できる', async ({ page }) => {
    // Arrange
    await restorePastSession(page, [12, 12, 12], 11.5)
    await openExerciseOnHome(page)

    // Act
    await page.getByRole('link', { name: new RegExp(`^${EXERCISE_NAME}`) }).click()

    // Assert
    await expect(page.getByRole('heading', { name: EXERCISE_NAME })).toBeVisible()
    await expect(page.getByRole('main')).toContainText('今回の推奨')
    await expect(page.getByRole('main')).toContainText('13.5 kg')
    await expect(page.getByRole('main')).toContainText('11.5kg × 12, 12, 12')
    await expect(page.getByRole('main')).toContainText('8〜12回 × 3セット')
  })

  test('目標を変えると提案の条件も変わる', async ({ page }) => {
    // Arrange: 11.5kg × 12,12,12 は目標12回では達成だが、15回に上げると未達になる
    await restorePastSession(page, [12, 12, 12], 11.5)
    await page.goto('/exercises/1')
    await expect(page.getByRole('heading', { name: EXERCISE_NAME })).toBeVisible()

    // Act: 上限を12→15に上げる
    await page.getByRole('button', { name: '変更' }).click()
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole('button', { name: '上限の回数（ここで重量を上げる）を上げる' }).click()
    }
    await page.getByRole('button', { name: '決定' }).click()

    // Assert: 据え置きに変わる
    await expect(page.getByRole('main')).toContainText('今回も 11.5kg')
    await expect(page.getByRole('main')).toContainText('8〜15回 × 3セット')
  })
})
