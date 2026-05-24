/**
 * 角色卡 → BBCode（公會論壇／Plurk-friendly）
 *
 * 通用 BBCode 標籤：
 *   [b]粗[/b] [i]斜[/i] [u]底[/u]
 *   [color=red]顏色[/color]
 *   [size=14]字級[/size]
 *   [list][*]item[/list]
 *   [table][tr][td]...[/td][/tr][/table]
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
  const head = '[tr][td][b]能力[/b][/td][td][b]基礎[/b][/td][td][b]級1[/b][/td][td][b]級2[/b][/td][td][b]級3[/b][/td][td][b]特殊[/b][/td][td][b]合計[/b][/td][/tr]';
  const rows = ABILITIES.map(([k, name]) => {
    const cell = abilities[k];
    const total = abilityTotal(cell);
    return `[tr][td]${name}[/td][td]${cell.base || 0}[/td][td]${fmtMod(cell.mod1)}[/td][td]${fmtMod(cell.mod2)}[/td][td]${fmtMod(cell.mod3)}[/td][td]${fmtMod(cell.special)}[/td][td][b]${total}[/b][/td][/tr]`;
  }).join('');
  return `[table]${head}${rows}[/table]`;
}

function section(title, body) {
  if (!body) return '';
  return `\n[size=14][color=#b0382b][b]${title}[/b][/color][/size]\n${body}`;
}

function stylesSection(styles) {
  if (!styles || styles.length === 0) return '';
  const lines = styles.map((s, i) => {
    const tag = i === 0 ? '[color=#b0382b][b]主[/b][/color]' : `${i + 1}.`;
    const parts = [
      `${tag} [b]${s.name}[/b]`,
      s.classification ? `（${s.classification}）` : '',
      s.antithesis ? ` 背反「${s.antithesis}」` : '',
      s.compensation ? ` 代償：${s.compensation}` : '',
      s.emotion ? ` 獲得：${s.emotion}` : '',
    ];
    return `[*]${parts.join('')}`;
  }).join('');
  return section('風格', `[list]${lines}[/list]`);
}

function skillsSection(equipped) {
  if (!equipped || equipped.length === 0) return '';
  const blocks = equipped.map(s => {
    const head = `[b]${s.name}[/b]${s.classId ? `（${s.classId}）` : ''} [color=#7a1f17][${s.category || '—'}][/color]`;
    const meta = [
      s.cost ? `代價：${s.cost}` : '',
      s.limit && s.limit !== '無' ? `取得限制：${s.limit}` : '',
    ].filter(Boolean).join(' ・ ');
    const adv = (s.secondaryCondition || s.additionalEffect)
      ? `\n[i]二段：${s.secondaryCondition || '—'}　追加：${s.additionalEffect || '—'}[/i]`
      : '';
    return `${head}\n${meta}\n${(s.effect || '').trim()}${adv}`;
  }).join('\n\n');
  return section(`特技（${equipped.length}）`, blocks);
}

function itemsSection(items) {
  if (!items) return '';
  const tiers = [
    ['tier1to3', '1〜3'],
    ['tier4to6', '4〜6'],
    ['tier7to9', '7〜9'],
  ];
  const out = tiers.map(([k, label]) => {
    const list = items[k] || [];
    if (list.length === 0) return '';
    const lis = list.map(it => {
      const lv = it.level ? ` (${it.level})` : '';
      const note = it.note ? ` — ${it.note}` : '';
      return `[*]${it.name}${lv}${note}`;
    }).join('');
    return `[b]等級 ${label}：[/b][list]${lis}[/list]`;
  }).filter(Boolean).join('');
  return out ? section('所持道具', out) : '';
}

function relationshipsSection(rels) {
  if (!rels || rels.length === 0) return '';
  const head = '[tr][td][b]角色[/b][/td][td][b]感情[/b][/td][td][b]色調[/b][/td][td][b]羈絆[/b][/td][td][b]備註[/b][/td][/tr]';
  const rows = rels.map(r => {
    const tone = r.tone === 'pure'
      ? '[color=#3a6a52]潔淨[/color]'
      : r.tone === 'crazy'
      ? '[color=#7a3a52]瘋狂[/color]'
      : '—';
    const npc = r.isNpc ? '（NPC）' : '';
    return `[tr][td]${r.name || ''}${npc}[/td][td]${r.emotion || '—'}[/td][td]${tone}[/td][td]${r.bond ?? 0}[/td][td]${r.note || ''}[/td][/tr]`;
  }).join('');
  return section('角色關係', `[table]${head}${rows}[/table]`);
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
    .map(([k, label]) => `[b]${label}[/b]\n${s[k].trim()}`)
    .join('\n\n');
  return out ? section('角色設定', out) : '';
}

export function toBBCode(card, levelDataMap) {
  const d = deriveAll(card, levelDataMap);
  const lv = d.characterLevel;
  const head = card.meta.yomi
    ? `[size=18][b]${card.meta.name || '無名'}[/b][/size]　[size=12][i]${card.meta.yomi}[/i][/size]`
    : `[size=18][b]${card.meta.name || '無名'}[/b][/size]`;
  const summary = [
    card.meta.player ? `[b]玩家：[/b]${card.meta.player}` : '',
    `[b]級別：[/b]${classesLine(card.classes)}`,
    `[b]角色等級：[/b]${lv}`,
  ].filter(Boolean).join('　');

  const personalLines = [
    card.personal.race ? `[*]種族：${card.personal.race}` : '',
    card.personal.society ? `[*]地域社會：${card.personal.society}` : '',
    (card.personal.age || card.personal.gender)
      ? `[*]年齢：${card.personal.age || '—'}　性別：${card.personal.gender || '—'}` : '',
    card.personal.appearance ? `[*]外貌：${card.personal.appearance}` : '',
    card.progression.remainingExp ? `[*]剩餘經驗點：${card.progression.remainingExp}` : '',
    card.progression.initial ? `[*]初始：${card.progression.initial}` : '',
  ].filter(Boolean).join('');
  const personalSection = personalLines ? section('個人資料', `[list]${personalLines}[/list]`) : '';

  const elemsLine = ELEMS.map(([k, n]) => `${n} ${card.stats.elements[k] || 0}`).join('　');
  const extras = (card.stats.elementsExtra || []).map(e => `${e.name} ${e.value}`).join('　');
  const elementsBody = elemsLine + (extras ? `\n例外：${extras}` : '');

  const derivedBody = `[b]HP[/b] ${d.hpCurrent}/${d.hp}　[b]TP[/b] ${d.tpCurrent}/${d.tp}\n` +
    `近戰 ${d.combat.melee}　射擊 ${d.combat.ranged}　精神 ${d.combat.psychic}　行動 ${d.combat.action}\n` +
    `防禦點 ${d.defense}　羈絆 ${d.bond.total}（潔淨 ${d.bond.pure} / 瘋狂 ${d.bond.crazy}）`;

  const parts = [
    head,
    summary,
    personalSection,
    stylesSection(card.styles),
    section('能力值', abilityTable(card.stats.abilities)),
    section('五大屬性', elementsBody),
    section('派生', derivedBody),
    skillsSection(card.skills?.equipped),
    itemsSection(card.items),
    relationshipsSection(card.relationships),
    settingSection(card.setting),
  ].filter(Boolean);

  return parts.join('\n');
}
