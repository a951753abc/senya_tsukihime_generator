import { describe, test, expect } from 'vitest';
import { defaultCharacter } from '../js/store.js';
import { toBBCode } from '../js/exporters/bbcode.js';

describe('toBBCode', () => {
  test('預設空角色不會 throw', () => {
    expect(() => toBBCode(defaultCharacter())).not.toThrow();
  });

  test('含基本標籤', () => {
    const md = toBBCode(defaultCharacter());
    expect(md).toContain('[size=18][b]無名[/b][/size]');
    expect(md).toContain('[table]');
    expect(md).toContain('[/table]');
    expect(md).toContain('能力');
  });

  test('豐富角色含風格／技能／關係 BBCode', () => {
    const c = defaultCharacter();
    c.meta.name = '透';
    c.meta.player = 'A';
    c.classes = [{ id: 'og', name: '古神道', tier: 'advanced', level: 4, isPrimary: true }];
    c.styles = [{ name: '修羅', classification: '常時', antithesis: '與我一戰！',
      compensation: '', emotion: '敵手', isPrimary: true }];
    c.skills.equipped.push({ name: '陰陽道', classId: 'og', category: '常時',
      cost: '—', limit: '無', effect: '神術' });
    c.relationships.push({ name: '甲', emotion: '信賴', tone: 'pure', bond: 2, note: '' });
    const bb = toBBCode(c);
    expect(bb).toContain('[b]修羅[/b]');
    expect(bb).toContain('[color=#b0382b][b]主[/b][/color]');
    expect(bb).toContain('陰陽道');
    expect(bb).toContain('[color=#3a6a52]潔淨[/color]');
    expect(bb).toContain('[b]玩家：[/b]A');
    expect(bb).toContain('古神道 LV4');
  });
});
