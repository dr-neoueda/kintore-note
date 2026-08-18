# データモデル

保存先は端末内の IndexedDB（Dexie 経由）。スキーマ定義は `src/data/db.ts`。

## テーブル

### 同梱している食品データ（DB ではない）

| ファイル | 件数 | 出典 |
|---|---|---|
| `src/data/foodComposition.json` | 2,538 | 日本食品標準成分表（八訂）増補2023年（文部科学省）|
| `src/data/storeFoods.json` | 169 | Open Food Facts（ODbL）・業務スーパー |
| `src/domain/derivedFoods.ts` | 1 | 成分表に無い調理法の見積もり（元の食品番号 + 変化率）|
| `src/data/dishes.json` | 50 | 外食の料理。成分表の食材から積み上げて見積もる（scripts/buildDishes.py）|

どれも読み取り専用で、バックアップには含めない（アプリに入っているため）。
記録する側は、記録した時点の栄養価を焼き付けて持つ。

見積もり食品は `<元の食品番号>y` のような id を持ち、`estimateNote` に導出根拠を入れる。
料理は `dish-<名前>` の id を持つ。どちらも成分表そのままの値と混ざらないよう、画面でも断りを出す。

料理の栄養価は数値を直接書かず、レシピ（scripts/dishRecipes.py）から計算する。
あとから「なぜこの値か」を追えるようにするため。汁物は水を材料に含めないと
100gあたりが原液のような値になるので、`{"water": True}` で重さだけを足す。

### exercises（種目マスタ）

| 項目 | 型 | 説明 |
|---|---|---|
| id | number | 自動採番 |
| name | string | 種目名。**重複不可** |
| muscleGroup | MuscleGroup | chest / back / shoulders / arms / legs / core / other |
| equipment | EquipmentType | dumbbell / bodyweight / other |
| dumbbellCount | 1 \| 2 | 同時に使うダンベルの数。片手ずつか両手に1個ずつかの区別 |
| muscleArchitecture | 'parallel' \| 'pennate' | 平行筋／羽状筋。既定の回数レンジの根拠 |
| target | ProgressionTarget | `{ repsMin, repsMax, sets }`。重量を上げる基準 |
| restSec | number | この種目のセット間休憩の目安（秒） |
| referenceUrl | string \| null | フォーム確認用の参照先。null なら種目名での YouTube 検索 |
| isArchived | boolean | 一覧から隠しているか |
| createdAt | string | ISO 8601 |

索引: `++id, &name, muscleGroup`

`isArchived` は索引に含めない。IndexedDB は boolean をキーにできないため。

### workouts（1日のセッション）

| 項目 | 型 | 説明 |
|---|---|---|
| id | number | 自動採番 |
| date | string | `YYYY-MM-DD`（ローカル日付）。**重複不可** |
| note | string | その日のメモ |
| bodyWeightKg | number \| null | v8 より前の体重。以後は measurements に持つ（互換のため残置）|
| startedAt | string | ISO 8601 |
| finishedAt | string \| null | 現状は未使用（将来の拡張用） |

索引: `++id, &date`

`date` を一意にすることで「1日1ワークアウト」を保証している。

### sets（1セットの記録）

| 項目 | 型 | 説明 |
|---|---|---|
| id | number | 自動採番 |
| workoutId | number | 所属するワークアウト |
| exerciseId | number | 種目 |
| order | number | ワークアウト内での並び順（1 始まりの連番） |
| weightKg | number | **ダンベル片手あたり**の重量。自重種目は 0 |
| reps | number | 回数（1 以上の整数） |
| rpe | number \| null | 1〜10。未入力は null |
| restSec | number \| null | 直前のセットからの休憩秒数（実測） |
| restTargetSec | number \| null | このセットの後に取る休憩の目安。null なら種目の設定を使う |
| isWarmup | boolean | ウォームアップか |
| recordedAt | string | ISO 8601 |

索引: `++id, workoutId, exerciseId, [workoutId+order], [exerciseId+recordedAt]`

### templates（メニュー）

| 項目 | 型 | 説明 |
|---|---|---|
| id | number | 自動採番 |
| name | string | メニュー名 |
| note | string | メモ |
| order | number | 並び順 |
| items | TemplateItem[] | 種目の構成（ドキュメント内に埋め込み） |

`TemplateItem` = `{ exerciseId, targetSets, targetReps, targetWeightKg }`

件数が少なく単独で検索する必要もないため、別テーブルにせず埋め込んでいる。

索引: `++id, order`

### meals（食事の記録）

| 項目 | 型 | 説明 |
|---|---|---|
| id | number | 自動採番 |
| date | string | 'YYYY-MM-DD' |
| mealType | MealType | breakfast / lunch / dinner / snack |
| foodId | string | 成分表の食品番号、または 'custom:&lt;id&gt;' |
| foodName | string | 記録時点の食品名 |
| grams | number | 食べた量 |
| nutrition | Nutrition | **食べた量ぶんの栄養価**。記録時点の値を焼き付ける |
| order | number | 同じ日・同じ区分での並び順 |
| recordedAt | string | ISO 8601 |

