"""
從 senya_tsukihime PHP（實為靜態 HTML）抽 JSON。

Usage:
    python parse_php.py <src_dir> <out_dir>

例：
    python parse_php.py ../../senya_tsukihime ../data/levels-raw
"""
from __future__ import annotations
import re
import sys
import json
from pathlib import Path
from bs4 import BeautifulSoup

ABILITY_ORDER = ["physical", "perception", "reason", "will"]
COMBAT_ROWS = ["melee", "ranged", "psychic", "action", "hp", "tp", "defense"]
BASIC_LEVELS = {"karyu", "kenshi", "syuryousya", "daikousya",
                "butouka", "majutushi", "tyouno"}
ADVANCED_LEVELS = {"og", "gug", "leftway", "kunshi", "ninja",
                   "theswordofnameless", "windwater"}
ALL_LEVELS = sorted(BASIC_LEVELS | ADVANCED_LEVELS)


def _classify_tier(level_id: str) -> str:
    if level_id in BASIC_LEVELS:
        return "basic"
    if level_id in ADVANCED_LEVELS:
        return "advanced"
    return "unknown"


def _safe_int(s: str, default: int = 0) -> int:
    s = (s or "").strip().replace("−", "-").replace("+", "")
    if not s or s in ("—", "－", "-"):
        return default
    try:
        return int(s)
    except ValueError:
        m = re.search(r"-?\d+", s)
        return int(m.group()) if m else default


def _parse_name_from_title(soup: BeautifulSoup, fallback: str) -> str:
    title = soup.find("title")
    if not title:
        return fallback
    text = title.get_text(strip=True)
    # "千夜月姬 - 級別：劍士" → "劍士"
    if "：" in text:
        return text.split("：")[-1].strip()
    if "-" in text:
        return text.split("-")[-1].strip()
    return text


def _parse_description(soup: BeautifulSoup) -> str:
    anchor = soup.find(id="description_rank1")
    if not anchor:
        return ""
    h2 = anchor.find_next("h2")
    return h2.get_text("\n", strip=True) if h2 else ""


def _parse_base_abilities(soup: BeautifulSoup) -> dict:
    anchor = soup.find(id="description_rank2")
    if not anchor:
        return {k: 0 for k in ABILITY_ORDER}
    table = anchor.find_next("table")
    if not table:
        return {k: 0 for k in ABILITY_ORDER}
    rows = table.find_all("tr")
    if len(rows) < 2:
        return {k: 0 for k in ABILITY_ORDER}
    cells = rows[1].find_all("td")
    values = [_safe_int(c.get_text()) for c in cells[:4]]
    while len(values) < 4:
        values.append(0)
    return dict(zip(ABILITY_ORDER, values))


def _parse_initial_skills_and_rule(soup: BeautifulSoup) -> tuple[list[str], str, str]:
    """回傳 (initial_skills, level_up_rule, initial_note)

    - initial_skills：從「...」括號抽出的具體技能名（可能為空，例如「任兩個喜歡的特技」）
    - level_up_rule：升級規則文字（rank3 第二個 h2，去掉 "升級："）
    - initial_note：rank3 第一個 h2 的原文（去掉 "初期取得：" 前綴；含「選一」「任兩個」等說明）
    """
    anchor = soup.find(id="description_rank3")
    if not anchor:
        return [], "", ""
    h2s = anchor.find_all_next("h2", limit=2)
    initial_skills: list[str] = []
    level_up_rule = ""
    initial_note = ""
    if h2s:
        initial_text = h2s[0].get_text(" ", strip=True)
        # 抽「...」內的特技名
        for m in re.finditer(r"「([^」]+)」", initial_text):
            initial_skills.append(m.group(1))
        # 去掉 "初期取得：" 前綴（可能重複出現，全清掉）
        initial_note = re.sub(r"初期取得\s*[:：]\s*", "", initial_text).strip()
    if len(h2s) >= 2:
        rule_text = h2s[1].get_text(" ", strip=True)
        level_up_rule = re.sub(r"^升級\s*[:：]\s*", "", rule_text).strip()
    return initial_skills, level_up_rule, initial_note


def _parse_modifier_table(soup: BeautifulSoup) -> dict:
    anchor = soup.find(id="description_rank4")
    empty = {k: [0] * 10 for k in COMBAT_ROWS}
    if not anchor:
        return empty
    table = anchor.find_next("table")
    if not table:
        return empty
    rows = table.find_all("tr")
    if len(rows) < 2:
        return empty
    out = {}
    # rows[0] = 等級 header；rows[1..] = 各戰鬥值列
    data_rows = rows[1:]
    for label, tr in zip(COMBAT_ROWS, data_rows):
        cells = tr.find_all("td")
        # cells[0] = label cell；cells[1:] = 10 級數值
        vals = [_safe_int(c.get_text()) for c in cells[1:11]]
        while len(vals) < 10:
            vals.append(0)
        out[label] = vals
    # 補不足的 row（理論上不會發生）
    for k in COMBAT_ROWS:
        if k not in out:
            out[k] = [0] * 10
    return out


