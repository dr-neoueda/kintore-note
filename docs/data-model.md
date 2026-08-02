# データモデル

保存先は端末内の IndexedDB（Dexie 経由）。スキーマ定義は `src/data/db.ts`。

## テーブル

### exercises（種目マスタ）

| 項目 | 型 | 説明 |
|---|---|---|
| id | number | 自動採番 |
| name | string | 種目名。**重複不可** |
| muscleGroup | MuscleGroup | chest / back / shoulders / arms / legs / core / other |
| equipment | EquipmentType | dumbbell / bodyweight / other |
| dumbbellCount | 1 \| 2 | 同時に使うダンベルの数。ボリューム計算の倍率 |
| muscleArchitecture | 'parallel' \| 'pennate' | 平行筋／羽状筋。既定の回数レンジの根拠 |
| target | ProgressionTarget | `{ repsMin, repsMax, sets }`。重量を上げる基準 |
| restSec | number | この種目のセット間休憩の目安（秒） |
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
| bodyWeightKg | number \| null | その日の体重 |
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
| restSec | number \| null | 直前のセットからの休憩秒数 |
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

### settings（設定・単一レコード）

| 項目 | 型 | 説明 |
|---|---|---|
| id | 1 | 固定値 |
| dumbbellStepsKg | number[] | 設定できる重量の段階（昇順・重複なし） |
| lastBackupAt | string \| null | 最終バックアップ日時 |
| backupReminderDays | number | この日数を超えたら警告する |
| restSecByMuscleGroup | Record<MuscleGroup, number> | 部位ごとの既定の休憩秒数。新規種目の初期値 |

索引: `id`

## スキーマのバージョン

| version | 変更内容 |
|---|---|
| 1 | 初版 |
| 2 | 種目に `target`（重量を上げる基準）を追加。既存レコードは移行時に既定値 8〜12回×3セット で埋める |
| 3 | 種目に `muscleArchitecture` と `restSec` を追加。分類は種目名から解決し、回数レンジは**利用者が変更していない場合のみ**構造別の既定値へ置き換える |

設定は項目を増やしても移行を書かず、`getSettings` が既定値で欠けを補う。

## 層の分け方

```
src/domain/       純粋なロジックと型。永続化を知らない。テストの主対象
src/data/         Dexie スキーマとリポジトリ。ドメイン型を読み書きする
src/features/     画面。リポジトリを呼び、ドメインのロジックで計算する
                  （today/ はタブ名こそ「ホーム」だが、扱う対象は今日のワークアウト）
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
