import { normalizeFoodKeyword } from './food'

/**
 * よく使う食品のショートカット。
 *
 * 成分表の名前は正式で、同じ食品に多くの版がある。
 * 「精白米」で引くと、陸稲・おかゆ・おもゆ・もち米まで13件が並び、
 * 探している「炊いた白ごはん」がどれなのか分からない。
 * しかも生と調理済みではエネルギーが倍近く違う（生342 / めし156 kcal）。
 *
 * そこで日常語から「まずこれ」を1つに定めて先頭に出す。
 * 一覧そのものは残すので、別の版が要るときはこれまで通り選べる。
 */

export interface FoodPortion {
  readonly label: string
  readonly grams: number
}

export interface CommonFood {
  /** 成分表の食品番号。 */
  readonly id: string
  /** 画面に出す分かりやすい名前。 */
  readonly label: string
  /** この語で引けるようにする。 */
  readonly keywords: readonly string[]
  /** よく使う分量。量の入力でボタンとして出す。 */
  readonly portions: readonly FoodPortion[]
}

/** 迷いやすい「生か調理済みか」は名前に必ず書く。 */
export const COMMON_FOODS: readonly CommonFood[] = [
  // 主食
  {
    id: '01088',
    label: 'ごはん（白米・炊いた）',
    keywords: ['ごはん', 'ご飯', '白米', '白ごはん', '米', 'ライス', '精白米'],
    portions: [
      { label: '茶碗軽く1杯', grams: 150 },
      { label: '茶碗1杯', grams: 180 },
      { label: '丼1杯', grams: 250 },
    ],
  },
  {
    id: '01085',
    label: '玄米ごはん（炊いた）',
    keywords: ['玄米', 'げんまい'],
    portions: [
      { label: '茶碗1杯', grams: 180 },
      { label: '茶碗軽く1杯', grams: 150 },
    ],
  },
  {
    id: '01026',
    label: '食パン',
    keywords: ['食パン', 'パン', 'しょくぱん'],
    portions: [
      { label: '6枚切1枚', grams: 60 },
      { label: '8枚切1枚', grams: 45 },
      { label: '5枚切1枚', grams: 72 },
    ],
  },
  {
    id: '01039',
    label: 'うどん（ゆで）',
    keywords: ['うどん'],
    portions: [{ label: '1玉', grams: 230 }],
  },
  {
    id: '01128',
    label: 'そば（ゆで）',
    keywords: ['そば', '蕎麦'],
    portions: [{ label: '1玉', grams: 180 }],
  },
  {
    id: '01064',
    label: 'パスタ（ゆで）',
    keywords: ['パスタ', 'スパゲッティ', 'スパゲティ', 'マカロニ'],
    portions: [{ label: '乾100g分', grams: 240 }],
  },
  {
    id: '01048',
    label: '中華めん（ゆで）',
    keywords: ['中華めん', 'ラーメン', '中華麺'],
    portions: [{ label: '1玉', grams: 230 }],
  },
  {
    id: '01117',
    label: '切りもち',
    keywords: ['もち', '餅', '切り餅'],
    portions: [{ label: '1個', grams: 50 }],
  },
  {
    id: '01004',
    label: 'オートミール',
    keywords: ['オートミール', 'オーツ'],
    portions: [
      { label: '1食', grams: 30 },
      { label: '多め', grams: 50 },
    ],
  },
  {
    id: '01137',
    label: 'コーンフレーク',
    keywords: ['コーンフレーク', 'シリアル'],
    portions: [{ label: '1食', grams: 40 }],
  },

  // 肉・魚・卵・大豆
  {
    id: '11220',
    label: '鶏むね肉（皮なし・生）',
    keywords: ['鶏むね', 'とりむね', 'むね肉', '鶏胸'],
    portions: [
      { label: '1枚', grams: 250 },
      { label: '半分', grams: 125 },
    ],
  },
  {
    // 成分表に「むね・ゆで」は無く、src/domain/derivedFoods.ts で見積もっている
    id: '11220y',
    label: '鶏むね肉（皮なし・ゆで）',
    keywords: ['鶏むねゆで', 'とりむねゆで', '茹で鶏', 'ゆで鶏', 'サラダチキン', '鶏胸茹で'],
    portions: [
      { label: '1枚分', grams: 200 },
      { label: '半分', grams: 100 },
    ],
  },
  {
    id: '11219',
    label: '鶏むね肉（皮つき・生）',
    keywords: ['鶏むね皮つき', 'むね皮つき'],
    portions: [{ label: '1枚', grams: 280 }],
  },
  {
    id: '11224',
    label: '鶏もも肉（皮なし・生）',
    keywords: ['鶏もも', 'とりもも', 'もも肉'],
    portions: [{ label: '1枚', grams: 200 }],
  },
  {
    id: '11227',
    label: 'ささみ（生）',
    keywords: ['ささみ', 'ササミ'],
    portions: [{ label: '1本', grams: 45 }],
  },
  {
    id: '11123',
    label: '豚ロース（脂身つき・生）',
    keywords: ['豚ロース', 'ぶたロース', 'ポークロース'],
    portions: [{ label: '1枚', grams: 100 }],
  },
  {
    id: '11129',
    label: '豚ばら（生）',
    keywords: ['豚ばら', '豚バラ', 'ばら肉'],
    portions: [{ label: '1枚', grams: 30 }],
  },
  {
    id: '11075',
    label: '牛もも（輸入・生）',
    keywords: ['牛もも', 'ぎゅうもも'],
    portions: [{ label: '1食分', grams: 100 }],
  },
  {
    id: '12004',
    label: '卵（生）',
    keywords: ['卵', 'たまご', '玉子', '鶏卵', 'エッグ'],
    portions: [
      { label: '1個', grams: 50 },
      { label: 'L1個', grams: 60 },
      { label: '2個', grams: 100 },
    ],
  },
  {
    id: '12005',
    label: 'ゆで卵',
    keywords: ['ゆで卵', 'ゆでたまご', '茹で卵'],
    portions: [{ label: '1個', grams: 50 }],
  },
  {
    id: '10134',
    label: 'さけ（生）',
    keywords: ['さけ', '鮭', 'サーモン', 'しゃけ'],
    portions: [{ label: '1切れ', grams: 80 }],
  },
  {
    id: '10154',
    label: 'さば（生）',
    keywords: ['さば', '鯖'],
    portions: [{ label: '半身', grams: 100 }],
  },
  {
    id: '10003',
    label: 'あじ（生）',
    keywords: ['あじ', '鯵'],
    portions: [{ label: '1尾', grams: 70 }],
  },
  {
    id: '10260',
    label: 'ツナ缶（水煮）',
    keywords: ['ツナ', 'ツナ缶', 'シーチキン'],
    portions: [{ label: '1缶', grams: 70 }],
  },
  {
    id: '10263',
    label: 'ツナ缶（油漬）',
    keywords: ['ツナ油漬', 'ツナ缶油'],
    portions: [{ label: '1缶', grams: 70 }],
  },
  {
    id: '10055',
    label: 'しらす干し',
    keywords: ['しらす', 'シラス', 'ちりめん'],
    portions: [{ label: '大さじ1', grams: 5 }],
  },
  {
    id: '04046',
    label: '納豆',
    keywords: ['納豆', 'なっとう'],
    portions: [{ label: '1パック', grams: 45 }],
  },
  {
    id: '04032',
    label: '木綿豆腐',
    keywords: ['豆腐', 'とうふ', '木綿'],
    portions: [
      { label: '1丁', grams: 300 },
      { label: '半丁', grams: 150 },
    ],
  },
  {
    id: '04033',
    label: '絹ごし豆腐',
    keywords: ['絹ごし', '絹豆腐'],
    portions: [
      { label: '1丁', grams: 300 },
      { label: '半丁', grams: 150 },
    ],
  },
  {
    id: '04052',
    label: '豆乳',
    keywords: ['豆乳', 'とうにゅう'],
    portions: [{ label: 'コップ1杯', grams: 200 }],
  },
  {
    id: '11176',
    label: 'ロースハム',
    keywords: ['ハム', 'ロースハム'],
    portions: [{ label: '1枚', grams: 20 }],
  },
  {
    id: '11186',
    label: 'ウインナー',
    keywords: ['ウインナー', 'ソーセージ', 'ウィンナー'],
    portions: [{ label: '1本', grams: 20 }],
  },

  // 乳・果物・野菜
  {
    id: '13003',
    label: '牛乳',
    keywords: ['牛乳', 'ぎゅうにゅう', 'ミルク'],
    portions: [
      { label: 'コップ1杯', grams: 200 },
      { label: '1本', grams: 1000 },
    ],
  },
  {
    id: '13025',
    label: 'ヨーグルト（無糖）',
    keywords: ['ヨーグルト', 'よーぐると'],
    portions: [{ label: '1個', grams: 100 }],
  },
  {
    id: '13040',
    label: 'プロセスチーズ',
    keywords: ['チーズ', 'ちーず'],
    portions: [{ label: '1個', grams: 18 }],
  },
  {
    id: '07107',
    label: 'バナナ',
    keywords: ['バナナ', 'ばなな'],
    portions: [{ label: '1本', grams: 90 }],
  },
  {
    id: '07148',
    label: 'りんご（皮なし）',
    keywords: ['りんご', 'リンゴ', '林檎'],
    portions: [{ label: '1個', grams: 250 }],
  },
  {
    id: '07026',
    label: 'みかん',
    keywords: ['みかん', 'ミカン', '蜜柑'],
    portions: [{ label: '1個', grams: 80 }],
  },
  {
    id: '06264',
    label: 'ブロッコリー（ゆで）',
    keywords: ['ブロッコリー', 'ぶろっこりー'],
    portions: [{ label: '1食分', grams: 80 }],
  },
  {
    id: '06061',
    label: 'キャベツ（生）',
    keywords: ['キャベツ', 'きゃべつ'],
    portions: [{ label: '1食分', grams: 80 }],
  },
  {
    id: '06153',
    label: 'たまねぎ（生）',
    keywords: ['たまねぎ', '玉ねぎ', '玉葱', 'オニオン'],
    portions: [{ label: '1個', grams: 200 }],
  },
  {
    id: '06212',
    label: 'にんじん（生）',
    keywords: ['にんじん', '人参', 'ニンジン'],
    portions: [{ label: '1本', grams: 150 }],
  },
  {
    id: '06182',
    label: 'トマト（生）',
    keywords: ['トマト', 'とまと'],
    portions: [{ label: '1個', grams: 150 }],
  },
  {
    id: '06268',
    label: 'ほうれん草（ゆで）',
    keywords: ['ほうれん草', 'ほうれんそう'],
    portions: [{ label: '1食分', grams: 70 }],
  },
  {
    id: '06065',
    label: 'きゅうり（生）',
    keywords: ['きゅうり', 'キュウリ', '胡瓜'],
    portions: [{ label: '1本', grams: 100 }],
  },
  {
    id: '02063',
    label: 'じゃがいも（生）',
    keywords: ['じゃがいも', 'ジャガイモ', '芋', 'ポテト'],
    portions: [{ label: '1個', grams: 130 }],
  },
  {
    id: '02046',
    label: 'さつまいも（蒸し）',
    keywords: ['さつまいも', 'サツマイモ', '薩摩芋'],
    portions: [{ label: '1本', grams: 200 }],
  },
  {
    id: '08039',
    label: 'しいたけ（生）',
    keywords: ['しいたけ', '椎茸', 'シイタケ'],
    portions: [{ label: '1個', grams: 15 }],
  },
  {
    id: '09044',
    label: 'カットわかめ（乾）',
    keywords: ['わかめ', 'ワカメ', '若布'],
    portions: [{ label: '1食分', grams: 2 }],
  },

  // 種実・油・調味料
  {
    id: '05040',
    label: 'アーモンド（いり）',
    keywords: ['アーモンド', 'あーもんど'],
    portions: [{ label: '10粒', grams: 12 }],
  },
  {
    id: '05014',
    label: 'くるみ（いり）',
    keywords: ['くるみ', 'クルミ', '胡桃'],
    portions: [{ label: '5粒', grams: 20 }],
  },
  {
    id: '05018',
    label: 'ごま（いり）',
    keywords: ['ごま', 'ゴマ', '胡麻'],
    portions: [{ label: '小さじ1', grams: 3 }],
  },
  {
    id: '14001',
    label: 'オリーブ油',
    keywords: ['オリーブ', 'オリーブオイル'],
    portions: [
      { label: '大さじ1', grams: 12 },
      { label: '小さじ1', grams: 4 },
    ],
  },
  {
    id: '14017',
    label: 'バター（有塩）',
    keywords: ['バター', 'ばたー'],
    portions: [{ label: '大さじ1', grams: 12 }],
  },
  {
    id: '17007',
    label: 'しょうゆ（こいくち）',
    keywords: ['しょうゆ', '醤油', 'しょう油'],
    portions: [
      { label: '大さじ1', grams: 18 },
      { label: '小さじ1', grams: 6 },
    ],
  },
  {
    id: '17045',
    label: 'みそ（淡色辛みそ）',
    keywords: ['みそ', '味噌', 'ミソ'],
    portions: [{ label: '大さじ1', grams: 18 }],
  },
  {
    id: '17042',
    label: 'マヨネーズ',
    keywords: ['マヨネーズ', 'マヨ'],
    portions: [{ label: '大さじ1', grams: 12 }],
  },
  {
    id: '17110',
    label: 'ぽん酢しょうゆ',
    keywords: ['ぽん酢', 'ポン酢'],
    portions: [{ label: '大さじ1', grams: 18 }],
  },
  {
    id: '17036',
    label: 'ケチャップ',
    keywords: ['ケチャップ', 'けちゃっぷ'],
    portions: [{ label: '大さじ1', grams: 15 }],
  },
  {
    id: '17001',
    label: 'ウスターソース',
    keywords: ['ソース', 'ウスター'],
    portions: [{ label: '大さじ1', grams: 18 }],
  },
  {
    id: '17030',
    label: 'めんつゆ（三倍濃縮）',
    keywords: ['めんつゆ', 'つゆ'],
    portions: [{ label: '大さじ1', grams: 18 }],
  },
  {
    id: '17012',
    label: '食塩',
    keywords: ['塩', 'しお', '食塩'],
    portions: [{ label: '小さじ1', grams: 6 }],
  },
  {
    id: '03003',
    label: '砂糖（上白糖）',
    keywords: ['砂糖', 'さとう'],
    portions: [{ label: '大さじ1', grams: 9 }],
  },
  {
    id: '11140',
    label: '豚ヒレ（生）',
    keywords: ['豚ヒレ', 'ヒレ肉', 'ぶたヒレ'],
    portions: [{ label: '1食分', grams: 100 }],
  },
  {
    id: '11085',
    label: '牛ヒレ（生）',
    keywords: ['牛ヒレ', 'ぎゅうヒレ'],
    portions: [{ label: '1食分', grams: 100 }],
  },
  {
    id: '11064',
    label: '牛肩ロース（生）',
    keywords: ['牛肩ロース', '肩ロース'],
    portions: [{ label: '1枚', grams: 80 }],
  },
  {
    id: '11230',
    label: '鶏ひき肉（生）',
    keywords: ['鶏ひき肉', 'とりひき', '鶏ミンチ'],
    portions: [{ label: '1食分', grams: 100 }],
  },
  {
    id: '11163',
    label: '豚ひき肉（生）',
    keywords: ['豚ひき肉', 'ぶたひき', '豚ミンチ'],
    portions: [{ label: '1食分', grams: 100 }],
  },
  {
    id: '11089',
    label: '牛ひき肉（生）',
    keywords: ['牛ひき肉', 'ひき肉', 'ミンチ', '合いびき'],
    portions: [{ label: '1食分', grams: 100 }],
  },
  {
    id: '11288',
    label: '鶏むね肉（皮なし・焼き）',
    keywords: ['鶏むね焼き', 'むね焼き'],
    portions: [{ label: '1枚', grams: 180 }],
  },
  {
    id: '11232',
    label: '鶏レバー（生）',
    keywords: ['レバー', '肝臓', 'きも'],
    portions: [{ label: '1食分', grams: 60 }],
  },
  {
    id: '11183',
    label: 'ベーコン',
    keywords: ['ベーコン'],
    portions: [{ label: '1枚', grams: 17 }],
  },
  {
    id: '10136',
    label: 'さけ（焼き）',
    keywords: ['鮭焼き', 'さけ焼き', '焼き鮭'],
    portions: [{ label: '1切れ', grams: 70 }],
  },
  {
    id: '10205',
    label: 'たら（生）',
    keywords: ['たら', '鱈', 'まだら'],
    portions: [{ label: '1切れ', grams: 100 }],
  },
  {
    id: '10047',
    label: 'いわし（生）',
    keywords: ['いわし', '鰯'],
    portions: [{ label: '1尾', grams: 50 }],
  },
  {
    id: '10173',
    label: 'さんま（生）',
    keywords: ['さんま', '秋刀魚'],
    portions: [{ label: '1尾', grams: 100 }],
  },
  {
    id: '10086',
    label: 'かつお（春・生）',
    keywords: ['かつお', '鰹'],
    portions: [{ label: '1食分', grams: 80 }],
  },
  {
    id: '10253',
    label: 'まぐろ赤身（生）',
    keywords: ['まぐろ', '鮪', '赤身', '刺身'],
    portions: [{ label: '1食分', grams: 80 }],
  },
  {
    id: '10241',
    label: 'ぶり（生）',
    keywords: ['ぶり', '鰤'],
    portions: [{ label: '1切れ', grams: 80 }],
  },
  {
    id: '10415',
    label: 'えび（バナメイ・生）',
    keywords: ['えび', '海老', 'エビ'],
    portions: [{ label: '1尾', grams: 15 }],
  },
  {
    id: '10361',
    label: 'たこ（生）',
    keywords: ['たこ', '蛸', 'タコ'],
    portions: [{ label: '1食分', grams: 60 }],
  },
  {
    id: '10345',
    label: 'いか（するめいか・生）',
    keywords: ['いか', '烏賊', 'イカ'],
    portions: [{ label: '1食分', grams: 80 }],
  },
  {
    id: '10281',
    label: 'あさり（生）',
    keywords: ['あさり', '浅蜊'],
    portions: [{ label: '10個', grams: 40 }],
  },
  {
    id: '10311',
    label: 'ほたて（生）',
    keywords: ['ほたて', '帆立'],
    portions: [{ label: '1個', grams: 30 }],
  },
  {
    id: '10381',
    label: 'ちくわ',
    keywords: ['ちくわ', '竹輪'],
    portions: [{ label: '1本', grams: 30 }],
  },
  {
    id: '10379',
    label: 'かまぼこ',
    keywords: ['かまぼこ', '蒲鉾'],
    portions: [{ label: '1切れ', grams: 10 }],
  },
  {
    id: '06263',
    label: 'ブロッコリー（生）',
    keywords: ['ブロッコリー生'],
    portions: [{ label: '1食分', grams: 80 }],
  },
  {
    id: '06245',
    label: 'ピーマン（生）',
    keywords: ['ピーマン'],
    portions: [{ label: '1個', grams: 35 }],
  },
  {
    id: '06247',
    label: 'パプリカ（赤・生）',
    keywords: ['パプリカ', '赤ピーマン'],
    portions: [{ label: '1個', grams: 120 }],
  },
  {
    id: '06191',
    label: 'なす（生）',
    keywords: ['なす', '茄子', 'ナス'],
    portions: [{ label: '1本', grams: 80 }],
  },
  {
    id: '06048',
    label: 'かぼちゃ（西洋・生）',
    keywords: ['かぼちゃ', '南瓜', 'カボチャ'],
    portions: [{ label: '1食分', grams: 100 }],
  },
  {
    id: '06312',
    label: 'レタス（生）',
    keywords: ['レタス', 'れたす'],
    portions: [{ label: '1食分', grams: 50 }],
  },
  {
    id: '06291',
    label: 'もやし（生）',
    keywords: ['もやし', 'モヤシ'],
    portions: [{ label: '1袋', grams: 200 }],
  },
  {
    id: '06226',
    label: 'ねぎ（生）',
    keywords: ['ねぎ', 'ネギ', '長ねぎ', '葱'],
    portions: [{ label: '1本', grams: 100 }],
  },
  {
    id: '06223',
    label: 'にんにく（生）',
    keywords: ['にんにく', 'ニンニク', '大蒜'],
    portions: [{ label: '1かけ', grams: 6 }],
  },
  {
    id: '06103',
    label: 'しょうが（生）',
    keywords: ['しょうが', '生姜', 'ショウガ'],
    portions: [{ label: '1かけ', grams: 10 }],
  },
  {
    id: '06084',
    label: 'ごぼう（生）',
    keywords: ['ごぼう', '牛蒡', 'ゴボウ'],
    portions: [{ label: '1本', grams: 150 }],
  },
  {
    id: '06317',
    label: 'れんこん（生）',
    keywords: ['れんこん', '蓮根', 'レンコン'],
    portions: [{ label: '1食分', grams: 80 }],
  },
  {
    id: '06036',
    label: 'かぶ（生）',
    keywords: ['かぶ', '蕪'],
    portions: [{ label: '1個', grams: 80 }],
  },
  {
    id: '06132',
    label: 'だいこん（生）',
    keywords: ['だいこん', '大根', 'ダイコン'],
    portions: [{ label: '1食分', grams: 100 }],
  },
  {
    id: '06233',
    label: 'はくさい（生）',
    keywords: ['はくさい', '白菜', 'ハクサイ'],
    portions: [{ label: '1枚', grams: 100 }],
  },
  {
    id: '06015',
    label: '枝豆（生）',
    keywords: ['枝豆', 'えだまめ', 'エダマメ'],
    portions: [{ label: '1食分', grams: 50 }],
  },
  {
    id: '08001',
    label: 'えのき（生）',
    keywords: ['えのき', 'えのきたけ'],
    portions: [{ label: '1袋', grams: 100 }],
  },
  {
    id: '08016',
    label: 'しめじ（生）',
    keywords: ['しめじ', 'ぶなしめじ'],
    portions: [{ label: '1パック', grams: 100 }],
  },
  {
    id: '08028',
    label: 'まいたけ（生）',
    keywords: ['まいたけ', '舞茸'],
    portions: [{ label: '1パック', grams: 100 }],
  },
  {
    id: '08025',
    label: 'エリンギ（生）',
    keywords: ['エリンギ'],
    portions: [{ label: '1本', grams: 30 }],
  },
  {
    id: '08031',
    label: 'マッシュルーム（生）',
    keywords: ['マッシュルーム'],
    portions: [{ label: '1個', grams: 10 }],
  },
  {
    id: '09004',
    label: '焼きのり',
    keywords: ['のり', '海苔', 'ノリ'],
    portions: [{ label: '1枚', grams: 3 }],
  },
  {
    id: '09050',
    label: 'ひじき（乾）',
    keywords: ['ひじき', '鹿尾菜'],
    portions: [{ label: '1食分', grams: 5 }],
  },
  {
    id: '02010',
    label: 'さといも（生）',
    keywords: ['さといも', '里芋', 'サトイモ'],
    portions: [{ label: '1個', grams: 50 }],
  },
  {
    id: '02022',
    label: 'ながいも（生）',
    keywords: ['ながいも', '長芋', '山芋'],
    portions: [{ label: '1食分', grams: 100 }],
  },
  {
    id: '04039',
    label: '厚揚げ（生揚げ）',
    keywords: ['厚揚げ', '生揚げ'],
    portions: [{ label: '1枚', grams: 120 }],
  },
  {
    id: '04042',
    label: '高野豆腐（乾）',
    keywords: ['高野豆腐', '凍り豆腐'],
    portions: [{ label: '1個', grams: 17 }],
  },
  {
    id: '04051',
    label: 'おから（生）',
    keywords: ['おから', '卯の花'],
    portions: [{ label: '1食分', grams: 50 }],
  },
  {
    id: '04105',
    label: '大豆（ゆで）',
    keywords: ['大豆', 'だいず', '水煮大豆'],
    portions: [{ label: '1食分', grams: 50 }],
  },
  {
    id: '04066',
    label: 'ひよこ豆（ゆで）',
    keywords: ['ひよこ豆', 'ひよこまめ', 'ガルバンゾ'],
    portions: [{ label: '1食分', grams: 50 }],
  },
  {
    id: '04002',
    label: 'あずき（ゆで）',
    keywords: ['あずき', '小豆'],
    portions: [{ label: '1食分', grams: 50 }],
  },
  {
    id: '07006',
    label: 'アボカド（生）',
    keywords: ['アボカド'],
    portions: [{ label: '1個', grams: 140 }],
  },
  {
    id: '07012',
    label: 'いちご（生）',
    keywords: ['いちご', '苺', 'イチゴ'],
    portions: [{ label: '1粒', grams: 15 }],
  },
  {
    id: '07116',
    label: 'ぶどう（生）',
    keywords: ['ぶどう', '葡萄', 'ブドウ'],
    portions: [{ label: '1房', grams: 150 }],
  },
  {
    id: '07054',
    label: 'キウイ（緑・生）',
    keywords: ['キウイ', 'キウイフルーツ'],
    portions: [{ label: '1個', grams: 85 }],
  },
  {
    id: '07136',
    label: 'もも（生）',
    keywords: ['もも', '桃', 'ピーチ'],
    portions: [{ label: '1個', grams: 170 }],
  },
  {
    id: '07088',
    label: 'なし（生）',
    keywords: ['なし', '梨'],
    portions: [{ label: '1個', grams: 250 }],
  },
  {
    id: '07077',
    label: 'すいか（生）',
    keywords: ['すいか', '西瓜', 'スイカ'],
    portions: [{ label: '1切れ', grams: 200 }],
  },
  {
    id: '07049',
    label: 'かき（生）',
    keywords: ['かき', '柿'],
    portions: [{ label: '1個', grams: 180 }],
  },
  {
    id: '07124',
    label: 'ブルーベリー（生）',
    keywords: ['ブルーベリー'],
    portions: [{ label: '1食分', grams: 50 }],
  },
  {
    id: '01044',
    label: 'そうめん（ゆで）',
    keywords: ['そうめん', 'ひやむぎ'],
    portions: [{ label: '1束分', grams: 270 }],
  },
  {
    id: '01049',
    label: '蒸し中華めん',
    keywords: ['焼きそば', '蒸し中華めん'],
    portions: [{ label: '1玉', grams: 150 }],
  },
  {
    id: '02061',
    label: 'はるさめ（ゆで）',
    keywords: ['はるさめ', '春雨'],
    portions: [{ label: '1食分', grams: 80 }],
  },
  {
    id: '01079',
    label: 'パン粉（乾）',
    keywords: ['パン粉'],
    portions: [{ label: '大さじ1', grams: 3 }],
  },
  {
    id: '01015',
    label: '小麦粉（薄力粉）',
    keywords: ['小麦粉', '薄力粉'],
    portions: [{ label: '大さじ1', grams: 9 }],
  },
  {
    id: '13034',
    label: 'カマンベールチーズ',
    keywords: ['カマンベール'],
    portions: [{ label: '1食分', grams: 20 }],
  },
  {
    id: '13056',
    label: 'モッツァレラチーズ',
    keywords: ['モッツァレラ'],
    portions: [{ label: '1食分', grams: 20 }],
  },
  {
    id: '13014',
    label: '生クリーム（乳脂肪）',
    keywords: ['生クリーム', 'クリーム'],
    portions: [{ label: '大さじ1', grams: 15 }],
  },
  {
    id: '13027',
    label: '飲むヨーグルト（加糖）',
    keywords: ['飲むヨーグルト', 'ドリンクヨーグルト'],
    portions: [{ label: '1本', grams: 180 }],
  },
  {
    id: '13026',
    label: 'ヨーグルト（加糖）',
    keywords: ['ヨーグルト加糖', '加糖ヨーグルト'],
    portions: [{ label: '1個', grams: 100 }],
  },
  {
    id: '13042',
    label: 'アイスクリーム（高脂肪）',
    keywords: ['アイス', 'アイスクリーム'],
    portions: [{ label: '1個', grams: 100 }],
  },
  {
    id: '15116',
    label: 'ミルクチョコレート',
    keywords: ['チョコ', 'チョコレート'],
    portions: [{ label: '1枚', grams: 50 }],
  },
  {
    id: '15060',
    label: 'しょうゆせんべい',
    keywords: ['せんべい', '煎餅'],
    portions: [{ label: '1枚', grams: 10 }],
  },
  {
    id: '15009',
    label: 'カステラ',
    keywords: ['カステラ'],
    portions: [{ label: '1切れ', grams: 50 }],
  },
  {
    id: '05005',
    label: 'カシューナッツ',
    keywords: ['カシューナッツ'],
    portions: [{ label: '10粒', grams: 15 }],
  },
  {
    id: '05031',
    label: 'マカダミアナッツ',
    keywords: ['マカダミア'],
    portions: [{ label: '10粒', grams: 20 }],
  },
  {
    id: '05036',
    label: 'ピーナッツ',
    keywords: ['ピーナッツ', '落花生', 'ナッツ'],
    portions: [{ label: '10粒', grams: 10 }],
  },
  {
    id: '14006',
    label: 'サラダ油',
    keywords: ['サラダ油', '油', '調合油'],
    portions: [{ label: '大さじ1', grams: 12 }],
  },
  {
    id: '14002',
    label: 'ごま油',
    keywords: ['ごま油'],
    portions: [{ label: '小さじ1', grams: 4 }],
  },
  {
    id: '17015',
    label: '酢（穀物酢）',
    keywords: ['酢', 'お酢'],
    portions: [{ label: '大さじ1', grams: 15 }],
  },
  {
    id: '16025',
    label: 'みりん',
    keywords: ['みりん', '味醂'],
    portions: [{ label: '大さじ1', grams: 18 }],
  },
  {
    id: '16001',
    label: '料理酒（清酒）',
    keywords: ['料理酒', '日本酒', '清酒'],
    portions: [{ label: '大さじ1', grams: 15 }],
  },
  {
    id: '17051',
    label: 'カレールウ',
    keywords: ['カレールウ', 'カレー粉'],
    portions: [{ label: '1皿分', grams: 20 }],
  },
  {
    id: '17027',
    label: '固形コンソメ',
    keywords: ['コンソメ', 'ブイヨン'],
    portions: [{ label: '1個', grams: 5 }],
  },
  {
    id: '17028',
    label: '顆粒和風だし',
    keywords: ['和風だし', 'ほんだし', 'だしの素'],
    portions: [{ label: '小さじ1', grams: 3 }],
  },
  {
    id: '17093',
    label: '顆粒中華だし',
    keywords: ['中華だし', '鶏がらスープ'],
    portions: [{ label: '小さじ1', grams: 3 }],
  },
  {
    id: '17002',
    label: '中濃ソース',
    keywords: ['ソース', '中濃ソース'],
    portions: [{ label: '大さじ1', grams: 18 }],
  },
  {
    id: '17031',
    label: 'オイスターソース',
    keywords: ['オイスターソース'],
    portions: [{ label: '大さじ1', grams: 18 }],
  },
  {
    id: '17116',
    label: '和風ドレッシング',
    keywords: ['ドレッシング', '和風ドレッシング'],
    portions: [{ label: '大さじ1', grams: 15 }],
  },
  {
    id: '17044',
    label: 'みそ（甘みそ）',
    keywords: ['白みそ', '甘みそ'],
    portions: [{ label: '大さじ1', grams: 18 }],
  },
  {
    id: '03022',
    label: 'はちみつ',
    keywords: ['はちみつ', '蜂蜜', 'ハチミツ'],
    portions: [{ label: '大さじ1', grams: 21 }],
  },
  {
    id: '16045',
    label: 'コーヒー',
    keywords: ['コーヒー', '珈琲'],
    portions: [{ label: 'カップ1杯', grams: 200 }],
  },
  {
    id: '16037',
    label: '緑茶（せん茶）',
    keywords: ['緑茶', 'お茶', 'せん茶'],
    portions: [{ label: 'カップ1杯', grams: 200 }],
  },
  {
    id: '16006',
    label: 'ビール',
    keywords: ['ビール'],
    portions: [{ label: '中瓶1本', grams: 500 }],
  },
  {
    id: '16010',
    label: '白ワイン',
    keywords: ['ワイン', '白ワイン'],
    portions: [{ label: 'グラス1杯', grams: 100 }],
  },
  {
    id: '16057',
    label: 'スポーツドリンク',
    keywords: ['スポーツドリンク', 'ポカリ'],
    portions: [{ label: '1本', grams: 500 }],
  },
  {
    id: '16053',
    label: 'コーラ',
    keywords: ['コーラ', '炭酸'],
    portions: [{ label: '1本', grams: 500 }],
  },

  // 漬物。量るより数える方が早いので、分量は「1個」から始める
  {
    id: '07022',
    label: '梅干し（塩漬）',
    keywords: ['梅干し', 'うめぼし', '梅干', 'うめ'],
    portions: [
      // 成分表は可食部の値。中1個は種込み約10g、種を除くと約8g
      { label: '1個', grams: 8 },
      { label: '大1個', grams: 12 },
    ],
  },
  {
    // はちみつ梅などの味付きは、塩漬より食塩が半分以下（18.2g → 7.6g/100g）
    id: '07023',
    label: '梅干し（調味漬）',
    keywords: ['梅干し調味', 'はちみつ梅', 'うめぼし調味', '減塩梅干し'],
    portions: [
      { label: '1個', grams: 8 },
      { label: '大1個', grams: 12 },
    ],
  },
  {
    id: '06138',
    label: 'たくあん',
    keywords: ['たくあん', 'タクアン', '沢庵', 'たくわん'],
    portions: [
      { label: '1切れ', grams: 10 },
      { label: '3切れ', grams: 30 },
    ],
  },

  // 調理済み食品（成分表の18群）。惣菜・外食の一皿を、量が分かる形で引けるようにする
  {
    id: '18057',
    label: '炒飯（チャーハン）',
    keywords: ['炒飯', 'チャーハン', 'ちゃーはん', '焼き飯', '焼きめし'],
    portions: [{ label: '1皿', grams: 300 }, { label: '大盛', grams: 400 }],
  },
  {
    id: '18002',
    label: 'ぎょうざ',
    keywords: ['ぎょうざ', '餃子', 'ギョーザ'],
    portions: [{ label: '6個', grams: 130 }, { label: '1個', grams: 22 }],
  },
  {
    id: '18012',
    label: 'しゅうまい',
    keywords: ['しゅうまい', 'シュウマイ', '焼売'],
    portions: [{ label: '5個', grams: 100 }, { label: '1個', grams: 20 }],
  },
  {
    id: '18056',
    label: '春巻き',
    keywords: ['春巻き', 'はるまき'],
    portions: [{ label: '2本', grams: 100 }, { label: '1本', grams: 50 }],
  },
  {
    id: '18049',
    label: '麻婆豆腐',
    keywords: ['麻婆豆腐', 'マーボー豆腐', 'まーぼーどうふ'],
    portions: [{ label: '1皿', grams: 250 }],
  },
  {
    id: '18047',
    label: '酢豚',
    keywords: ['酢豚', 'すぶた'],
    portions: [{ label: '1皿', grams: 250 }],
  },
  {
    id: '18048',
    label: '八宝菜',
    keywords: ['八宝菜', 'はっぽうさい'],
    portions: [{ label: '1皿', grams: 250 }],
  },
  {
    id: '18040',
    label: 'チキンカレー（ルウ）',
    keywords: ['チキンカレー'],
    portions: [{ label: '1皿分', grams: 200 }],
  },
  {
    id: '18001',
    label: 'ビーフカレー（ルウ）',
    keywords: ['ビーフカレー', 'カレールウ'],
    portions: [{ label: '1皿分', grams: 200 }],
  },
  {
    id: '18041',
    label: 'ポークカレー（ルウ）',
    keywords: ['ポークカレー'],
    portions: [{ label: '1皿分', grams: 200 }],
  },
  {
    id: '18050',
    label: 'ハンバーグ（合いびき）',
    keywords: ['ハンバーグ', 'はんばーぐ'],
    portions: [{ label: '1個', grams: 150 }],
  },
  {
    id: '18051',
    label: 'チキンハンバーグ',
    keywords: ['チキンハンバーグ'],
    portions: [{ label: '1個', grams: 150 }],
  },
  {
    id: '18052',
    label: '豆腐ハンバーグ',
    keywords: ['豆腐ハンバーグ'],
    portions: [{ label: '1個', grams: 150 }],
  },
  {
    id: '18054',
    label: 'とりから揚げ',
    keywords: ['から揚げ', '唐揚げ', 'からあげ', '鶏の唐揚げ'],
    portions: [{ label: '1個', grams: 30 }, { label: '5個', grams: 150 }],
  },
  {
    id: '18053',
    label: 'お好み焼き',
    keywords: ['お好み焼き', 'おこのみやき'],
    portions: [{ label: '1枚', grams: 250 }],
  },
  {
    id: '18018',
    label: 'ポテトコロッケ',
    keywords: ['コロッケ', 'ころっけ'],
    portions: [{ label: '1個', grams: 70 }],
  },
  {
    id: '18043',
    label: 'カニクリームコロッケ',
    keywords: ['カニクリームコロッケ', 'クリームコロッケ'],
    portions: [{ label: '1個', grams: 70 }],
  },
  {
    id: '18022',
    label: 'メンチカツ',
    keywords: ['メンチカツ', 'めんちかつ'],
    portions: [{ label: '1個', grams: 90 }],
  },
  {
    id: '18020',
    label: 'えびフライ',
    keywords: ['えびフライ', 'エビフライ', '海老フライ'],
    portions: [{ label: '1本', grams: 35 }, { label: '3本', grams: 105 }],
  },
  {
    id: '18019',
    label: 'いかフライ',
    keywords: ['いかフライ', 'イカフライ'],
    portions: [{ label: '1個', grams: 40 }],
  },
  {
    id: '18055',
    label: 'かきフライ',
    keywords: ['かきフライ', 'カキフライ', '牡蠣フライ'],
    portions: [{ label: '1個', grams: 30 }, { label: '5個', grams: 150 }],
  },
  {
    id: '18021',
    label: '白身フライ',
    keywords: ['白身フライ'],
    portions: [{ label: '1個', grams: 60 }],
  },
  {
    id: '18015',
    label: 'ミートボール',
    keywords: ['ミートボール', '肉団子'],
    portions: [{ label: '1パック', grams: 100 }, { label: '1個', grams: 15 }],
  },
  {
    id: '18011',
    label: 'ビーフシチュー',
    keywords: ['ビーフシチュー'],
    portions: [{ label: '1皿', grams: 250 }],
  },
  {
    id: '18045',
    label: 'チキンシチュー',
    keywords: ['チキンシチュー', 'クリームシチュー'],
    portions: [{ label: '1皿', grams: 250 }],
  },
  {
    id: '18003',
    label: 'えびグラタン',
    keywords: ['グラタン', 'ぐらたん', 'えびグラタン'],
    portions: [{ label: '1皿', grams: 250 }],
  },
  {
    id: '18014',
    label: 'えびピラフ',
    keywords: ['ピラフ', 'ぴらふ'],
    portions: [{ label: '1皿', grams: 280 }],
  },
  {
    id: '18028',
    label: 'とん汁',
    keywords: ['とん汁', '豚汁', 'とんじる'],
    portions: [{ label: '1杯', grams: 180 }],
  },
  {
    id: '18036',
    label: '肉じゃが',
    keywords: ['肉じゃが', 'にくじゃが'],
    portions: [{ label: '1皿', grams: 200 }],
  },
  {
    id: '18035',
    label: '筑前煮',
    keywords: ['筑前煮', 'ちくぜんに', '煮しめ'],
    portions: [{ label: '1皿', grams: 180 }],
  },
  {
    id: '18033',
    label: 'きんぴらごぼう',
    keywords: ['きんぴら', 'キンピラ', 'きんぴらごぼう'],
    portions: [{ label: '1皿', grams: 60 }],
  },
  {
    id: '18030',
    label: '親子丼の具',
    keywords: ['親子丼の具'],
    portions: [{ label: '1杯分', grams: 180 }],
  },
  {
    id: '18031',
    label: '牛飯の具',
    keywords: ['牛丼の具', '牛飯の具'],
    portions: [{ label: '1杯分', grams: 150 }],
  },
  {
    id: '18032',
    label: '切り干し大根の煮物',
    keywords: ['切り干し大根'],
    portions: [{ label: '1皿', grams: 60 }],
  },
  {
    id: '18037',
    label: 'ひじきのいため煮',
    keywords: ['ひじきの煮物', 'ひじき煮'],
    portions: [{ label: '1皿', grams: 60 }],
  },
  {
    id: '18029',
    label: '卯の花いり',
    keywords: ['卯の花', 'おから煮'],
    portions: [{ label: '1皿', grams: 70 }],
  },
  {
    id: '18024',
    label: '青菜の白和え',
    keywords: ['白和え', 'しらあえ'],
    portions: [{ label: '1皿', grams: 70 }],
  },
  {
    id: '18025',
    label: 'いんげんのごま和え',
    keywords: ['ごま和え', 'ごまあえ'],
    portions: [{ label: '1皿', grams: 60 }],
  },
  {
    id: '18027',
    label: '紅白なます',
    keywords: ['なます', '紅白なます'],
    portions: [{ label: '1皿', grams: 60 }],
  },
  {
    id: '18039',
    label: 'もやしのナムル',
    keywords: ['ナムル', 'なむる'],
    portions: [{ label: '1皿', grams: 60 }],
  },
  {
    id: '18038',
    label: 'アジの南蛮漬け',
    keywords: ['南蛮漬け', 'アジの南蛮漬け'],
    portions: [{ label: '1皿', grams: 100 }],
  },
  {
    id: '18042',
    label: 'かぼちゃのクリームスープ',
    keywords: ['かぼちゃスープ', 'ポタージュ'],
    portions: [{ label: '1杯', grams: 180 }],
  },
  {
    id: '18005',
    label: 'コーンクリームスープ',
    keywords: ['コーンスープ', 'コーンクリームスープ'],
    portions: [{ label: '1杯', grams: 180 }],
  },
  {
    id: '18046',
    label: '中華ちまき',
    keywords: ['ちまき', '中華ちまき'],
    portions: [{ label: '1個', grams: 90 }],
  },
  {
    id: '18034',
    label: 'ぜんまいのいため煮',
    keywords: ['ぜんまい煮'],
    portions: [{ label: '1皿', grams: 60 }],
  },
  {
    id: '18026',
    label: 'わかめとねぎの酢みそ和え',
    keywords: ['酢みそ和え', 'ぬた'],
    portions: [{ label: '1皿', grams: 60 }],
  },
  {
    id: '18023',
    label: '松前漬け',
    keywords: ['松前漬け', 'まつまえづけ'],
    portions: [{ label: '1皿', grams: 40 }],
  },
  {
    id: '18044',
    label: 'コーンクリームコロッケ',
    keywords: ['コーンクリームコロッケ'],
    portions: [{ label: '1個', grams: 70 }],
  },

  // 菓子・パン・飲み物。単品で成分表にあるものは、レシピを作らず分量だけ足す
{
    id: '15170',
    label: 'ショートケーキ',
    keywords: ['ショートケーキ', 'ケーキ'],
    portions: [{ label: '1切れ', grams: 110 }],
  },
  {
    id: '15134',
    label: 'ベイクドチーズケーキ',
    keywords: ['チーズケーキ', 'ベイクドチーズケーキ'],
    portions: [{ label: '1切れ', grams: 100 }],
  },
  {
    id: '15135',
    label: 'レアチーズケーキ',
    keywords: ['レアチーズケーキ'],
    portions: [{ label: '1切れ', grams: 100 }],
  },
  {
    id: '15086',
    label: 'プリン',
    keywords: ['プリン', 'ぷりん', 'カスタードプリン'],
    portions: [{ label: '1個', grams: 110 }],
  },
  {
    id: '15073',
    label: 'シュークリーム',
    keywords: ['シュークリーム', 'しゅーくりーむ'],
    portions: [{ label: '1個', grams: 70 }],
  },
  {
    id: '15077',
    label: 'ドーナツ',
    keywords: ['ドーナツ', 'ドーナッツ'],
    portions: [{ label: '1個', grams: 60 }],
  },
  {
    id: '15155',
    label: '大福',
    keywords: ['大福', 'だいふく'],
    portions: [{ label: '1個', grams: 70 }],
  },
  {
    id: '15084',
    label: 'ワッフル',
    keywords: ['ワッフル', 'わっふる'],
    portions: [{ label: '1個', grams: 60 }],
  },
  {
    id: '15103',
    label: 'ポテトチップス',
    keywords: ['ポテトチップス', 'ポテチ'],
    portions: [{ label: '1袋', grams: 60 }, { label: '半袋', grams: 30 }],
  },
  {
    id: '15005',
    label: '今川焼',
    keywords: ['今川焼', '大判焼き', 'たい焼き'],
    portions: [{ label: '1個', grams: 80 }],
  },
  {
    id: '15038',
    label: 'ようかん',
    keywords: ['ようかん', '羊羹'],
    portions: [{ label: '1切れ', grams: 50 }],
  },
  {
    id: '15097',
    label: 'ビスケット',
    keywords: ['ビスケット', 'クッキー'],
    portions: [{ label: '1枚', grams: 8 }, { label: '5枚', grams: 40 }],
  },
  {
    id: '15115',
    label: 'ホワイトチョコレート',
    keywords: ['ホワイトチョコ'],
    portions: [{ label: '1枚', grams: 50 }],
  },
  {
    id: '15102',
    label: 'コーンスナック',
    keywords: ['スナック菓子', 'コーンスナック'],
    portions: [{ label: '1袋', grams: 60 }],
  },
  {
    id: '15087',
    label: 'ゼリー',
    keywords: ['ゼリー', 'ぜりー'],
    portions: [{ label: '1個', grams: 100 }],
  },
  {
    id: '13045',
    label: 'ラクトアイス',
    keywords: ['アイス', 'ラクトアイス'],
    portions: [{ label: '1個', grams: 120 }],
  },
  {
    id: '01148',
    label: 'ベーグル',
    keywords: ['ベーグル', 'べーぐる'],
    portions: [{ label: '1個', grams: 90 }],
  },
  {
    id: '01036',
    label: 'イングリッシュマフィン',
    keywords: ['マフィン', 'イングリッシュマフィン'],
    portions: [{ label: '1個', grams: 65 }],
  },
  {
    id: '01034',
    label: 'ロールパン',
    keywords: ['ロールパン', 'バターロール'],
    portions: [{ label: '1個', grams: 30 }, { label: '2個', grams: 60 }],
  },
  {
    id: '01031',
    label: 'フランスパン',
    keywords: ['フランスパン', 'バゲット'],
    portions: [{ label: '1切れ', grams: 30 }],
  },
  {
    id: '01033',
    label: 'ぶどうパン',
    keywords: ['ぶどうパン', 'レーズンパン'],
    portions: [{ label: '1個', grams: 60 }],
  },
  {
    id: '15070',
    label: 'クリームパン',
    keywords: ['クリームパン'],
    portions: [{ label: '1個', grams: 90 }],
  },
  {
    id: '15072',
    label: 'チョココロネ',
    keywords: ['チョココロネ', 'コロネ'],
    portions: [{ label: '1個', grams: 90 }],
  },
  {
    id: '16047',
    label: '缶コーヒー（加糖）',
    keywords: ['缶コーヒー', 'コーヒー飲料'],
    portions: [{ label: '1本', grams: 190 }],
  },
  {
    id: '16048',
    label: 'ココア（粉）',
    keywords: ['ココア', 'ここあ'],
    portions: [{ label: '1杯分', grams: 6 }],
  },
  {
    id: '16044',
    label: '紅茶',
    keywords: ['紅茶', 'こうちゃ'],
    portions: [{ label: '1杯', grams: 200 }],
  },
  {
    id: '16040',
    label: 'ほうじ茶',
    keywords: ['ほうじ茶', 'ほうじちゃ'],
    portions: [{ label: '1杯', grams: 200 }],
  },
  {
    id: '16055',
    label: '麦茶',
    keywords: ['麦茶', 'むぎちゃ'],
    portions: [{ label: 'コップ1杯', grams: 200 }],
  },
  {
    id: '07042',
    label: 'オレンジジュース',
    keywords: ['オレンジジュース', 'ジュース'],
    portions: [{ label: 'コップ1杯', grams: 200 }],
  },
  {
    id: '07149',
    label: 'りんごジュース',
    keywords: ['りんごジュース', 'アップルジュース'],
    portions: [{ label: 'コップ1杯', grams: 200 }],
  },
  {
    id: '16011',
    label: '赤ワイン',
    keywords: ['赤ワイン', 'ワイン'],
    portions: [{ label: '1杯', grams: 120 }],
  },
  {
    id: '16016',
    label: 'ウイスキー',
    keywords: ['ウイスキー', 'ハイボール'],
    portions: [{ label: '1杯', grams: 30 }],
  },
  {
    id: '13028',
    label: '乳酸菌飲料',
    keywords: ['ヤクルト', '乳酸菌飲料'],
    portions: [{ label: '1本', grams: 65 }],
  },
  {
    id: '07117',
    label: 'レーズン',
    keywords: ['レーズン', '干しぶどう'],
    portions: [{ label: '1掴み', grams: 20 }],
  },
  {
    id: '07097',
    label: 'パイナップル',
    keywords: ['パイナップル', 'パイン'],
    portions: [{ label: '1切れ', grams: 60 }],
  },
  {
    id: '07134',
    label: 'メロン',
    keywords: ['メロン', 'めろん'],
    portions: [{ label: '1切れ', grams: 100 }],
  },
  {
    id: '07062',
    label: 'グレープフルーツ',
    keywords: ['グレープフルーツ'],
    portions: [{ label: '半分', grams: 110 }],
  },
  {
    id: '08020',
    label: 'なめこ',
    keywords: ['なめこ'],
    portions: [{ label: '1袋', grams: 100 }],
  },
  {
    id: '06032',
    label: 'オクラ',
    keywords: ['オクラ', 'おくら'],
    portions: [{ label: '1本', grams: 8 }, { label: '5本', grams: 40 }],
  },
]

const COMMON_FOOD_BY_ID: ReadonlyMap<string, CommonFood> = new Map(
  COMMON_FOODS.map((food) => [food.id, food]),
)

export function findCommonFood(id: string): CommonFood | undefined {
  return COMMON_FOOD_BY_ID.get(id)
}

/**
 * 日常語からよく使う食品を引く。
 * 名前と登録した言葉のどちらでも当たるようにする。
 */
export function searchCommonFoods(keyword: string): CommonFood[] {
  const normalized = normalizeFoodKeyword(keyword)
  if (normalized === '') return []

  return COMMON_FOODS.filter((food) => {
    const haystack = [food.label, ...food.keywords].map(normalizeFoodKeyword)
    return haystack.some(
      (candidate) => candidate.includes(normalized) || normalized.includes(candidate),
    )
  })
}
