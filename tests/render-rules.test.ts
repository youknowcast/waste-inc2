// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { BLINDS, bossLabel, bossText } from '../src/data/blinds';
import { ITEMS } from '../src/data/items';
import { JOKERS } from '../src/data/jokers';
import { RANKS, SUIT_LABEL, SUITS } from '../src/game/cards';
import { HAND_LABEL, HAND_TABLE, HAND_TYPES } from '../src/game/hands';
import { actionFromElement, createApp, dispatch } from '../src/ui/app';
import { renderApp } from '../src/ui/render';

function rulesApp() {
  const app = createApp('s');
  dispatch(app, { kind: 'openRules' });
  return app;
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('あそびかたの導線', () => {
  it('openRules で rules になり、returnScreen が直前の画面になる', () => {
    const app = createApp('s');
    dispatch(app, { kind: 'newRun', seed: 's' });
    dispatch(app, { kind: 'openBlind' });
    expect(app.screen).toBe('board');
    dispatch(app, { kind: 'openRules' });
    expect(app.screen).toBe('rules');
    expect(app.returnScreen).toBe('board');
  });

  it('closeRules で元の画面に戻り、returnScreen が null に戻る', () => {
    const app = createApp('s');
    dispatch(app, { kind: 'newRun', seed: 's' });
    dispatch(app, { kind: 'openBlind' });
    dispatch(app, { kind: 'openRules' });
    dispatch(app, { kind: 'closeRules' });
    expect(app.screen).toBe('board');
    expect(app.returnScreen).toBeNull();
  });

  it('returnScreen が無いまま closeRules するとタイトルに帰る', () => {
    const app = createApp('s');
    dispatch(app, { kind: 'closeRules' });
    expect(app.screen).toBe('title');
    expect(app.returnScreen).toBeNull();
  });

  it('盤面では「？」ボタンが出て、rules 画面では出ない', () => {
    const app = createApp('s');
    dispatch(app, { kind: 'newRun', seed: 's' });
    dispatch(app, { kind: 'openBlind' });
    expect(renderApp(app)).toContain('data-action="openRules"');
    dispatch(app, { kind: 'openRules' });
    expect(renderApp(app)).not.toContain('data-action="openRules"');
  });

  it('タイトルに「あそびかた」ボタンがある', () => {
    const html = renderApp(createApp('s'));
    expect(html).toContain('あそびかた');
    expect(html).toContain('data-action="openRules"');
  });

  it('actionFromElement が openRules / closeRules を拾う', () => {
    const doc = parse(
      '<button data-action="openRules"></button><button data-action="closeRules"></button>',
    );
    const [open, close] = doc.querySelectorAll('button');
    expect(
      actionFromElement(open as unknown as { dataset: DOMStringMap }),
    ).toEqual({ kind: 'openRules' });
    expect(
      actionFromElement(close as unknown as { dataset: DOMStringMap }),
    ).toEqual({ kind: 'closeRules' });
  });
});

describe('あそびかたの中身', () => {
  it('10役すべての呼称が出る', () => {
    const html = renderApp(rulesApp());
    expect(HAND_TYPES).toHaveLength(10);
    for (const type of HAND_TYPES) {
      expect(html).toContain(HAND_LABEL[type]);
    }
  });

  it('各役の基礎の重さと単価が HAND_TABLE の値と一致する', () => {
    const doc = parse(renderApp(rulesApp()));
    for (const type of HAND_TYPES) {
      const row = doc.querySelector(`[data-hand="${type}"]`);
      expect(row).not.toBeNull();
      expect(row?.textContent).toContain(String(HAND_TABLE[type].baseWeight));
      expect(row?.textContent).toContain(String(HAND_TABLE[type].baseMult));
    }
  });

  it('20枚すべてのジョーカー名が出る', () => {
    const html = renderApp(rulesApp());
    expect(JOKERS).toHaveLength(20);
    for (const joker of JOKERS) {
      expect(html).toContain(joker.name);
    }
  });

  it('3つの元請名とその縛り文が出る', () => {
    const html = renderApp(rulesApp());
    const bosses = BLINDS.filter((b) => b.index === 2);
    expect(bosses).toHaveLength(3);
    for (const blind of bosses) {
      if (!blind.bossId) throw new Error('bossId is missing');
      expect(html).toContain(bossLabel(blind.bossId));
      expect(html).toContain(bossText(blind.bossId));
    }
  });

  it('9便ぶんの目標金額が出る', () => {
    const doc = parse(renderApp(rulesApp()));
    expect(BLINDS).toHaveLength(9);
    for (const blind of BLINDS) {
      const row = doc.querySelector(
        `[data-blind="d${blind.day}-${blind.index}"]`,
      );
      expect(row).not.toBeNull();
      expect(row?.textContent).toContain(String(blind.goal));
    }
  });

  it('4分類の名前と ITEMS の品目名が出る', () => {
    const html = renderApp(rulesApp());
    for (const suit of SUITS) {
      expect(html).toContain(SUIT_LABEL[suit]);
      for (const rank of RANKS) {
        expect(html).toContain(ITEMS[suit][rank]);
      }
    }
  });
});
