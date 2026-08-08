#!/usr/bin/env python3
"""日本食品標準成分表の Excel を、アプリに同梱する JSON に変換する。

出典: 文部科学省「日本食品標準観分表（八訂）増補2023年」
      https://www.mext.go.jp/a_menu/syokuhinseibun/mext_00001.html

年に一度あるかどうかの更新のため、変換はこのスクリプトを手で実行し、
生成物（src/data/foodComposition.json）をコミットする。
アプリのビルドには関与しないので、Node の依存は増やさない。

  実行: python3 scripts/buildFoodDatabase.py <成分表.xlsx>
  必要: python3 -m pip install openpyxl
"""

import json
import re
import sys
from pathlib import Path

import openpyxl

# 「表全体」シート上の列位置（0 始まり）。成分識別子の行から確認した値。
COL_GROUP = 0
COL_NUMBER = 1
COL_NAME = 3
COL_KCAL = 6  # ENERC_KCAL
COL_PROTEIN = 9  # PROT-
COL_FAT = 12  # FAT-
COL_FIBER = 18  # FIB-
COL_CARB = 20  # CHOCDF-
COL_SALT = 60  # NACL_EQ

DATA_START_ROW = 13

# 食品群番号 → 分類名。検索の手がかりとして持たせる。
GROUP_NAMES = {
    "01": "穀類",
    "02": "いも類",
    "03": "砂糖類",
    "04": "豆類",
    "05": "種実類",
    "06": "野菜類",
    "07": "果実類",
    "08": "きのこ類",
    "09": "藻類",
    "10": "魚介類",
    "11": "肉類",
    "12": "卵類",
    "13": "乳類",
    "14": "油脂類",
    "15": "菓子類",
    "16": "飲料類",
    "17": "調味料",
    "18": "調理済み",
}

ESTIMATE_PATTERN = re.compile(r"^\((.*)\)$")


def parse_amount(raw) -> float:
    """成分値を数値にする。

    成分表の値には次の表記がある。
    - `(12.3)` 推計値 … 数値として扱う
    - `Tr` 微量 … 0 とする
    - `-` 未測定 … 0 とする（未測定を「無い」とみなす点は画面で断る）
    """
    if raw is None:
        return 0.0
    if isinstance(raw, (int, float)):
        return float(raw)

    text = str(raw).strip()
    estimate = ESTIMATE_PATTERN.match(text)
    if estimate:
        text = estimate.group(1).strip()

    if text in ("", "-", "Tr", "(Tr)", "*"):
        return 0.0

    try:
        return float(text)
    except ValueError:
        return 0.0


def normalize_name(name: str) -> str:
    """全角スペース区切りの食品名を、表示用の1行にする。"""
    return re.sub(r"\s+", " ", name.replace("　", " ")).strip()


def build(source: Path) -> list[dict]:
    workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
    sheet = workbook["表全体"]

    foods = []
    for row in sheet.iter_rows(min_row=DATA_START_ROW, values_only=True):
        number = row[COL_NUMBER]
        name = row[COL_NAME]
        if not number or not name:
            continue

        group = str(row[COL_GROUP]).zfill(2)
        foods.append(
            {
                "id": str(number).strip(),
                "name": normalize_name(str(name)),
                "group": GROUP_NAMES.get(group, "その他"),
                "kcal": round(parse_amount(row[COL_KCAL]), 1),
                "protein": round(parse_amount(row[COL_PROTEIN]), 2),
                "fat": round(parse_amount(row[COL_FAT]), 2),
                "carb": round(parse_amount(row[COL_CARB]), 2),
                "fiber": round(parse_amount(row[COL_FIBER]), 2),
                "salt": round(parse_amount(row[COL_SALT]), 2),
            }
        )

    return foods


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("使い方: python3 scripts/buildFoodDatabase.py <成分表.xlsx>")

    source = Path(sys.argv[1])
    destination = Path(__file__).resolve().parent.parent / "src" / "data" / "foodComposition.json"

    foods = build(source)
    destination.write_text(
        json.dumps(foods, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )

    print(f"{len(foods)} 件を {destination} に書き出しました")


if __name__ == "__main__":
    main()
