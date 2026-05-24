import { describe, test, expect } from 'vitest';
import { defaultCharacter } from '../js/store.js';
import { toMarkdown } from '../js/exporters/markdown.js';

function richCard() {
  const c = defaultCharacter();
  c.meta.name = '久遠寺 透';
  c.meta.yomi = 'クオンジ・トオル';
  c.meta.player = 'あおい';
  c.personal.race = '人間';
  c.personal.society = '月讀神社・分家';
  c.personal.age = '17';
  c.personal.gender = '男';
  c.personal.appearance = '銀／緋／淡／178cm';
  c.progression.remainingExp = 3;
  c.progression.initial = '古神道 / 4';
  c.classes = [
    { id: 'og', name: '古神道', tier: 'advanced', level: 4, isPrimary: true },
    { id: 'majutushi', name: '魔術師', tier: 'basic', level: 2, isPrimary: false },
  ];
  c.styles = [
    { name: '起源：禁忌', classification: '常時', antithesis: '禁忌之愛',
      compensation: '', emotion: '獨佔欲', isPrimary: true },
  ];
  c.stats.abilities.physical = { base: 4, mod1: 2, mod2: 1, mod3: 0, special: 0 };
  c.stats.abilities.perception = { base: 3, mod1: 1, mod2: 1, mod3: 0, special: 0 };
  c.stats.abilities.reason = { base: 5, mod1: 2, mod2: 0, mod3: 0, special: 1 };
  c.stats.abilities.will = { base: 4, mod1: 1, mod2: 1, mod3: 0, special: 0 };
  c.stats.elements = { earth: 2, water: 3, fire: 1, wind: 1, void: 3 };
  c.skills.equipped.push({
    name: '月讀の眼', classId: 'og', category: '常時',
    cost: '—', limit: '古神道 Lv1+',
    effect: '場面開始時，可指定一名 NPC，記錄其所在區位。',
    secondaryCondition: '', additionalEffect: '', emotionReward: '',
  });
  c.relationships.push(
    { name: '霧宮 茜', isNpc: false, emotion: '獨佔欲', tone: 'crazy', bond: 4, note: 'ループで失った人' }
  );
  c.setting.background = '分家の生まれ。';
  return c;
}

describe('toMarkdown', () => {
  test('預設空角色不會 throw', () => {
    expect(() => toMarkdown(defaultCharacter())).not.toThrow();
  });

  test('空角色含基本欄位', () => {
    const md = toMarkdown(defaultCharacter());
    expect(md).toContain('# 無名');
    expect(md).toContain('## 能力值');
    expect(md).toContain('## 派生');
    expect(md).toContain('## 五大屬性');
  });

  test('豐富角色含所有區塊', () => {
    const md = toMarkdown(richCard());
    expect(md).toContain('# 久遠寺 透 — クオンジ・トオル');
    expect(md).toContain('**玩家**：あおい');
    expect(md).toContain('古神道 LV4 / 魔術師 LV2');
    expect(md).toContain('**角色等級**：6');
    expect(md).toContain('## 個人資料');
    expect(md).toContain('種族：人間');
    expect(md).toContain('## 風格');
    expect(md).toContain('**主** **起源：禁忌**');
    expect(md).toContain('禁忌之愛');
    expect(md).toContain('## 能力值');
    expect(md).toContain('| 體力 | 4 | +2 | +1 | — | — | **7** |');
    expect(md).toContain('| 理智 | 5 | +2 | — | — | +1 | **8** |');
    expect(md).toContain('## 五大屬性');
    expect(md).toContain('地 2');
    expect(md).toContain('## 派生');
    expect(md).toMatch(/HP \*\*\d+ \/ \d+\*\*/);
    expect(md).toMatch(/TP \*\*\d+ \/ \d+\*\*/);
    expect(md).toContain('## 特技（1）');
    expect(md).toContain('### 月讀の眼');
    expect(md).toContain('## 角色關係');
    expect(md).toContain('霧宮 茜');
    expect(md).toContain('瘋狂');
    expect(md).toContain('## 角色設定');
    expect(md).toContain('**背景・出自**');
  });

  test('| 字符在 note 內被跳脫', () => {
    const c = defaultCharacter();
    c.relationships.push({ name: 'X', emotion: 'Y', tone: 'pure', bond: 1, note: '含 | 字' });
    const md = toMarkdown(c);
    expect(md).toContain('含 \\| 字');
  });
});
