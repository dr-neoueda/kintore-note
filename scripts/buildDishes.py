#!/usr/bin/env python3
"""外食で食べる料理の栄養価を、成分表の食材から積み上げて作る。

出典: 文部科学省「日本食品標準成分表（八訂）増補2023年」
      src/data/foodComposition.json（buildFoodDatabase.py が作る）

外食では食材ごとの量が分からない。「炒飯を食べた」しか分からないので、
料理名で引ける表を用意する。ただし成分表に載っている料理は55件しかなく、
ラーメン・牛丼・寿司・定食といった定番が無い。

そこで、無い料理は成分表の食材から組み立てて見積もる。
数値を直接書かずレシピを残すのは、あとから「なぜこの値か」を追えるようにするため。
店ごとの差は大きいので、あくまで目安として画面にも断りを出す。

  実行: python3 scripts/buildDishes.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMPOSITION_PATH = ROOT / "src/data/foodComposition.json"
OUTPUT_PATH = ROOT / "src/data/dishes.json"

NUTRIENT_KEYS = ("kcal", "protein", "fat", "carb", "fiber", "salt")

# 成分表の基準量（可食部100g当たり）
BASIS_GRAMS = 100


def build_index(foods: list[dict]) -> dict[str, dict]:
    return {food["id"]: food for food in foods}


def resolve(foods: list[dict], query: str) -> dict:
    """'中華めん+ゆで' のように語をつないだ検索で、食材を1つに絞る。

    絞りきれないときは黙って先頭を採らず、候補を出して止める。
    別の食材で計算してしまうと、間違いに気づけないため。
    """
    keywords = query.split("+")
    hits = [f for f in foods if all(k in f["name"] for k in keywords)]

    if len(hits) == 1:
        return hits[0]

    if not hits:
        raise SystemExit(f"食材が見つかりません: {query}")

    # 同じ語で複数当たるときは、名前が最も短いものが素の食材であることが多い。
    # ただし取り違えると値が変わるので、候補を出して確認できるようにする。
    shortest = min(hits, key=lambda f: len(f["name"]))
    others = [f["name"] for f in hits if f is not shortest][:3]
    print(f"  ! 候補が複数: {query} -> 「{shortest['name']}」を採用（他: {', '.join(others)}）")
    return shortest


def calc_nutrition(foods: list[dict], by_id: dict[str, dict], recipe: list[dict]) -> tuple[dict, int, list[str]]:
    """レシピ1食分の栄養価と重さ、内訳の説明を返す。"""
    totals = {key: 0.0 for key in NUTRIENT_KEYS}
    total_grams = 0
    parts: list[str] = []

    for item in recipe:
        grams = item["g"]

        # だし・スープの水。栄養は無いが、1食の重さと100gあたりの濃さを決める。
        # 入れないと汁物が原液のような値になってしまう。
        if item.get("water"):
            total_grams += grams
            continue

        food = by_id[item["id"]] if "id" in item else resolve(foods, item["q"])
        ratio = grams / BASIS_GRAMS

        for key in NUTRIENT_KEYS:
            totals[key] += food[key] * ratio
        total_grams += grams
        parts.append(f"{item.get('as') or food['name']} {grams}g")

    return totals, total_grams, parts


def to_per_100g(totals: dict, total_grams: int) -> dict:
    ratio = BASIS_GRAMS / total_grams
    rounded = {}
    for key in NUTRIENT_KEYS:
        value = totals[key] * ratio
        rounded[key] = round(value) if key == "kcal" else round(value, 1)
    return rounded


def main() -> None:
    foods = json.loads(COMPOSITION_PATH.read_text(encoding="utf-8"))
    by_id = build_index(foods)

    from dishRecipes import DISHES  # noqa: PLC0415

    built = []
    for dish in DISHES:
        totals, total_grams, parts = calc_nutrition(foods, by_id, dish["recipe"])
        nutrition = to_per_100g(totals, total_grams)
        serving_grams = round(total_grams)

        # 先頭の分量は必ず1食分に合わせる。
        # レシピを直したときに、書いた分量とずれたまま残るのを防ぐ。
        portions = [dict(p) for p in dish.get("portions") or [{"label": "1人前", "grams": 0}]]
        portions[0]["grams"] = serving_grams

        built.append(
            {
                "id": dish["id"],
                "name": dish["name"],
                "category": dish["category"],
                "keywords": dish.get("keywords", []),
                "servingGrams": serving_grams,
                "portions": portions,
                "recipe": "、".join(parts),
                **nutrition,
            }
        )

    OUTPUT_PATH.write_text(
        json.dumps({"dishes": built}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )

    print(f"{len(built)}品を {OUTPUT_PATH.relative_to(ROOT)} に書き出しました")
    for dish in built:
        print(f"  {dish['id']} {dish['kcal']:>4}kcal/100g  1食{dish['servingGrams']}g "
              f"= {round(dish['kcal'] * dish['servingGrams'] / 100):>4}kcal  {dish['name']}")


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    main()
