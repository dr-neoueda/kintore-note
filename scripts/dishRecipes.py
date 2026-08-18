"""外食で食べる料理のレシピ。buildDishes.py が成分表と突き合わせて栄養価を出す。

g は「1人前あたりの可食部の重さ」。
q は成分表の名前に含まれる語をつないだもの（例: '中華めん+ゆで'）。
絞りきれない語はビルド時に候補が出るので、そのとき id で指定し直す。

量は一般的な外食1人前を目安にしている。店による差は大きく、
ラーメンは同じ醤油でも500〜1200kcalの幅がある。目安として扱う。
"""

# よく使う食材。同じ語を何度も書かないための短縮。
RICE = "こめ+［水稲めし］+精白米+うるち米"
SOY = "こいくちしょうゆ"
MISO = "米みそ+淡色辛みそ"
SUGAR = "車糖+上白糖"
OIL = "調合油"
SESAME_OIL = "ごま油"
ONION = "たまねぎ+りん茎+生"
LONG_ONION = "根深ねぎ+葉+軟白+生"
CARROT = "にんじん+根+皮なし+生"
CABBAGE = "キャベツ+結球葉+生"
EGG_RAW = "鶏卵+全卵+生"
EGG_BOILED = "鶏卵+全卵+ゆで"
PORK_LOIN = "ぶた+［大型種肉］+ロース+脂身つき+生"
PORK_BELLY = "ぶた+［大型種肉］+ばら+脂身つき+生"
BEEF_SHOULDER = "うし+［輸入牛肉］+かた+脂身つき+生"
CHICKEN_THIGH = "にわとり+［若どり・主品目］+もも+皮つき+生"
CHAR_SIU = "ぶた+［その他］+焼き豚"
TONKATSU = "ぶた+［大型種肉］+ロース+脂身つき+とんかつ"
SHRIMP_TEMPURA = "バナメイえび+養殖+天ぷら"
NORI = "あまのり+焼きのり"
MENMA = "たけのこ+水煮缶詰"
NARUTO = "＜水産練り製品＞+なると"

# 麺類のスープ。しょうゆ・みそ・塩とだしで作る想定の、飲み干した場合の量。
RAMEN_SOUP_SOY = [
    {"q": SOY, "g": 25},
    {"q": SESAME_OIL, "g": 5},
]
RAMEN_SOUP_MISO = [
    {"q": MISO, "g": 35},
    {"q": SESAME_OIL, "g": 8},
]

