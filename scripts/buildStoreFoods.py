#!/usr/bin/env python3
"""業務スーパーの商品を Open Food Facts から取り出し、アプリに同梱する形にする。

出典: Open Food Facts（ODbL）https://jp.openfoodfacts.org/

オンライン検索でも同じデータは引けるが、よく買う店の商品は
圏外でも出したい（買い物中・自宅どちらでも使う）ため同梱する。

有志が登録するデータのため、次の条件で絞る。
- 日本語の商品名がある（中国語表記のものは検索で引けない）
- エネルギーが入っている（無いと計算できない）
- 同じ名前が複数あるときは1つだけ残す

  実行: python3 scripts/buildStoreFoods.py
"""

import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

SEARCH_URL = "https://jp.openfoodfacts.org/cgi/search.pl"

# 業務スーパーを運営する会社名。商品側にはこの名前で登録されている。
BRAND_QUERY = "神戸物産"

STORE_LABEL = "業務スーパー"

PAGE_SIZE = 100
MAX_PAGES = 3
REQUEST_INTERVAL_SEC = 12

USER_AGENT = "kintore-note/1.0 (personal training log)"

KANA_PATTERN = re.compile(r"[ぁ-んァ-ヶ]")


def fetch_page(page: int) -> list[dict]:
    query = urllib.parse.urlencode(
        {
            "search_terms": BRAND_QUERY,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": PAGE_SIZE,
            "page": page,
            "fields": "code,product_name,product_name_ja,brands,nutriments",
        }
    )
    request = urllib.request.Request(
        f"{SEARCH_URL}?{query}", headers={"User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.load(response).get("products", [])


def product_name(raw: dict) -> str:
    return (raw.get("product_name_ja") or raw.get("product_name") or "").strip()


def amount(nutriments: dict, key: str, digits: int = 1) -> float:
    value = nutriments.get(key)
    if not isinstance(value, (int, float)) or value < 0:
        return 0.0
    return round(float(value), digits)


def main() -> None:
    raw_products: list[dict] = []
    for page in range(1, MAX_PAGES + 1):
        raw_products += fetch_page(page)
        time.sleep(REQUEST_INTERVAL_SEC)

    foods: list[dict] = []
    seen_names: set[str] = set()

    for raw in raw_products:
        name = product_name(raw)
        nutriments = raw.get("nutriments") or {}
        kcal = nutriments.get("energy-kcal_100g")

        if not name or name in seen_names:
            continue
        # 日本語で探せないものは、あっても選べない
        if not KANA_PATTERN.search(name):
            continue
        if not isinstance(kcal, (int, float)) or kcal <= 0:
            continue

        seen_names.add(name)
        foods.append(
            {
                "id": str(raw.get("code") or "").strip(),
                "name": name,
                # kJ からの換算で細かい端数が付くことがあるため丸める
                "kcal": round(float(kcal)),
                "protein": amount(nutriments, "proteins_100g"),
                "fat": amount(nutriments, "fat_100g"),
                "carb": amount(nutriments, "carbohydrates_100g"),
                "fiber": amount(nutriments, "fiber_100g"),
                "salt": amount(nutriments, "salt_100g", 2),
            }
        )

    foods.sort(key=lambda food: food["name"])

    destination = Path(__file__).resolve().parent.parent / "src" / "data" / "storeFoods.json"
    destination.write_text(
        json.dumps(
            {"store": STORE_LABEL, "source": "Open Food Facts (ODbL)", "foods": foods},
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )

    print(f"{len(foods)} 件を {destination} に書き出しました")


if __name__ == "__main__":
    main()