def _parse_skills_under(soup: BeautifulSoup, anchor_id: str) -> list[dict]:
    """抽 anchor 之後（到下一段 description_skillN 之前）的所有 skillbox。

    section 順序：description_skill1（一般特技）→ description_skill2（額外特技）
    所以 skill1 的 stop = skill2；skill2 的 stop = None（抽到底）
    """
    anchor = soup.find(id=anchor_id)
    if not anchor:
        return []
    if anchor_id == "description_skill1":
        stop_el = soup.find(id="description_skill2")
    else:
        stop_el = None  # description_skill2 是最後一段，無停止點

    # 收集 stop_el 之後的所有 elements（用 set 比對是否「在 stop 之後」）
    after_stop: set = set()
    if stop_el is not None:
        cur = stop_el
        while cur is not None:
            cur = cur.find_next()
            if cur is None:
                break
            after_stop.add(id(cur))

    skills: list[dict] = []
    for box in anchor.find_all_next("skillbox"):
        if stop_el is not None and id(box) in after_stop:
            break
        sk = _parse_one_skillbox(box)
        if sk:
            skills.append(sk)
    return skills


def _parse_one_skillbox(box) -> dict | None:
    # skill-wrap 可能是 skillWrap、skillWrap_dividepoint、skillWrap_xxx
    wrap = box.find(class_=lambda c: bool(c) and any(
        cn.startswith("skillWrap") for cn in (c if isinstance(c, list) else [c])
    ))
    if not wrap:
        wrap = box  # fallback：直接用 skillbox 本身
    title_el = wrap.find(class_="skillTitle")
    if not title_el:
        return None
    name = title_el.get_text(strip=True)
    # 抓 skillTh / skillTh2 + skillTd / skillTd1/2/3 配對
    meta: dict[str, str] = {}
    children = list(wrap.children)
    # 用「最近的 skillTh 對下一個 skillTd」配對
    pending_label: str | None = None
    for el in wrap.find_all(["div"]):
        cl = el.get("class", []) or []
        if not isinstance(cl, list):
            cl = [cl]
        is_th = any(c.startswith("skillTh") for c in cl)
        is_td = any(c.startswith("skillTd") for c in cl)
        text = el.get_text(" ", strip=True)
        if is_th:
            pending_label = text
        elif is_td and pending_label:
            meta[pending_label] = text
            pending_label = None
    effect_el = wrap.find(class_="skillFunction")
    effect = effect_el.get_text("\n", strip=True) if effect_el else ""
    # 去掉 "效果：" 或 "效果:" 前綴
    effect = re.sub(r"^效果\s*[:：]\s*", "", effect).strip()
    return {
        "name": name,
        "category": meta.get("分類", "—") or "—",
        "cost":     meta.get("代價", "—") or "—",
        "limit":    meta.get("取得限制", "無") or "無",
        "effect":   effect,
    }


def parse_level_php(path: Path | str, level_id: str) -> dict:
    """解析一個級別 PHP 檔案 → JSON-ready dict"""
    html = Path(path).read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    name = _parse_name_from_title(soup, level_id)
    initial_skills, level_up_rule, initial_note = _parse_initial_skills_and_rule(soup)
    return {
        "id": level_id,
        "name": name,
        "tier": _classify_tier(level_id),
        "description": _parse_description(soup),
        "baseAbilities": _parse_base_abilities(soup),
        "initialSkills": initial_skills,
        "initialNote": initial_note,
        "levelUpRule": level_up_rule,
        "modifierTable": _parse_modifier_table(soup),
        "skills": {
            "general": _parse_skills_under(soup, "description_skill1"),
            "extra":   _parse_skills_under(soup, "description_skill2"),
        },
    }


def parse_common_skills_php(path: Path | str) -> dict:
    """解析 otherskill.php → 共通特技清單"""
    html = Path(path).read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")
    return {
        "schemaVersion": "2.0",
        "skills": _parse_skills_under(soup, "description_skill1"),
    }


# ---------- CLI ----------

def main():
    if len(sys.argv) < 3:
        print("Usage: python parse_php.py <src_dir> <out_dir>")
        sys.exit(1)
    sys.stdout.reconfigure(encoding="utf-8")
    src_dir = Path(sys.argv[1]).resolve()
    out_dir = Path(sys.argv[2]).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    ok = []
    fail = []
    for level_id in ALL_LEVELS:
        php = src_dir / f"{level_id}.php"
        if not php.exists():
            print(f"SKIP {level_id}: 無 {php}")
            continue
        try:
            data = parse_level_php(php, level_id)
            (out_dir / f"{level_id}.json").write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            n_general = len(data["skills"]["general"])
            n_extra = len(data["skills"]["extra"])
            print(f"OK   {level_id:<22} {data['name']:<6} general={n_general}+extra={n_extra}")
            ok.append(level_id)
        except Exception as e:
            print(f"FAIL {level_id}: {e}")
            fail.append(level_id)

    # 共通特技
    common_php = src_dir / "otherskill.php"
    common_out = out_dir.parent / "common-skills.json"
    if common_php.exists():
        try:
            data = parse_common_skills_php(common_php)
            common_out.write_text(json.dumps(data, ensure_ascii=False, indent=2),
                                  encoding="utf-8")
            print(f"OK   otherskill.php          common-skills.json ({len(data['skills'])} skills)")
        except Exception as e:
            print(f"FAIL common skills: {e}")

    print(f"\n=== {len(ok)}/14 OK, {len(fail)} FAIL ===")
    if fail:
        sys.exit(1)


if __name__ == "__main__":
    main()
