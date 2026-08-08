import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useBootstrap } from './hooks/useBootstrap'
import { HistoryPage } from './features/history/HistoryPage'
import { CustomFoodManagerPage } from './features/meals/CustomFoodManagerPage'
import { MealsPage } from './features/meals/MealsPage'
import { WorkoutDetailPage } from './features/history/WorkoutDetailPage'
import { ExerciseManagerPage } from './features/settings/ExerciseManagerPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { TemplateEditorPage } from './features/templates/TemplateEditorPage'
import { TemplatesPage } from './features/templates/TemplatesPage'
import { TodayPage } from './features/today/TodayPage'
import styles from './App.module.css'

/**
 * グラフ描画ライブラリは容量が大きく、記録の主要動線では使わない。
 * 初回読み込みを軽くするため、グラフ画面だけ遅延読み込みにする。
 */
const ChartsPage = lazy(() =>
  import('./features/charts/ChartsPage').then((module) => ({ default: module.ChartsPage })),
)

// カルテ画面も推移グラフを描くため、同じく遅延読み込みにする
const ExerciseDetailPage = lazy(() =>
  import('./features/exercises/ExerciseDetailPage').then((module) => ({
    default: module.ExerciseDetailPage,
  })),
)

export function App() {
  const { isReady, error } = useBootstrap()

  if (error !== null) {
    return (
      <div className={styles.splash}>
        <p className={styles.errorTitle}>データベースを開けませんでした</p>
        <p className="text-sm">{error}</p>
        <p className="text-sm">
          プライベートブラウズを使っている場合は、通常のタブで開き直してください。
        </p>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className={styles.splash}>
        <p>読み込み中…</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<TodayPage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/history/:date" element={<WorkoutDetailPage />} />
        <Route
          path="/exercises/:exerciseId"
          element={
            <Suspense fallback={<p className="empty-state">読み込み中…</p>}>
              <ExerciseDetailPage />
            </Suspense>
          }
        />
        <Route
          path="/charts"
          element={
            <Suspense fallback={<p className="empty-state">読み込み中…</p>}>
              <ChartsPage />
            </Suspense>
          }
        />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/templates/:templateId" element={<TemplateEditorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/exercises" element={<ExerciseManagerPage />} />
        <Route path="/settings/custom-foods" element={<CustomFoodManagerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
