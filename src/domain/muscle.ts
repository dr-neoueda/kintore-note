import type { MuscleArchitecture, MuscleGroup, ProgressionTarget } from './types'

/**
 * 筋の構造ごとの既定の回数レンジ。
 *
 * 平行筋（紡錘状筋）は線維が長く可動域が大きいため高めの回数、
 * 羽状筋は単位体積あたりの線維数が多く高張力に向くため低めの回数を既定とする。
 *
 * 注記: この対応づけは解剖学的分類にもとづく実践的な指針であり、
 * 「この構造にはこの回数」という形で対照試験に裏づけられたものではない。
 * 筋肥大は限界近くまで追い込めば広い回数域で起こるため、
 * 種目ごとに変更できるようにしてある。
 */
export const PARALLEL_TARGET: ProgressionTarget = { repsMin: 10, repsMax: 15, sets: 3 }
export const PENNATE_TARGET: ProgressionTarget = { repsMin: 8, repsMax: 12, sets: 3 }

export function defaultTargetForArchitecture(
  architecture: MuscleArchitecture,
): ProgressionTarget {
  return architecture === 'parallel' ? { ...PARALLEL_TARGET } : { ...PENNATE_TARGET }
}

/**
 * 部位ごとの既定のセット間休憩（秒）。
 *
 * 筋肥大を目的とした休憩時間のメタ分析では、短い休憩（1分程度）より
 * 2分以上の休憩の方が同等かそれ以上の結果になるとされる。
 * 総挙上量（重量×回数×セット数）を維持できることが主な理由と考えられている。
 * 一方、単関節・小筋群では回復が速く、60〜90秒でも総挙上量を保ちやすい。
 *
 * そこで「動員される筋量と関節の数」に応じて段階的に設定している。
 */
export const DEFAULT_REST_SEC_BY_MUSCLE_GROUP: Readonly<Record<MuscleGroup, number>> = {
  // 全身性の疲労が最も大きい
  legs: 180,
  // 多関節・大筋群
  back: 150,
  chest: 150,
  // プレス系は多関節だがレイズ系は単関節
  shoulders: 120,
  // 単関節中心
  arms: 90,
  // 低負荷・高回数になりやすい
  core: 60,
  other: 120,
}

export function defaultRestSecForMuscleGroup(muscleGroup: MuscleGroup): number {
  return DEFAULT_REST_SEC_BY_MUSCLE_GROUP[muscleGroup]
}

/**
 * 部位から推定する既定の筋構造。
 * 部位の中で代表的な筋にそろえている（肩＝三角筋、脚＝大腿四頭筋など）。
 * 実際には同じ部位に両方が混在するため、種目ごとの上書きを前提とする。
 */
export const DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP: Readonly<
  Record<MuscleGroup, MuscleArchitecture>
> = {
  // 大胸筋は腱に対して線維が斜めに集まる
  chest: 'pennate',
  // 広背筋・僧帽筋は線維が長く平行に近い
  back: 'parallel',
  // 三角筋は多羽状筋
  shoulders: 'pennate',
  // 上腕二頭筋は紡錘状筋。三頭種目は種目名で上書きする
  arms: 'parallel',
  // 大腿四頭筋・下腿三頭筋は羽状筋
  legs: 'pennate',
  // 腹直筋は平行筋
  core: 'parallel',
  other: 'pennate',
}

/**
 * 初期種目の筋構造。
 * 同じ部位でも効かせる筋が違えば分類が変わるため、種目名で個別に持つ。
 */
