/**
 * 角色卡 → Markdown（GFM／Discord 友善）
 */

import { abilityTotal, characterLevel, deriveAll } from '../derive.js';

const ABILITIES = [
  ['physical',   '體力'],
  ['perception', '知覺'],
  ['reason',     '理智'],
  ['will',       '意志'],
];
const ELEMS = [
  ['earth', '地'], ['water', '水'], ['fire', '火'],
  ['wind',  '風'], ['void',  '空'],
];

function fmtMod(n) {
  if (!n) return '—';
  return n > 0 ? `+${n}` : String(n);
}

function classesLine(classes) {
  if (!classes || classes.length === 0) return '平民';
  return classes.map(c => `${c.name || c.id} LV${c.level}`).join(' / ');
}

function abilityTable(abilities) {
  const head = '| 能力 | 基礎 | 級1 | 級2 | 級3 | 特殊 | 合計 |\n|---|---|---|---|---|---|---|';
  const rows = ABILITIES.map(([k, name]) => {
    const cell = abilities[k];
    const total = abilityTotal(cell);
    return `| ${name} | ${cell.base || 0} | ${fmtMod(cell.mod1)} | ${fmtMod(cell.mod2)} | ${fmtMod(cell.mod3)} | ${fmtMod(cell.special)} | **${total}** |`;
  }).join('\n');
  return head + '\n' + rows;
}

function stylesSection(styles) {
  if (!styles || styles.length === 0) return '';
  const lines = styles.map((s, i) => {
    const tag = i === 0 ? '**主**' : `${i + 1}.`;
    const restriction = s.classRestriction && s.classRestriction !== '無'
      ? ` — 級別限制：${s.classRestriction}` : '';
    const parts = [
      `${tag} **${s.name}**`,
      s.classification ? `（${s.classification}）` : '',
      s.antithesis ? ` — 背反「${s.antithesis}」` : '',
      s.compensation ? ` — 代償：${s.compensation}` : '',
      s.emotion ? ` — 獲得感情：${s.emotion}` : '',
      restriction,
    ];
    return '- ' + parts.join('');
  });
  return '\n## 風格\n' + lines.join('\n');
}

function skillsSection(equipped) {
  if (!equipped || equipped.length === 0) return '';
  const lines = equipped.map(s => {
    const head = `### ${s.name}${s.classId ? `（${s.classId}）` : ''}　【${s.category || '—'}】`;
    const meta = [
      s.cost ? `代價：${s.cost}` : '',
      s.limit && s.limit !== '無' ? `取得限制：${s.limit}` : '',
      s.emotionReward ? `情緒獎勵：${s.emotionReward}` : '',
    ].filter(Boolean).map(x => `- ${x}`).join('\n');
    const effect = s.effect ? `\n${s.effect.trim()}` : '';
    const advanced = (s.secondaryCondition || s.additionalEffect)
      ? `\n\n**二段條件**：${s.secondaryCondition || '—'}\n**追加效果**：${s.additionalEffect || '—'}`
      : '';
    return [head, meta, effect, advanced].filter(Boolean).join('\n');
  });
  return `\n## 特技（${equipped.length}）\n` + lines.join('\n\n');
}

function itemsSection(items) {
  if (!items) return '';
  const tiers = [
    ['tier1to3', '等級 1〜3'],
    ['tier4to6', '等級 4〜6'],
    ['tier7to9', '等級 7〜9'],
  ];
  const blocks = tiers.map(([k, label]) => {
    const list = items[k] || [];
    if (list.length === 0) return '';
    const lines = list.map(it => {
      const lv = it.level ? ` (${it.level})` : '';
      const note = it.note ? ` — ${it.note}` : '';
      return `- ${it.name}${lv}${note}`;
    }).join('\n');
    return `**${label}**\n${lines}`;
  }).filter(Boolean);
  if (blocks.length === 0) return '';
  return '\n## 所持道具\n' + blocks.join('\n\n');
}

function relationshipsSection(rels) {
  if (!rels || rels.length === 0) return '';
  const head = '| 角色 | 感情 | 色調 | 羈絆 | 備註 |\n|---|---|---|---|---|';
  const rows = rels.map(r => {
    const tone = r.tone === 'pure' ? '潔淨' : r.tone === 'crazy' ? '瘋狂' : '—';
    const npc = r.isNpc ? '（NPC）' : '';
    return `| ${r.name || ''}${npc} | ${r.emotion || '—'} | ${tone} | ${r.bond ?? 0} | ${(r.note || '').replace(/\|/g, '\\|')} |`;
  }).join('\n');
  return '\n## 角色關係\n' + head + '\n' + rows;
}

function settingSection(s) {
  if (!s) return '';
  const blocks = [
    ['background',  '背景・出自'],
    ['personality', '性格・癖'],
    ['history',     '来歴・劇本連動'],
    ['memo',        '自由メモ'],
  ];
  const out = blocks
    .filter(([k]) => (s[k] || '').trim())
    .map(([k, label]) => `**${label}**\n${s[k].trim()}`)
    .join('\n\n');
  return out ? '\n## 角色設定\n' + out : '';
}

export function toMarkdown(card) {
  const d = deriveAll(card);
  const lv = d.characterLevel;
  const head = card.meta.yomi
    ? `# ${card.meta.name || '無名'} — ${card.meta.yomi}`
    : `# ${card.meta.name || '無名'}`;
  const summary = [
    card.meta.player ? `**玩家**：${card.meta.player}` : '',
    `**級別**：${classesLine(card.classes)}`,
    `**角色等級**：${lv}`,
  ].filter(Boolean).join('　');

  const personal = [
    card.personal.race ? `- 種族：${card.personal.race}` : '',
    card.personal.society ? `- 地域社會：${card.personal.society}` : '',
    (card.personal.age || card.personal.gender)
      ? `- 年齢：${card.personal.age || '—'} ／ 性別：${card.personal.gender || '—'}` : '',
    card.personal.appearance ? `- 外貌：${card.personal.appearance}` : '',
    card.progression.remainingExp ? `- 剩餘經驗點：${card.progression.remainingExp}` : '',
    card.progression.initial ? `- 初始：${card.progression.initial}` : '',
  ].filter(Boolean);
  const personalSection = personal.length > 0 ? '\n## 個人資料\n' + personal.join('\n') : '';

  const elemsLine = ELEMS.map(([k, n]) => `${n} ${card.stats.elements[k] || 0}`).join(' ・ ');
  const extras = (card.stats.elementsExtra || []).map(e => `${e.name} ${e.value}`).join(' ・ ');
  const elementsSection = '\n## 五大屬性\n' + elemsLine + (extras ? `\n例外：${extras}` : '');

  const derivedSection = `
## 派生
- HP **${d.hp}** ／ TP **${d.tp}**
- 近戰 ${d.combat.melee} ／ 射擊 ${d.combat.ranged} ／ 精神 ${d.combat.psychic} ／ 行動 ${d.combat.action}
- 防禦點 ${d.defense}
- 羈絆值合計 ${d.bond.total}（潔淨 ${d.bond.pure}　·　瘋狂 ${d.bond.crazy}）`;

  const parts = [
    head,
    summary,
    personalSection,
    stylesSection(card.styles),
    '\n## 能力值\n' + abilityTable(card.stats.abilities),
    elementsSection,
    derivedSection,
    skillsSection(card.skills?.equipped),
    itemsSection(card.items),
    relationshipsSection(card.relationships),
    settingSection(card.setting),
  ].filter(Boolean);

  return parts.join('\n') + '\n';
}
