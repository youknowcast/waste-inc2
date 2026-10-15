// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { itemName } from '../src/game/cards';
import { playHand, startBlind, toggleSelect } from '../src/game/run';
import { createApp, dispatch } from '../src/ui/app';
import { renderApp } from '../src/ui/render';

describe('盤面の描画', () => {
  it('目標金額・品目名・役の呼称・売上が出る', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    const html = renderApp(app);
    expect(html).toContain('目標');
    expect(html).toContain('300'); // 1日目午前便の目標
    expect(app.blind.hand.some((card) => html.includes(itemName(card)))).toBe(
      true,
    );
    expect(html).toContain('搬入');
    expect(html).toContain('捨てる');
  });
  it('選んだカードに selected の印がつく', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    toggleSelect(app.blind, app.blind.hand[0].id);
    const html = renderApp(app);
    expect(html).toContain('data-selected="true"');
  });
  it('搬入すると 重さ × 単価 = 売上 が画面に出る', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    toggleSelect(app.blind, app.blind.hand[0].id);
    playHand(app.run, app.blind);
    const html = renderApp(app);
    expect(html).toContain('重さ');
    expect(html).toContain('単価');
    expect(html).toContain('万円');
  });
  it('元請の縛りが盤面に出る（3日目締切なら大雨警報）', () => {
    const app = createApp('s');
    app.run.day = 3;
    app.run.blindIndex = 2;
    app.screen = 'board';
    app.blind = startBlind(app.run);
    expect(renderApp(app)).toContain('大雨警報');
  });
  it('所持ジョーカーの名前と効果が常時出る', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    app.run.jokers.push({ defId: 'truck-8t', counters: {} });
    const html = renderApp(app);
    expect(html).toContain('8t 深ダンプ');
    expect(html).toContain('+120');
  });
  it('dispatch はカードの選択を反映する', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    const id = app.blind.hand[0].id;
    dispatch(app, { kind: 'toggleCard', cardId: id });
    expect(app.blind.selected).toEqual([id]);
  });
  it('タイトルは createApp に渡したシードを data-seed に持つ', () => {
    const a = renderApp(createApp('alpha'));
    const b = renderApp(createApp('beta'));
    expect(a).toContain('data-seed="alpha"');
    expect(b).toContain('data-seed="beta"');
    expect(a).not.toContain('data-seed="beta"');
  });
  it('ユニック車は ×1.25 と表示される（1.3 に丸められない）', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    app.run.jokers.push({ defId: 'unic', counters: {} });
    toggleSelect(app.blind, app.blind.hand[0].id);
    toggleSelect(app.blind, app.blind.hand[1].id);
    toggleSelect(app.blind, app.blind.hand[2].id);
    playHand(app.run, app.blind);
    const html = renderApp(app);
    expect(html).toContain('×1.25');
    expect(html).not.toContain('×1.3');
  });
});
