// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { BLINDS } from '../src/data/blinds';
import { RANK_A_MIN, RANK_S_MIN } from '../src/game/constants';
import { openShop } from '../src/game/shop';
import { createApp, dispatch } from '../src/ui/app';
import { renderApp } from '../src/ui/render';

describe('画面遷移', () => {
  it('タイトルから始まり、はじめる と シードが出る', () => {
    const app = createApp('s');
    expect(app.screen).toBe('title');
    expect(renderApp(app)).toContain('waste-inc2');
  });
  it('元請選択に3便と目標金額が並ぶ', () => {
    const app = createApp('s');
    dispatch(app, { kind: 'newRun', seed: 's' });
    const html = renderApp(app);
    expect(app.screen).toBe('blinds');
    expect(html).toContain('午前便');
    expect(html).toContain('締切');
    expect(html).toContain('300');
  });
  it('突破すると精算画面に報酬・手数ボーナス・利息が出る', () => {
    const app = createApp('s');
    dispatch(app, { kind: 'newRun', seed: 's' });
    dispatch(app, { kind: 'openBlind' });
    const blind = app.blind;
    expect(blind).not.toBeNull();
    if (!blind) throw new Error('blind is null');
    blind.revenue = blind.def.goal;
    blind.status = 'cleared';
    dispatch(app, { kind: 'settle' });
    const html = renderApp(app);
    expect(app.screen).toBe('cashout');
    expect(html).toContain('報酬');
    expect(html).toContain('利息');
  });
  it('ショップに並ぶジョーカーと価格が出て、買うと所持金が減る', () => {
    const app = createApp('s');
    dispatch(app, { kind: 'newRun', seed: 's' });
    dispatch(app, { kind: 'openBlind' });
    const blind = app.blind;
    expect(blind).not.toBeNull();
    if (!blind) throw new Error('blind is null');
    blind.revenue = blind.def.goal;
    blind.status = 'cleared';
    dispatch(app, { kind: 'settle' });
    dispatch(app, { kind: 'next' });
    expect(app.screen).toBe('shop');
    expect(renderApp(app)).toContain('万円');
    const shop = app.shop;
    expect(shop).not.toBeNull();
    if (!shop) throw new Error('shop is null');
    const slot = shop.offers.findIndex((o) => o.price > 0);
    expect(slot).toBeGreaterThanOrEqual(0);
    const price = shop.offers[slot].price;
    app.run.money = 999;
    dispatch(app, { kind: 'buy', slot });
    expect(app.run.jokers).toHaveLength(1);
    expect(app.run.money).toBe(999 - price);
  });
  it('未達で終わるとリザルトが lost を出す', () => {
    const app = createApp('s');
    dispatch(app, { kind: 'newRun', seed: 's' });
    dispatch(app, { kind: 'openBlind' });
    const blind = app.blind;
    expect(blind).not.toBeNull();
    if (!blind) throw new Error('blind is null');
    blind.status = 'failed';
    dispatch(app, { kind: 'settle' });
    expect(app.screen).toBe('result');
    expect(renderApp(app)).toContain('解散');
  });
  it('未達でも失敗した便の売上が総売上に入り、所持金は増えない', () => {
    const app = createApp('s');
    dispatch(app, { kind: 'newRun', seed: 's' });
    dispatch(app, { kind: 'openBlind' });
    const blind = app.blind;
    expect(blind).not.toBeNull();
    if (!blind) throw new Error('blind is null');
    blind.revenue = 123;
    blind.status = 'failed';
    const money = app.run.money;
    dispatch(app, { kind: 'settle' });
    expect(app.screen).toBe('result');
    expect(app.run.totalRevenue).toBe(123);
    expect(app.run.money).toBe(money);
    expect(renderApp(app)).toContain('123');
  });
});