DISHES = [
    # ── 麺類 ──────────────────────────────────────────────
    {
        "id": "dish-ramen-shoyu",
        "name": "ラーメン（醤油・スープを飲む）",
        "category": "麺類",
        "keywords": ["ラーメン", "らーめん", "醤油ラーメン", "中華そば"],
        "portions": [{"label": "1杯", "grams": 700}, {"label": "大盛", "grams": 900}],
        "recipe": [
            {"q": "中華めん+ゆで", "g": 230},
            {"q": CHAR_SIU, "g": 40},
            {"q": MENMA, "g": 20},
            {"q": LONG_ONION, "g": 10},
            {"q": NARUTO, "g": 10},
            {"q": EGG_BOILED, "g": 25},
            *RAMEN_SOUP_SOY,
            {"water": True, "g": 335, "as": "だし・スープの水"},
        ],
    },
    {
        "id": "dish-ramen-shoyu-nosoup",
        "name": "ラーメン（醤油・スープを残す）",
        "category": "麺類",
        "keywords": ["ラーメンスープ残す", "らーめんすーぷのこす"],
        "portions": [{"label": "1杯", "grams": 340}],
        "recipe": [
            {"q": "中華めん+ゆで", "g": 230},
            {"q": CHAR_SIU, "g": 40},
            {"q": MENMA, "g": 20},
            {"q": LONG_ONION, "g": 10},
            {"q": NARUTO, "g": 10},
            {"q": EGG_BOILED, "g": 25},
            # スープに溶けた塩分・脂の一部だけが麺に残る
            {"q": SOY, "g": 8},
            {"q": SESAME_OIL, "g": 2},
        ],
    },
    {
        "id": "dish-ramen-miso",
        "name": "味噌ラーメン",
        "category": "麺類",
        "keywords": ["味噌ラーメン", "みそラーメン", "みそらーめん"],
        "portions": [{"label": "1杯", "grams": 750}, {"label": "大盛", "grams": 950}],
        "recipe": [
            {"q": "中華めん+ゆで", "g": 230},
            {"q": "ぶた+［ひき肉］+生", "g": 30},
            {"q": "だいず+もやし+生", "g": 40},
            {"q": CABBAGE, "g": 30},
            {"q": "スイートコーン+未熟種子+カーネル+冷凍", "g": 20},
            {"q": "バター+有塩バター", "g": 5},
            *RAMEN_SOUP_MISO,
            {"water": True, "g": 352, "as": "だし・スープの水"},
        ],
    },
    {
        "id": "dish-ramen-tonkotsu",
        "name": "豚骨ラーメン",
        "category": "麺類",
        "keywords": ["豚骨ラーメン", "とんこつラーメン", "とんこつらーめん"],
        "portions": [{"label": "1杯", "grams": 700}, {"label": "替玉あり", "grams": 830}],
        "recipe": [
            {"q": "中華めん+ゆで", "g": 200},
            {"q": CHAR_SIU, "g": 45},
            {"q": "きくらげ+ゆで", "g": 10},
            {"q": LONG_ONION, "g": 10},
            {"q": EGG_BOILED, "g": 25},
            # 白湯スープは脂とゼラチンが多い
            {"q": PORK_BELLY, "g": 20},
            {"q": SOY, "g": 15},
            {"water": True, "g": 375, "as": "だし・スープの水"},
        ],
    },
    {
        "id": "dish-tsukemen",
        "name": "つけ麺",
        "category": "麺類",
        "keywords": ["つけ麺", "つけめん"],
        "portions": [{"label": "1人前", "grams": 500}],
        "recipe": [
            {"q": "中華めん+ゆで", "g": 300},
            {"q": CHAR_SIU, "g": 40},
            {"q": MENMA, "g": 25},
            {"q": EGG_BOILED, "g": 25},
            {"q": SOY, "g": 20},
            {"q": SESAME_OIL, "g": 6},
            {"water": True, "g": 84, "as": "だし・スープの水"},
        ],
    },
    {
        "id": "dish-udon-kake",
        "name": "かけうどん",
        "category": "麺類",
        "keywords": ["かけうどん", "うどん"],
        "portions": [{"label": "1杯", "grams": 480}],
        "recipe": [
            {"q": "うどん+ゆで", "g": 250},
            {"q": LONG_ONION, "g": 10},
            {"q": "うすくちしょうゆ", "g": 15},
            {"water": True, "g": 205, "as": "だし・スープの水"},
        ],
    },
    {
        "id": "dish-udon-kitsune",
        "name": "きつねうどん",
        "category": "麺類",
        "keywords": ["きつねうどん", "きつね"],
        "portions": [{"label": "1杯", "grams": 510}],
        "recipe": [
            {"q": "うどん+ゆで", "g": 250},
            {"q": "油揚げ+味付け", "g": 25},
            {"q": LONG_ONION, "g": 10},
            {"q": "うすくちしょうゆ", "g": 15},
            {"water": True, "g": 210, "as": "だし・スープの水"},
        ],
    },
    {
        "id": "dish-udon-tempura",
        "name": "天ぷらうどん",
        "category": "麺類",
        "keywords": ["天ぷらうどん", "天ぷらそば", "てんぷらうどん"],
        "portions": [{"label": "1杯", "grams": 540}],
        "recipe": [
            {"q": "うどん+ゆで", "g": 250},
            {"q": SHRIMP_TEMPURA, "g": 45},
            {"q": LONG_ONION, "g": 10},
            {"q": "うすくちしょうゆ", "g": 15},
            {"water": True, "g": 220, "as": "だし・スープの水"},
        ],
    },
    {
        "id": "dish-soba-kake",
        "name": "かけそば",
        "category": "麺類",
        "keywords": ["かけそば", "そば", "蕎麦"],
        "portions": [{"label": "1杯", "grams": 480}],
        "recipe": [
            {"q": "そば+そば+ゆで", "g": 250},
            {"q": LONG_ONION, "g": 10},
            {"q": SOY, "g": 15},
            {"water": True, "g": 205, "as": "だし・スープの水"},
        ],
    },
    {
        "id": "dish-soba-zaru",
        "name": "ざるそば",
        "category": "麺類",
        "keywords": ["ざるそば", "もりそば", "ざる蕎麦"],
        "portions": [{"label": "1人前", "grams": 290}],
        "recipe": [
            {"q": "そば+そば+ゆで", "g": 260},
            {"q": NORI, "g": 1},
            {"q": SOY, "g": 20},
            {"water": True, "g": 9, "as": "だし・スープの水"},
        ],
    },
    {
        "id": "dish-yakisoba",
        "name": "焼きそば",
        "category": "麺類",
        "keywords": ["焼きそば", "やきそば"],
        "portions": [{"label": "1人前", "grams": 350}],
        "recipe": [
            {"q": "中華めん+蒸し中華めん+蒸し中華めん", "g": 200},
            {"q": PORK_BELLY, "g": 30},
            {"q": CABBAGE, "g": 60},
            {"q": ONION, "g": 20},
            {"q": CARROT, "g": 10},
            {"q": OIL, "g": 8},
            {"q": "ウスターソース類+中濃ソース", "g": 25},
        ],
    },
    {
        "id": "dish-pasta-meat",
        "name": "スパゲッティ（ミートソース）",
        "category": "麺類",
        "keywords": ["ミートソース", "パスタ", "スパゲッティ", "ボロネーゼ"],
        "portions": [{"label": "1人前", "grams": 420}],
        "recipe": [
            {"q": "マカロニ・スパゲッティ+ゆで", "g": 250},
            {"q": "うし+［ひき肉］+生", "g": 50},
            {"q": "（トマト類）+加工品+ホール+食塩無添加", "g": 80},
            {"q": ONION, "g": 30},
            {"q": OIL, "g": 8},
            {"q": "食塩+食塩", "g": 1},
        ],
    },
    {
        "id": "dish-pasta-carbonara",
        "name": "スパゲッティ（カルボナーラ）",
        "category": "麺類",
        "keywords": ["カルボナーラ", "かるぼなーら"],
        "portions": [{"label": "1人前", "grams": 400}],
        "recipe": [
            {"q": "マカロニ・スパゲッティ+ゆで", "g": 250},
            {"q": "ベーコン類+ばらベーコン", "g": 40},
            {"q": "クリーム+乳脂肪", "g": 60},
            {"q": EGG_RAW, "g": 30},
            {"q": "ナチュラルチーズ+パルメザン", "g": 15},
        ],
    },
    {
        "id": "dish-pasta-peperoncino",
        "name": "スパゲッティ（ペペロンチーノ）",
        "category": "麺類",
        "keywords": ["ペペロンチーノ", "ぺぺろんちーの"],
        "portions": [{"label": "1人前", "grams": 290}],
        "recipe": [
            {"q": "マカロニ・スパゲッティ+ゆで", "g": 250},
            {"q": "オリーブ油", "g": 20},
            {"q": "にんにく+りん茎+生", "g": 8},
            {"q": "とうがらし+果実+乾", "g": 1},
            {"q": "食塩+食塩", "g": 1},
        ],
    },
    {
        "id": "dish-pasta-napolitan",
        "name": "スパゲッティ（ナポリタン）",
        "category": "麺類",
        "keywords": ["ナポリタン", "なぽりたん"],
        "portions": [{"label": "1人前", "grams": 400}],
        "recipe": [
            {"q": "マカロニ・スパゲッティ+ゆで", "g": 250},
            {"q": "ソーセージ類+ウインナーソーセージ+ウインナーソーセージ", "g": 40},
            {"q": ONION, "g": 40},
            {"q": "青ピーマン+果実+生", "g": 20},
            {"q": "トマト加工品類+トマトケチャップ", "g": 45},
            {"q": OIL, "g": 8},
        ],
    },
    {
        "id": "dish-hiyashi-chuka",
        "name": "冷やし中華",
        "category": "麺類",
        "keywords": ["冷やし中華", "ひやしちゅうか"],
        "portions": [{"label": "1人前", "grams": 420}],
        "recipe": [
            {"q": "中華めん+ゆで", "g": 230},
            {"q": "きゅうり+果実+生", "g": 40},
            {"q": "ハム類+ロースハム+ロースハム", "g": 30},
            {"q": EGG_RAW, "g": 30},
            {"q": "トマト+果実+生", "g": 40},
            {"q": SOY, "g": 20},
            {"q": SESAME_OIL, "g": 5},
        ],
    },

    # ── 丼・ごはんもの ─────────────────────────────────────
    {
        "id": "dish-gyudon",
        "name": "牛丼",
        "category": "丼・ごはんもの",
        "keywords": ["牛丼", "ぎゅうどん"],
        "portions": [
            {"label": "並盛", "grams": 350},
            {"label": "大盛", "grams": 450},
            {"label": "特盛", "grams": 550},
        ],
        "recipe": [
            {"q": RICE, "g": 260},
            {"q": "うし+［輸入牛肉］+ばら+脂身つき+生", "g": 70},
            {"q": ONION, "g": 30},
            {"q": SOY, "g": 12},
            {"q": SUGAR, "g": 5},
        ],
    },
    {
        "id": "dish-butadon",
        "name": "豚丼",
        "category": "丼・ごはんもの",
        "keywords": ["豚丼", "ぶたどん"],
        "portions": [{"label": "並盛", "grams": 350}, {"label": "大盛", "grams": 450}],
        "recipe": [
            {"q": RICE, "g": 260},
            {"q": PORK_LOIN, "g": 70},
            {"q": ONION, "g": 20},
            {"q": SOY, "g": 12},
            {"q": SUGAR, "g": 5},
        ],
    },
    {
        "id": "dish-oyakodon",
        "name": "親子丼",
        "category": "丼・ごはんもの",
        "keywords": ["親子丼", "おやこどん"],
        "portions": [{"label": "1杯", "grams": 420}],
        "recipe": [
            {"q": RICE, "g": 260},
            {"q": CHICKEN_THIGH, "g": 70},
            {"q": EGG_RAW, "g": 55},
            {"q": ONION, "g": 30},
            {"q": SOY, "g": 12},
            {"q": SUGAR, "g": 4},
        ],
    },
    {
        "id": "dish-katsudon",
        "name": "カツ丼",
        "category": "丼・ごはんもの",
        "keywords": ["カツ丼", "かつ丼", "かつどん"],
        "portions": [{"label": "1杯", "grams": 450}],
        "recipe": [
            {"q": RICE, "g": 260},
            {"q": TONKATSU, "g": 110},
            {"q": EGG_RAW, "g": 50},
            {"q": ONION, "g": 30},
            {"q": SOY, "g": 12},
            {"q": SUGAR, "g": 4},
        ],
    },
    {
        "id": "dish-tendon",
        "name": "天丼",
        "category": "丼・ごはんもの",
        "keywords": ["天丼", "てんどん"],
        "portions": [{"label": "1杯", "grams": 420}],
        "recipe": [
            {"q": RICE, "g": 260},
            {"q": SHRIMP_TEMPURA, "g": 60},
            {"q": "さつまいも+塊根+皮つき+天ぷら", "g": 40},
            {"q": SOY, "g": 12},
            {"q": SUGAR, "g": 5},
        ],
    },
    {
        "id": "dish-kaisendon",
        "name": "海鮮丼",
        "category": "丼・ごはんもの",
        "keywords": ["海鮮丼", "かいせんどん"],
        "portions": [{"label": "1杯", "grams": 400}],
        "recipe": [
            {"q": RICE, "g": 240},
            {"q": "まぐろ類+きはだ+生", "g": 40},
            {"q": "さけ・ます類+しろさけ+生", "g": 30},
            {"q": "＜えび・かに類＞+（えび類）+バナメイえび+養殖+生", "g": 25},
            {"q": "＜いか・たこ類＞+（いか類）+するめいか+生", "g": 25},
            {"q": SOY, "g": 12},
        ],
    },
    {
        "id": "dish-chukadon",
        "name": "中華丼",
        "category": "丼・ごはんもの",
        "keywords": ["中華丼", "ちゅうかどん"],
        "portions": [{"label": "1杯", "grams": 450}],
        "recipe": [
            {"q": RICE, "g": 260},
            {"q": "中国料理+菜類+八宝菜", "g": 180},
        ],
    },
    {
        "id": "dish-curry-rice",
        "name": "カレーライス",
        "category": "丼・ごはんもの",
        "keywords": ["カレーライス", "カレー", "かれー"],
        "portions": [{"label": "1皿", "grams": 450}, {"label": "大盛", "grams": 570}],
        "recipe": [
            {"q": RICE, "g": 250},
            {"q": "洋風料理+カレー類+ビーフカレー", "g": 200},
        ],
    },
    {
        "id": "dish-katsu-curry",
        "name": "カツカレー",
        "category": "丼・ごはんもの",
        "keywords": ["カツカレー", "かつカレー"],
        "portions": [{"label": "1皿", "grams": 560}],
        "recipe": [
            {"q": RICE, "g": 250},
            {"q": "洋風料理+カレー類+ビーフカレー", "g": 200},
            {"q": TONKATSU, "g": 110},
        ],
    },
    {
        "id": "dish-omurice",
        "name": "オムライス",
        "category": "丼・ごはんもの",
        "keywords": ["オムライス", "おむらいす"],
        "portions": [{"label": "1皿", "grams": 400}],
        "recipe": [
            {"q": RICE, "g": 230},
            {"q": EGG_RAW, "g": 100},
            {"q": "にわとり+［若どり・主品目］+むね+皮なし+生", "g": 40},
            {"q": ONION, "g": 25},
            {"q": "トマト加工品類+トマトケチャップ", "g": 40},
            {"q": "バター+有塩バター", "g": 10},
        ],
    },
    {
        "id": "dish-hayashi-rice",
        "name": "ハヤシライス",
        "category": "丼・ごはんもの",
        "keywords": ["ハヤシライス", "はやしらいす"],
        "portions": [{"label": "1皿", "grams": 450}],
        "recipe": [
            {"q": RICE, "g": 250},
            {"q": "洋風料理+シチュー類+ビーフシチュー", "g": 200},
        ],
    },
    {
        "id": "dish-sushi-nigiri",
        "name": "にぎり寿司（10貫）",
        "category": "丼・ごはんもの",
        "keywords": ["寿司", "すし", "にぎり", "握り寿司"],
        "portions": [{"label": "10貫", "grams": 350}, {"label": "1貫", "grams": 35}],
        "recipe": [
            {"q": RICE, "g": 200},
            {"q": "＜調味料類＞+（調味ソース類）+すし酢+にぎり用", "g": 20},
            {"q": "まぐろ類+きはだ+生", "g": 30},
            {"q": "さけ・ます類+しろさけ+生", "g": 25},
            {"q": "＜えび・かに類＞+（えび類）+バナメイえび+養殖+生", "g": 20},
            {"q": "＜いか・たこ類＞+（いか類）+するめいか+生", "g": 20},
            {"q": "＜貝類＞+ほたてがい+貝柱+生", "g": 20},
            {"q": "＜魚類＞+（さば類）+まさば+生", "g": 15},
        ],
    },
    {
        "id": "dish-inari",
        "name": "いなり寿司（2個）",
        "category": "丼・ごはんもの",
        "keywords": ["いなり寿司", "いなり", "稲荷寿司"],
        "portions": [{"label": "2個", "grams": 140}, {"label": "1個", "grams": 70}],
        "recipe": [
            {"q": RICE, "g": 100},
            {"q": "＜調味料類＞+（調味ソース類）+すし酢+ちらし・稲荷用", "g": 10},
            {"q": "油揚げ+味付け", "g": 30},
        ],
    },
    {
        "id": "dish-onigiri-salmon",
        "name": "おにぎり（鮭）",
        "category": "丼・ごはんもの",
        "keywords": ["おにぎり", "鮭おにぎり", "おむすび"],
        "portions": [{"label": "1個", "grams": 110}, {"label": "2個", "grams": 220}],
        "recipe": [
            {"q": RICE, "g": 100},
            {"q": "さけ・ます類+しろさけ+焼き", "g": 8},
            {"q": NORI, "g": 1},
            {"q": "食塩+食塩", "g": 0.5},
        ],
    },
    {
        "id": "dish-onigiri-tuna",
        "name": "おにぎり（ツナマヨ）",
        "category": "丼・ごはんもの",
        "keywords": ["ツナマヨおにぎり", "ツナマヨ"],
        "portions": [{"label": "1個", "grams": 120}, {"label": "2個", "grams": 240}],
        "recipe": [
            {"q": RICE, "g": 100},
            {"q": "まぐろ類+缶詰+水煮+フレーク+ライト", "g": 15},
            {"q": "マヨネーズ+全卵型", "g": 8},
            {"q": NORI, "g": 1},
        ],
    },

    # ── 定食・和食 ────────────────────────────────────────
    {
        "id": "dish-teishoku-yakizakana",
        "name": "焼き魚定食",
        "category": "定食・和食",
        "keywords": ["焼き魚定食", "焼魚定食", "さば定食"],
        "portions": [{"label": "1食", "grams": 500}],
        "recipe": [
            {"q": RICE, "g": 200},
            {"q": "＜魚類＞+（さば類）+まさば+焼き", "g": 100},
            {"q": "和風料理+汁物類+とん汁", "g": 150},
            {"q": "（だいこん類）+漬物+たくあん漬+塩押しだいこん漬", "g": 20},
            {"q": SOY, "g": 6},
        ],
    },
    {
        "id": "dish-teishoku-karaage",
        "name": "唐揚げ定食",
        "category": "定食・和食",
        "keywords": ["唐揚げ定食", "からあげ定食", "から揚げ定食"],
        "portions": [{"label": "1食", "grams": 560}],
        "recipe": [
            {"q": RICE, "g": 250},
            {"q": "和風料理+その他+とりから揚げ", "g": 140},
            {"q": CABBAGE, "g": 50},
            {"q": "和風料理+汁物類+とん汁", "g": 150},
        ],
    },
    {
        "id": "dish-teishoku-shogayaki",
        "name": "生姜焼き定食",
        "category": "定食・和食",
        "keywords": ["生姜焼き定食", "しょうが焼き定食", "生姜焼き"],
        "portions": [{"label": "1食", "grams": 560}],
        "recipe": [
            {"q": RICE, "g": 250},
            {"q": PORK_LOIN, "g": 120},
            {"q": ONION, "g": 30},
            {"q": SOY, "g": 15},
            {"q": SUGAR, "g": 5},
            {"q": OIL, "g": 8},
            {"q": CABBAGE, "g": 50},
            {"q": "和風料理+汁物類+とん汁", "g": 150},
        ],
    },
    {
        "id": "dish-teishoku-tonkatsu",
        "name": "とんかつ定食",
        "category": "定食・和食",
        "keywords": ["とんかつ定食", "トンカツ定食", "豚カツ定食"],
        "portions": [{"label": "1食", "grams": 590}],
        "recipe": [
            {"q": RICE, "g": 250},
            {"q": TONKATSU, "g": 130},
            {"q": CABBAGE, "g": 60},
            {"q": "ウスターソース類+中濃ソース", "g": 15},
            {"q": "和風料理+汁物類+とん汁", "g": 150},
        ],
    },
    {
        "id": "dish-teishoku-tempura",
        "name": "天ぷら定食",
        "category": "定食・和食",
        "keywords": ["天ぷら定食", "てんぷら定食"],
        "portions": [{"label": "1食", "grams": 560}],
        "recipe": [
            {"q": RICE, "g": 250},
            {"q": SHRIMP_TEMPURA, "g": 60},
            {"q": "さつまいも+塊根+皮つき+天ぷら", "g": 40},
            {"q": "なす+果実+天ぷら", "g": 30},
            {"q": SOY, "g": 15},
            {"q": "和風料理+汁物類+とん汁", "g": 150},
        ],
    },
    {
        "id": "dish-teishoku-hamburg",
        "name": "ハンバーグ定食",
        "category": "定食・和食",
        "keywords": ["ハンバーグ定食", "はんばーぐ定食"],
        "portions": [{"label": "1食", "grams": 590}],
        "recipe": [
            {"q": RICE, "g": 250},
            {"q": "洋風料理+ハンバーグステーキ類+合いびきハンバーグ", "g": 150},
            {"q": "ウスターソース類+中濃ソース", "g": 20},
            {"q": CABBAGE, "g": 40},
            {"q": "和風料理+汁物類+とん汁", "g": 150},
        ],
    },
    {
        "id": "dish-misoshiru",
        "name": "味噌汁",
        "category": "定食・和食",
        "keywords": ["味噌汁", "みそ汁", "みそしる"],
        "portions": [{"label": "1杯", "grams": 180}],
        "recipe": [
            {"q": MISO, "g": 12},
            {"q": "だいず+［豆腐・油揚げ類］+絹ごし豆腐", "g": 30},
            {"q": "わかめ+原藻+生", "g": 5},
            {"q": LONG_ONION, "g": 5},
            {"water": True, "g": 128, "as": "だし・スープの水"},
        ],
    },
    {
        "id": "dish-hiyayakko",
        "name": "冷奴",
        "category": "定食・和食",
        "keywords": ["冷奴", "ひややっこ"],
        "portions": [{"label": "1皿", "grams": 160}],
        "recipe": [
            {"q": "だいず+［豆腐・油揚げ類］+絹ごし豆腐", "g": 150},
            {"q": SOY, "g": 8},
            {"q": LONG_ONION, "g": 3},
        ],
    },
    {
        "id": "dish-dashimaki",
        "name": "だし巻き卵",
        "category": "定食・和食",
        "keywords": ["だし巻き卵", "だし巻き", "卵焼き", "玉子焼き"],
        "portions": [{"label": "1皿", "grams": 120}],
        "recipe": [
            {"q": EGG_RAW, "g": 110},
            {"q": "うすくちしょうゆ", "g": 5},
            {"q": SUGAR, "g": 3},
            {"q": OIL, "g": 4},
        ],
    },
    {
        "id": "dish-edamame",
        "name": "枝豆",
        "category": "定食・和食",
        "keywords": ["枝豆", "えだまめ"],
        "portions": [{"label": "1皿", "grams": 80}],
        "recipe": [
            {"q": "えだまめ+ゆで", "g": 80},
            {"q": "食塩+食塩", "g": 0.5},
        ],
    },

    # ── 洋食・ファストフード ──────────────────────────────
    {
        "id": "dish-hamburger",
        "name": "ハンバーガー",
        "category": "洋食・ファストフード",
        "keywords": ["ハンバーガー", "はんばーがー", "バーガー"],
        "portions": [{"label": "1個", "grams": 110}],
        "recipe": [
            {"q": "こむぎ+［パン類］+バンズ", "g": 50},
            {"q": "うし+［ひき肉］+生", "g": 45},
            {"q": ONION, "g": 8},
            {"q": "トマト加工品類+トマトケチャップ", "g": 8},
        ],
    },
    {
        "id": "dish-cheeseburger",
        "name": "チーズバーガー",
        "category": "洋食・ファストフード",
        "keywords": ["チーズバーガー", "ちーずばーがー"],
        "portions": [{"label": "1個", "grams": 130}],
        "recipe": [
            {"q": "こむぎ+［パン類］+バンズ", "g": 50},
            {"q": "うし+［ひき肉］+生", "g": 45},
            {"q": "プロセスチーズ", "g": 18},
            {"q": ONION, "g": 8},
            {"q": "トマト加工品類+トマトケチャップ", "g": 8},
        ],
    },
    {
        "id": "dish-french-fries",
        "name": "フライドポテト（M）",
        "category": "洋食・ファストフード",
        "keywords": ["フライドポテト", "ポテト", "ふらいどぽてと"],
        "portions": [{"label": "Mサイズ", "grams": 135}, {"label": "Sサイズ", "grams": 75}],
        "recipe": [
            {"id": "02020", "g": 135, "as": "フライドポテト（市販冷凍食品を揚げたもの）"},
            {"q": "食塩+食塩", "g": 1},
        ],
    },
    {
        "id": "dish-chicken-nugget",
        "name": "チキンナゲット（5個）",
        "category": "洋食・ファストフード",
        "keywords": ["ナゲット", "チキンナゲット"],
        "portions": [{"label": "5個", "grams": 95}, {"label": "1個", "grams": 19}],
        "recipe": [
            {"q": "＜鳥肉類＞+［その他］+チキンナゲット", "g": 95},
        ],
    },
    {
        "id": "dish-pizza-margherita",
        "name": "ピザ（マルゲリータ・1枚）",
        "category": "洋食・ファストフード",
        "keywords": ["ピザ", "ぴざ", "マルゲリータ", "ピッツァ"],
        "portions": [{"label": "1枚", "grams": 300}, {"label": "1切れ", "grams": 50}],
        "recipe": [
            {"q": "こむぎ+［その他］+ピザ生地", "g": 180},
            {"q": "（トマト類）+加工品+ホール+食塩無添加", "g": 50},
            {"q": "ナチュラルチーズ+モッツァレラ", "g": 60},
            {"q": "オリーブ油", "g": 8},
        ],
    },
    {
        "id": "dish-steak",
        "name": "ステーキ（サーロイン）",
        "category": "洋食・ファストフード",
        "keywords": ["ステーキ", "すてーき", "サーロイン"],
        "portions": [{"label": "1枚", "grams": 200}],
        "recipe": [
            {"q": "うし+［輸入牛肉］+サーロイン+脂身つき+生", "g": 180},
            {"q": "バター+有塩バター", "g": 8},
            {"q": "食塩+食塩", "g": 1},
        ],
    },
    {
        "id": "dish-doria",
        "name": "ドリア",
        "category": "洋食・ファストフード",
        "keywords": ["ドリア", "どりあ"],
        "portions": [{"label": "1皿", "grams": 400}],
        "recipe": [
            {"q": RICE, "g": 200},
            {"q": "洋風料理+その他+えびグラタン", "g": 180},
            {"q": "バター+有塩バター", "g": 8},
        ],
    },
    {
        "id": "dish-sandwich",
        "name": "サンドイッチ（ハムたまご）",
        "category": "洋食・ファストフード",
        "keywords": ["サンドイッチ", "さんどいっち", "サンド"],
        "portions": [{"label": "1パック", "grams": 180}],
        "recipe": [
            {"q": "こむぎ+［パン類］+角形食パン+食パン", "g": 90},
            {"q": "ハム類+ロースハム+ロースハム", "g": 25},
            {"q": EGG_BOILED, "g": 40},
            {"q": "マヨネーズ+全卵型", "g": 15},
            {"q": "（レタス類）+レタス+土耕栽培+結球葉+生", "g": 10},
        ],
    },
    {
        "id": "dish-hotdog",
        "name": "ホットドッグ",
        "category": "洋食・ファストフード",
        "keywords": ["ホットドッグ", "ほっとどっぐ"],
        "portions": [{"label": "1個", "grams": 120}],
        "recipe": [
            {"q": "こむぎ+［パン類］+コッペパン+コッペパン", "g": 60},
            {"q": "ソーセージ類+ウインナーソーセージ+ウインナーソーセージ", "g": 45},
            {"q": "トマト加工品類+トマトケチャップ", "g": 12},
        ],
    },
]
