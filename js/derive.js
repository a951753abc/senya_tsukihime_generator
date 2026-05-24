/**
 * 派生公式 — 純函式，無副作用。
 *
 * 千夜月姬權威公式（依 charcard.xlsx 角色卡工作表逆向）：
 *
 *   合計_X = base + mod1 + mod2 + mod3 + special
 *     其中 mod_i = class[i].baseAbility[X] × class[i].level（attrs.js 自動同步）
 *
 *   能力紅利_X = ⌊合計_X / 3⌋   ←判定用
 *
 *   modSum.Y = Σ class[i].modifierTable.Y[class[i].level - 1]   ← 每個級別槽的修正合計
 *
 *   戰鬥值（紅利兩兩相加 + 級別修正）：
 *     近戰 = 紅利_體 + 紅利_知 + modSum.melee
 *     射擊 = 紅利_知 + 紅利_理 + modSum.ranged
 *     精神 = 紅利_理 + 紅利_意 + modSum.psychic
 *     行動 = 紅利_體 + 紅利_意 + modSum.action
 *
 *   HP = (紅利_體 + 紅利_理) × max(角色等級, 5) + modSum.hp
 *   TP = (紅利_知 + 紅利_意) × 5                + modSum.tp
 *   防禦 = modSum.defense
 *
 *   合計     = base + mod1 + mod2 + mod3 + special
 *   角色等級 = sum(classes[i].level)
 *   羈絆     = pure: |bond| where tone=pure；crazy: |bond| where tone=crazy；total: bond 直接相加
 *
 *   注：元素（地水火風空 + 例外）為獨立資訊欄，不直接加進戰鬥值。
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

const MOD_KEYS = ['melee', 'ranged', 'psychic', 'action', 'hp', 'tp', 'defense'];

/**
 * 累加每個級別槽的 modifierTable 修正。
 * @param {Array} classes - card.classes
 * @param {Map<string, object>} levelDataMap - classId → level JSON
 * @returns {Object} modSum {melee, ranged, psychic, action, hp, tp, defense}
 */
export function computeModSum(classes, levelDataMap) {
  const sum = Object.fromEntries(MOD_KEYS.map(k => [k, 0]));
  if (!Array.isArray(classes) || !levelDataMap) return sum;
  for (const cls of classes) {
    if (!cls?.id) continue;
    const data = levelDataMap.get(cls.id);
    if (!data?.modifierTable) continue;
    const idx = Math.min(Math.max(cls.level || 1, 1), 10) - 1;
    for (const k of MOD_KEYS) {
      const arr = data.modifierTable[k];
      if (Array.isArray(arr)) sum[k] += arr[idx] || 0;
    }
  }
  return sum;
}

/**
 * @param {object} character - 角色卡
 * @param {Map<string, object>} [levelDataMap] - 預載的級別資料；缺省時 modSum 全 0
 */
export function deriveAll(character, levelDataMap) {
  const a = character.stats.abilities;

  const totals = {
    physical:   abilityTotal(a.physical),
    perception: abilityTotal(a.perception),
    reason:     abilityTotal(a.reason),
    will:       abilityTotal(a.will),
  };

  const bonus = {
    physical:   abilityBonus(totals.physical),
    perception: abilityBonus(totals.perception),
    reason:     abilityBonus(totals.reason),
    will:       abilityBonus(totals.will),
  };

  const lv = characterLevel(character.classes);
  const modSum = computeModSum(character.classes, levelDataMap || new Map());

  // HP / TP — (紅利+紅利) × multiplier + modSum
  const hp = (bonus.physical + bonus.reason) * Math.max(lv, 5) + modSum.hp;
  const tp = (bonus.perception + bonus.will) * 5            + modSum.tp;

  // 戰鬥值 — 紅利兩兩相加 + 級別修正
  const combat = {
    melee:   bonus.physical   + bonus.perception + modSum.melee,
    ranged:  bonus.perception + bonus.reason     + modSum.ranged,
    psychic: bonus.reason     + bonus.will       + modSum.psychic,
    action:  bonus.physical   + bonus.will       + modSum.action,
  };

  const defense = modSum.defense;
  const bond = deriveBond(character.relationships);
  const hpCurrent = character.resources?.hpCurrent ?? hp;
  const tpCurrent = character.resources?.tpCurrent ?? tp;

  return { totals, bonus, characterLevel: lv, hp, tp, hpCurrent, tpCurrent, combat, defense, bond, modSum };
}
