/**
 * 角色卡 → ccfolia character JSON
 *
 * ccfolia (https://ccfolia.com) 是日本線上 TRPG 平台。
 * Character import 格式：
 *   { kind: "character", data: { name, iconUrl, memo, params[], status[], commands } }
 *
 * 注意：ccfolia 沒有公開 schema 文件，本實作依社群常用格式產生。
 * user 第一次匯入後若有偏差，回報實際狀況再調整。
 */

import { abilityTotal, characterLevel, deriveAll } from '../derive.js';

function classesLine(classes) {
  if (!classes || classes.length === 0) return '平民';
  return classes.map(c => `${c.name || c.id}LV${c.level}`).join('/');
}

function buildCommands(card, d) {
  // 預設 chat palette：常用判定 + 戰鬥值
  const lines = [
    '// 千夜月姫 ・ 角色帳',
    `// ${card.meta.name || '無名'}　LV${d.characterLevel}　${classesLine(card.classes)}`,
    '',
    '2d6 ←基本判定',
    `2d6+${d.combat.melee} ←近戰`,
    `2d6+${d.combat.ranged} ←射擊`,
    `2d6+${d.combat.psychic} ←精神`,
    `2d6+${d.combat.action} ←行動`,
    '',
    '1d6+3 ←起手骰',
  ];
  // 已習得特技
  if (card.skills?.equipped?.length) {
    lines.push('', '// 特技');
    for (const s of card.skills.equipped) {
      const cost = s.cost && s.cost !== '—' ? ` (${s.cost})` : '';
      lines.push(`// ${s.name}${cost}`);
    }
  }
  return lines.join('\n');
}

export function toCcfolia(card) {
  const d = deriveAll(card);
  const totals = d.totals;

  const params = [
    { label: '玩家', value: card.meta.player || '' },
    { label: '級別', value: classesLine(card.classes) },
    { label: '角色等級', value: String(d.characterLevel) },
    { label: '種族', value: card.personal.race || '' },
    { label: '年齢', value: card.personal.age || '' },
    { label: '性別', value: card.personal.gender || '' },
    { label: '體力', value: String(totals.physical) },
    { label: '知覺', value: String(totals.perception) },
    { label: '理智', value: String(totals.reason) },
    { label: '意志', value: String(totals.will) },
    { label: '近戰', value: String(d.combat.melee) },
    { label: '射擊', value: String(d.combat.ranged) },
    { label: '精神', value: String(d.combat.psychic) },
    { label: '行動', value: String(d.combat.action) },
    { label: '防禦點', value: String(d.defense) },
    { label: '主風格', value: card.styles?.[0]?.name || '' },
  ].filter(p => p.value !== '');

  const status = [
    { label: 'HP', value: d.hp, max: d.hp },
    { label: 'TP', value: d.tp, max: d.tp },
    { label: '羈絆', value: d.bond.total, max: 100 },
  ];

  // memo：個人資料 + 設定 + 風格摘要
  const memoLines = [
    card.meta.yomi ? `讀み：${card.meta.yomi}` : '',
    card.personal.appearance ? `外貌：${card.personal.appearance}` : '',
    card.personal.society ? `地域社會：${card.personal.society}` : '',
    '',
    ...(card.styles || []).map((s, i) =>
      `${i === 0 ? '【主】' : '・'}${s.name}${s.antithesis ? `「${s.antithesis}」` : ''}`
    ),
    '',
    card.setting?.background ? `[背景]\n${card.setting.background}` : '',
    card.setting?.personality ? `[性格]\n${card.setting.personality}` : '',
    card.setting?.history ? `[来歴]\n${card.setting.history}` : '',
    card.setting?.memo ? `[筆記]\n${card.setting.memo}` : '',
  ].filter(Boolean).join('\n');

  return {
    kind: 'character',
    data: {
      name: card.meta.name || '無名',
      iconUrl: '',
      memo: memoLines,
      initiative: d.combat.action,
      externalUrl: '',
      status,
      params,
      commands: buildCommands(card, d),
    },
  };
}