export const ARCHITECTURE_BY_SEED_EXERCISE: Readonly<Record<string, MuscleArchitecture>> = {
  // 胸（大胸筋）
  インクラインダンベルプレス: 'pennate',
  ダンベルベンチプレス: 'pennate',
  インクラインダンベルフライ: 'pennate',
  ダンベルフライ: 'pennate',
  プッシュアップ: 'pennate',
  // 広背筋への関与が大きい
  ダンベルプルオーバー: 'parallel',

  // 背中（広背筋・脊柱起立筋）
  ワンハンドダンベルロウ: 'parallel',
  ダンベルベントオーバーロウ: 'parallel',
  ダンベルデッドリフト: 'parallel',

  // 肩（三角筋は羽状筋、僧帽筋は平行筋）
  ダンベルショルダープレス: 'pennate',
  サイドレイズ: 'pennate',
  リアレイズ: 'pennate',
  フロントレイズ: 'pennate',
  ダンベルシュラッグ: 'parallel',

  // 腕（二頭・腕橈骨筋は平行筋、三頭は羽状筋）
  ダンベルカール: 'parallel',
  インクラインダンベルカール: 'parallel',
  ハンマーカール: 'parallel',
  コンセントレーションカール: 'parallel',
  ダンベルフレンチプレス: 'pennate',
  トライセプスキックバック: 'pennate',

  // 脚（大腿四頭筋・下腿三頭筋は羽状筋、ハムストリングスは平行筋）
  ダンベルスクワット: 'pennate',
  ダンベルランジ: 'pennate',
  ブルガリアンスクワット: 'pennate',
  ダンベルルーマニアンデッドリフト: 'parallel',
  カーフレイズ: 'pennate',

  // 体幹（腹直筋・腹斜筋）
  プランク: 'parallel',
  レッグレイズ: 'parallel',
  バイシクルクランチ: 'parallel',
  サイドプランク: 'parallel',
  マウンテンクライマー: 'parallel',
  クランチ: 'parallel',
  ダンベルサイドベンド: 'parallel',
}

/**
 * 自分で追加した種目を、名前に含まれる語から分類する。
 *
 * 部位の既定だけに頼ると、腕は「二頭に合わせて平行筋」なので、
 * 自分で足した三頭の種目まで平行筋（高めの回数）になってしまう。
 * 同じ部位に両方の構造が混在する腕・脚・背中で特に効く。
 *
 * 上から順に見て、最初に当たったものを採る。
 * 「トライセプスキックバック」のように両方の語を含む名前があるため、
 * 並び順が判定の優先順になる。
 */
const ARCHITECTURE_KEYWORDS: readonly (readonly [string, MuscleArchitecture])[] = [
  // 上腕三頭筋（羽状筋）
  ['三頭', 'pennate'],
  ['トライセプス', 'pennate'],
  ['フレンチプレス', 'pennate'],
  ['キックバック', 'pennate'],
  ['スカルクラッシャー', 'pennate'],
  ['プレスダウン', 'pennate'],
  ['ディップス', 'pennate'],
  ['ナロー', 'pennate'],
  // 上腕二頭筋・腕橈骨筋（紡錘状筋）
  ['二頭', 'parallel'],
  ['ビセップス', 'parallel'],
  ['カール', 'parallel'],
  // 三角筋（多羽状筋）
  ['三角筋', 'pennate'],
  ['レイズ', 'pennate'],
  ['ショルダープレス', 'pennate'],
  // 僧帽筋・広背筋（線維が長い）
  ['シュラッグ', 'parallel'],
  ['広背', 'parallel'],
  ['ラット', 'parallel'],
  ['プルダウン', 'parallel'],
  ['プルオーバー', 'parallel'],
  ['ロウ', 'parallel'],
  ['懸垂', 'parallel'],
  // 大腿四頭筋・下腿三頭筋（羽状筋）
  ['スクワット', 'pennate'],
  ['ランジ', 'pennate'],
  ['レッグプレス', 'pennate'],
  ['レッグエクステンション', 'pennate'],
  ['カーフ', 'pennate'],
  // ハムストリングス（線維が長い）
  ['ハムストリング', 'parallel'],
  ['レッグカール', 'parallel'],
  ['ルーマニアン', 'parallel'],
  // 腹直筋・腹斜筋（平行筋）
  ['腹', 'parallel'],
  ['クランチ', 'parallel'],
  ['プランク', 'parallel'],
  ['シットアップ', 'parallel'],
  ['レッグレイズ', 'parallel'],
]

/** 名前に含まれる語から筋構造を推定する。当たらなければ null。 */
function inferArchitectureFromName(name: string): MuscleArchitecture | null {
  const found = ARCHITECTURE_KEYWORDS.find(([keyword]) => name.includes(keyword))
  return found?.[1] ?? null
}

/**
 * 種目名から筋構造を決める。
 *
 * 初期種目は個別の分類を使い、自分で足した種目は名前の語から推定する。
 * どちらにも当たらなければ部位の既定にする。
 */
export function resolveArchitecture(
  exerciseName: string,
  muscleGroup: MuscleGroup,
): MuscleArchitecture {
  const name = exerciseName.trim()

  return (
    ARCHITECTURE_BY_SEED_EXERCISE[name] ??
    inferArchitectureFromName(name) ??
    DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP[muscleGroup]
  )
}
