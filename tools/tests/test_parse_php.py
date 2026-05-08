"""Parser tests — TDD against senya_tsukihime PHP fixtures."""
import sys
from pathlib import Path

# 讓 import parse_php 可以找到（tests 在 tools/tests，parse_php 在 tools）
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from parse_php import parse_level_php, parse_common_skills_php

FIXTURES = Path(__file__).parent / "fixtures"

ALL_LEVELS = [
    "karyu", "kenshi", "syuryousya", "daikousya",
    "butouka", "majutushi", "tyouno",
    "og", "gug", "leftway", "kunshi",
    "ninja", "theswordofnameless", "windwater",
]
BASIC = {"karyu", "kenshi", "syuryousya", "daikousya", "butouka", "majutushi", "tyouno"}


# ---------- 單一級別（劍士）的精確驗證 ----------

def test_kenshi_basic_fields():
    r = parse_level_php(FIXTURES / "kenshi.php", level_id="kenshi")
    assert r["id"] == "kenshi"
    assert r["name"] == "劍士"
    assert r["tier"] == "basic"

def test_kenshi_description_non_empty():
    r = parse_level_php(FIXTURES / "kenshi.php", level_id="kenshi")
    assert isinstance(r["description"], str)
    assert len(r["description"]) > 10

def test_kenshi_base_abilities():
    r = parse_level_php(FIXTURES / "kenshi.php", level_id="kenshi")
    a = r["baseAbilities"]
    assert set(a.keys()) == {"physical", "perception", "reason", "will"}
    for v in a.values():
        assert isinstance(v, int)

def test_kenshi_initial_skills_and_levelup_rule():
    r = parse_level_php(FIXTURES / "kenshi.php", level_id="kenshi")
    assert isinstance(r["initialSkills"], list)
    assert len(r["initialSkills"]) >= 1
    assert isinstance(r["levelUpRule"], str)
    assert "等級" in r["levelUpRule"] or "選" in r["levelUpRule"]

def test_kenshi_modifier_table_shape():
    r = parse_level_php(FIXTURES / "kenshi.php", level_id="kenshi")
    table = r["modifierTable"]
    assert set(table.keys()) == {"melee", "ranged", "psychic", "action", "hp", "tp", "defense"}
    for row in table.values():
        assert len(row) == 10
        for v in row:
            assert isinstance(v, int)

def test_kenshi_general_skills_have_required_fields():
    r = parse_level_php(FIXTURES / "kenshi.php", level_id="kenshi")
    assert len(r["skills"]["general"]) > 0
    for sk in r["skills"]["general"]:
        for k in ("name", "category", "cost", "limit", "effect"):
            assert k in sk
        assert sk["name"]

def test_kenshi_skill_effect_strips_prefix():
    """確認 '效果：' 前綴被去掉"""
    r = parse_level_php(FIXTURES / "kenshi.php", level_id="kenshi")
    for sk in r["skills"]["general"]:
        assert not sk["effect"].startswith("效果："), sk["name"]


# ---------- 全 14 級別冒煙測試 ----------

@pytest.mark.parametrize("level_id", ALL_LEVELS)
def test_all_levels_smoke(level_id):
    r = parse_level_php(FIXTURES / f"{level_id}.php", level_id=level_id)
    assert r["id"] == level_id
    assert isinstance(r["name"], str) and r["name"]
    assert r["tier"] == ("basic" if level_id in BASIC else "advanced")
    a = r["baseAbilities"]
    assert set(a.keys()) == {"physical", "perception", "reason", "will"}
    table = r["modifierTable"]
    assert set(table.keys()) == {"melee", "ranged", "psychic", "action", "hp", "tp", "defense"}
    assert all(len(row) == 10 for row in table.values())


@pytest.mark.parametrize("level_id", ALL_LEVELS)
def test_all_levels_have_skills(level_id):
    r = parse_level_php(FIXTURES / f"{level_id}.php", level_id=level_id)
    total = len(r["skills"]["general"]) + len(r["skills"]["extra"])
    assert total > 0, f"{level_id} 應該至少有 1 個特技"


# 12 / 14 級別有真正的 description_skill2 anchor（karyu / ninja 例外，無 extra section）
LEVELS_WITH_EXTRA = [
    "butouka", "daikousya", "gug", "kenshi", "kunshi", "leftway",
    "majutushi", "og", "syuryousya", "theswordofnameless", "tyouno", "windwater",
]

@pytest.mark.parametrize("level_id", LEVELS_WITH_EXTRA)
def test_extra_skills_are_extracted(level_id):
    """確認 extra 區段（description_skill2）被正確抽出且和 general 不重複"""
    r = parse_level_php(FIXTURES / f"{level_id}.php", level_id=level_id)
    extras = r["skills"]["extra"]
    assert len(extras) > 0, f"{level_id} 應該有至少 1 個額外特技"
    general_names = {s["name"] for s in r["skills"]["general"]}
    extra_names = {s["name"] for s in extras}
    # general 與 extra 應該各自獨立（不應該全部重複）
    overlap = general_names & extra_names
    assert overlap != general_names, f"{level_id}: extra 與 general 完全重複（parser stop-anchor 失效）"


def test_ninja_no_extra_section():
    """ninja 沒有 description_skill2 anchor，所有特技歸於 general（共 16 個）"""
    r = parse_level_php(FIXTURES / "ninja.php", level_id="ninja")
    assert len(r["skills"]["extra"]) == 0
    assert len(r["skills"]["general"]) >= 10  # 寬鬆下限


# ---------- 共通特技（otherskill.php）特殊處理 ----------

def test_common_skills_otherskill():
    r = parse_common_skills_php(FIXTURES / "otherskill.php")
    assert "skills" in r
    assert isinstance(r["skills"], list)
    assert len(r["skills"]) > 0
    for sk in r["skills"]:
        assert "name" in sk
        assert sk["name"]