索引: `++id, date, [date+mealType]`

### customFoods（マイ食品）

| 項目 | 型 | 説明 |
|---|---|---|
| id | number | 自動採番 |
| name | string | 食品名。**重複不可** |
| basisGrams | number | nutrition が何 g 分の値か（例: 1食30g当たりなら 30） |
| nutrition | Nutrition | 基準量あたりの栄養価 |
| isArchived | boolean | 一覧から隠しているか |
| createdAt | string | ISO 8601 |

索引: `++id, &name`

### measurements（体組成）

| 項目 | 型 | 説明 |
|---|---|---|
| id | number | 自動採番 |
| date | string | 'YYYY-MM-DD'。**重複不可**（1日1件） |
| weightKg | number | 体重 |
| bodyFatPercent | number \| null | 体脂肪率 |
| muscleMassKg | number \| null | 筋肉量 |
| visceralFatLevel | number \| null | 内臓脂肪レベル |
| basalMetabolicRateKcal | number \| null | 基礎代謝量。収支の計算に使う |
| recordedAt | string | ISO 8601 |

索引: `++id, &date`

### cardioSessions（有酸素運動）

| 項目 | 型 | 説明 |
|---|---|---|
| id | number | 自動採番 |
| date | string | 'YYYY-MM-DD' |
| activity | CardioActivity | running / walking / cycling |
| distanceKm | number | 距離 |
| durationSec | number | 所要時間 |
| note | string | メモ |
| recordedAt | string | ISO 8601 |

索引: `++id, date`

### mealTemplates（献立）

| 項目 | 型 | 説明 |
|---|---|---|
| id | number | 自動採番 |
| name | string | 献立の名前 |
| order | number | 並び順 |
| items | MealTemplateItem[] | `{ foodId, foodName, grams, nutrition }`。件数が少ないため埋め込む |

索引: `++id, order`

### backupTargets（書き出し先・単一レコード）

| 項目 | 型 | 説明 |
|---|---|---|
| id | 1 | 固定値 |
| handle | FileSystemFileHandle | 覚えている書き出し先 |

索引: `id`

端末とブラウザに紐づき JSON にできないため、**バックアップの中身には含めない**。

### settings（設定・単一レコード）

| 項目 | 型 | 説明 |
|---|---|---|
| id | 1 | 固定値 |
| dumbbellStepsKg | number[] | 設定できる重量の段階（昇順・重複なし） |
| lastBackupAt | string \| null | 最終バックアップ日時 |
| backupReminderDays | number | この日数を超えたら警告する |
| restSecByMuscleGroup | Record<MuscleGroup, number> | 部位ごとの既定の休憩秒数。新規種目の初期値 |
| isRestAlarmEnabled | boolean | 休憩終了を音で知らせるか。有効な間は休憩中の画面点灯も行う |
| restAlarmDurationSec | number | アラームを鳴らし続ける長さ（秒）|
| nutritionTarget | NutritionTarget | 1日の目標（kcal / P / F / C） |
| heightCm | number \| null | 身長。BMI に使う。日々変わらないので測定ごとには持たない |

索引: `id`

## スキーマのバージョン

| version | 変更内容 |
|---|---|
| 1 | 初版 |
| 2 | 種目に `target`（重量を上げる基準）を追加。既存レコードは移行時に既定値 8〜12回×3セット で埋める |
| 3 | 種目に `muscleArchitecture` と `restSec` を追加。分類は種目名から解決し、回数レンジは**利用者が変更していない場合のみ**構造別の既定値へ置き換える |
| 4 | 種目に `referenceUrl` を追加。既存レコードは null（＝検索にフォールバック） |

設定は項目を増やしても移行を書かず、`getSettings` が既定値で欠けを補う。

## 層の分け方

```
src/domain/       純粋なロジックと型。永続化を知らない。テストの主対象
src/data/         Dexie スキーマとリポジトリ。ドメイン型を読み書きする
src/features/     画面。リポジトリを呼び、ドメインのロジックで計算する
                  workout/ は日付を問わない編集の共通部品（useWorkoutEditor ほか）
                  today/ はそれに休憩タイマーとアラームを足した今日の画面
src/components/   画面をまたいで使う UI 部品
src/hooks/        画面をまたいで使うデータ購読・状態
```

依存の向きは `features → data → domain` の一方向。`domain` は何にも依存しない。

## バックアップ形式

`src/domain/backup.ts`。JSON で全テーブルをそのまま書き出す。

```json
{
  "app": "kintore-note",
  "version": 1,
  "exportedAt": "2026-08-02T10:00:00.000Z",
  "data": { "exercises": [], "workouts": [], "sets": [], "templates": [], "settings": {} }
}
```

読み込み時は `parseBackup` で全項目を検証してから取り込む。
ID の整合性が壊れないよう、部分取り込みはせず**全消去してから入れ直す**。
