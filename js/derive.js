/**
 * 派生公式 — 純函式，無副作用
 *
 * 千夜月姬規則：
 *   能力紅利_X = ⌊total_X / 3⌋   ←判定用的關鍵值
 *
 * 戰鬥值（用紅利，不是合計直接加）：
 *   近戰  = 紅利_體力 + 紅利_知覺 + ⌊Lv/2⌋ + 火
 *   射擊  = 紅利_知覺 + 紅利_理智 + ⌊Lv/2⌋ + 風
 *   精神  = 紅利_理智 + 紅利_意志 + ⌊Lv/2⌋ + 空
 *   行動  = 紅利_體力 + 紅利_意志 + ⌊Lv/2⌋ + 風
 *
 * HP / TP（用合計，沿用 v3 設計）：
 *   HP = 体力_total × 6 + Lv × 2
 *   TP = 理智_total × 4 + 意志_total × 2 + Lv
 *
 * 防禦：0（Phase 1-D 後從級別 modifierTable 取）
 *
 * 合計     = base + mod1 + mod2 + mod3 + special
 * Lv       = sum(classes[i].level)
 * 羈絆     = pure: |bond| where tone=pure；crazy: |bond| where tone=crazy；total: bond 直接相加
 */

export function abilityTotal(cell) {
  if (!cell) return 0;
  return (cell.base || 0)
    + (cell.mod1 || 0)
    + (cell.mod2 || 0)
    + (cell.mod3 || 0)
    + (cell.special || 0);
}

/** 能力紅利 = ⌊合計 / 3⌋ — 判定用 */
export function abilityBonus(total) {
  return Math.floor((total || 0) / 3);
}

export function characterLevel(classes) {
  if (!Array.isArray(classes)) return 0;
  return classes.reduce((sum, c) => sum + (c?.level || 0), 0);
}

export function abilityToPercent(value) {
  // Linear map [1, 10] -> [0%, 100%]
  const clamped = Math.max(1, Math.min(10, value));
  return ((clamped - 1) / 9) * 100;
}

export function deriveBond(relationships) {
  const acc = { total: 0, pure: 0, crazy: 0 };
  if (!Array.isArray(relationships)) return acc;
  for (const r of relationships) {
    const v = r?.bond || 0;
    acc.total += v;
    if (r?.tone === 'pure') acc.pure += Math.abs(v);
    else if (r?.tone === 'crazy') acc.crazy += Math.abs(v);
  }
  return acc;
}

export function deriveAll(character) {
  const a = character.stats.abilities;
  const e = character.stats.elements;

  const totals = {
    physical:   abilityTotal(a.physical),
    perception: abilityTotal(a.perception),
    reason:     abilityTotal(a.reason),
    will:       abilityTotal(a.will),
  };

  // 能力紅利 — 判定用，⌊合計/3⌋
  const bonus = {
    physical:   abilityBonus(totals.physical),
    perception: abilityBonus(totals.perception),
    reason:     abilityBonus(totals.reason),
    will:       abilityBonus(totals.will),
  };

  const lv = characterLevel(character.classes);
  const halfLv = Math.floor(lv / 2);

  // HP / TP — 沿用 v3 設計（用合計）
  const hp = totals.physical * 6 + lv * 2;
  const tp = totals.reason * 4 + totals.will * 2 + lv;

  // 戰鬥值 — 千夜月姬規則：兩個能力紅利之和 + ⌊Lv/2⌋ + 元素
  const combat = {
    melee:   bonus.physical   + bonus.perception + halfLv + (e.fire || 0),
    ranged:  bonus.perception + bonus.reason     + halfLv + (e.wind || 0),
    psychic: bonus.reason     + bonus.will       + halfLv + (e.void || 0),
    action:  bonus.physical   + bonus.will       + halfLv + (e.wind || 0),
  };

  const defense = 0; // TODO: Phase 1-D 後從級別 modifierTable 取

  const bond = deriveBond(character.relationships);

  return { totals, bonus, characterLevel: lv, hp, tp, combat, defense, bond };
}
