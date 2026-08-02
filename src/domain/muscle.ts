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
  クランチ: 'parallel',
  ダンベルサイドベンド: 'parallel',
}

/**
 * 種目名から筋構造を決める。
 * 既知の種目は個別の分類を使い、それ以外は部位の既定にする。
 */
export function resolveArchitecture(
  exerciseName: string,
  muscleGroup: MuscleGroup,
): MuscleArchitecture {
  return (
    ARCHITECTURE_BY_SEED_EXERCISE[exerciseName.trim()] ??
    DEFAULT_ARCHITECTURE_BY_MUSCLE_GROUP[muscleGroup]
  )
}