describe('リザルトの突破した便', () => {
  function resultApp(seed: string): ReturnType<typeof createApp> {
    const app = createApp(seed);
    app.screen = 'result';
    return app;
  }

  it('1日目午後便で敗北すると 1／9 と表示する', () => {
    const app = resultApp('s');
    app.run.day = 1;
    app.run.blindIndex = 1;
    app.run.result = 'lost';
    expect(renderApp(app)).toContain('1／9');
  });

  it('3日目締切で敗北すると 8／9 と表示する', () => {
    const app = resultApp('s');
    app.run.day = 3;
    app.run.blindIndex = 2;
    app.run.result = 'lost';
    expect(renderApp(app)).toContain('8／9');
  });

  it('勝利すると 9／9 と表示する', () => {
    const app = resultApp('s');
    app.run.day = 4;
    app.run.blindIndex = 0;
    app.run.result = 'won';
    expect(renderApp(app)).toContain('9／9');
  });
});

describe('リザルトのランク', () => {
  function rankApp(totalRevenue: number): ReturnType<typeof createApp> {
    const app = createApp('s');
    app.screen = 'result';
    app.run.totalRevenue = totalRevenue;
    return app;
  }

  it('RANK_A_MIN 未満は B', () => {
    expect(renderApp(rankApp(RANK_A_MIN - 1))).toContain('ランク <b>B</b>');
  });

  it('RANK_A_MIN ちょうどは A', () => {
    expect(renderApp(rankApp(RANK_A_MIN))).toContain('ランク <b>A</b>');
  });

  it('目標合計ちょうど（全便を最小限で突破）は A になり B にはならない', () => {
    const goalTotal = BLINDS.reduce((sum, b) => sum + b.goal, 0);
    expect(goalTotal).toBe(RANK_A_MIN);
    const html = renderApp(rankApp(goalTotal));
    expect(html).toContain('ランク <b>A</b>');
    expect(html).not.toContain('ランク <b>B</b>');
  });

  it('RANK_S_MIN 未満は A', () => {
    expect(renderApp(rankApp(RANK_S_MIN - 1))).toContain('ランク <b>A</b>');
  });

  it('RANK_S_MIN ちょうどは S', () => {
    expect(renderApp(rankApp(RANK_S_MIN))).toContain('ランク <b>S</b>');
  });
});

describe('シードのエスケープ', () => {
  // 「"」で属性を抜け、「<」でタグを開こうとするシード。
  const evil = 'a"><img src=x onerror=alert(1)>';

  it('タイトルの data-seed が属性を抜け出さない', () => {
    const html = renderApp(createApp(evil));
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).not.toContain('data-seed="a"');
    expect(html).toContain(
      'data-seed="a&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"',
    );
  });

  it('エスケープしても dataset から元のシードが読める', () => {
    const html = renderApp(createApp(evil));
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('img')).toBeNull();
    const button = doc.querySelector('[data-action="newRun"]');
    expect(button?.getAttribute('data-seed')).toBe(evil);
  });

  it('リザルトのシード表示にもマークアップが混ざらない', () => {
    const app = createApp(evil);
    app.screen = 'result';
    const html = renderApp(app);
    expect(html).not.toContain('<img src=x onerror=alert(1)>');
    expect(html).toContain('a&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('img')).toBeNull();
  });

  it('リザルトの「もう一度」の data-seed もエスケープされる', () => {
    const app = createApp(evil);
    app.screen = 'result';
    const html = renderApp(app);
    expect(html).toContain(
      'data-seed="a&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"',
    );
  });
});

describe('リザルトの所持ジョーカー', () => {
  it('所持ジョーカーを売るボタンなしで表示する', () => {
    const app = createApp('s');
    app.screen = 'result';
    app.run.jokers.push({ defId: 'truck-8t', counters: {} });
    const html = renderApp(app);
    expect(html).toContain('8t 深ダンプ');
    expect(html).not.toContain('data-action="sell"');
  });
});

describe('ショップのリロール', () => {
  function shopApp(money: number) {
    const app = createApp('s');
    app.screen = 'shop';
    app.shop = openShop(app.run.rng);
    app.run.money = money;
    return app;
  }

  it('リロール代を払えないときは disabled', () => {
    // リロールは3万円から。
    expect(renderApp(shopApp(0))).toContain('data-action="reroll" disabled');
  });

  it('リロール代を払えるときは disabled でない', () => {
    const html = renderApp(shopApp(999));
    expect(html).not.toContain('data-action="reroll" disabled');
  });
});
