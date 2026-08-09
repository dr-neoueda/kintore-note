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
      { label: 'M1個', grams: 50 },
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
