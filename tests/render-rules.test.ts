// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { BLINDS, bossLabel, bossText } from '../src/data/blinds';
import { ITEMS } from '../src/data/items';
import { JOKERS } from '../src/data/jokers';
import { RANKS, rankValue, SUIT_LABEL, SUITS } from '../src/game/cards';
import { HAND_LABEL, HAND_TABLE, HAND_TYPES } from '../src/game/hands';
import { actionFromElement, createApp, dispatch } from '../src/ui/app';
import RulesScreen from '../src/ui/components/RulesScreen.vue';
import TitleScreen from '../src/ui/components/TitleScreen.vue';

/** あそびかただけを描く。文字列関数と同じく「今の状態で描いた結果」を見る。 */
function mountRules() {
  return mount(RulesScreen);
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

  it('タイトルに「あそびかた」ボタンがある', () => {
    const wrapper = mount(TitleScreen, { props: { seed: 's' } });
    const rulesButton = wrapper.find('.btn-rules');
    expect(rulesButton.exists()).toBe(true);
    expect(rulesButton.text()).toBe('あそびかた');
    expect(rulesButton.attributes('data-action')).toBe('openRules');
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
    const text = mountRules().text();
    expect(HAND_TYPES).toHaveLength(10);
    for (const type of HAND_TYPES) {
      expect(text).toContain(HAND_LABEL[type]);
    }
  });

  it('各役の基礎の重さと単価が HAND_TABLE の値と一致する', () => {
    const wrapper = mountRules();
    for (const type of HAND_TYPES) {
      const row = wrapper.find(`[data-hand="${type}"]`);
      expect(row.exists()).toBe(true);
      expect(row.find('.rh-w').text()).toBe(
        `重さ ${HAND_TABLE[type].baseWeight}`,
      );
      expect(row.find('.rh-m').text()).toBe(
        `単価 ${HAND_TABLE[type].baseMult}`,
      );
    }
  });

  it('得点の実例が HAND_TABLE と一致する（重さ = 基礎 + カード）', () => {
    const example = mountRules().find('.rules-example');
    expect(example.exists()).toBe(true);
    const base = HAND_TABLE.three.baseWeight;
    const mult = HAND_TABLE.three.baseMult;
    const cardWeight = rankValue(9) * 3;
    const weight = base + cardWeight;
    const text = example.text();
    expect(text).toContain(`役の基礎 ${base}t`);
    expect(text).toContain(`カード ${cardWeight}t`);
    expect(text).toContain(`重さ ${weight}t`);
    expect(text).toContain(`単価 ${mult}`);
    expect(text).toContain(`${weight * mult}万円`);
  });

  it('20枚すべてのジョーカー名が出る', () => {
    const text = mountRules().text();
    expect(JOKERS).toHaveLength(20);
    for (const joker of JOKERS) {
      expect(text).toContain(joker.name);
    }
  });

  it('3つの元請名とその縛り文が出る', () => {
    const text = mountRules().text();
    const bosses = BLINDS.filter((b) => b.index === 2);
    expect(bosses).toHaveLength(3);
    for (const blind of bosses) {
      if (!blind.bossId) throw new Error('bossId is missing');
      expect(text).toContain(bossLabel(blind.bossId));
      expect(text).toContain(bossText(blind.bossId));
    }
  });

  it('9便ぶんの目標金額が出る', () => {
    const wrapper = mountRules();
    expect(BLINDS).toHaveLength(9);
    for (const blind of BLINDS) {
      const row = wrapper.find(`[data-blind="d${blind.day}-${blind.index}"]`);
      expect(row.exists()).toBe(true);
      expect(row.text()).toContain(String(blind.goal));
    }
  });

  it('4分類の名前と ITEMS の品目名が出る', () => {
    const text = mountRules().text();
    for (const suit of SUITS) {
      expect(text).toContain(SUIT_LABEL[suit]);
      for (const rank of RANKS) {
        expect(text).toContain(ITEMS[suit][rank]);
      }
    }
  });
});
