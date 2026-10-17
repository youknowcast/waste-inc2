// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { itemName } from '../src/game/cards';
import { playHand, startBlind, toggleSelect } from '../src/game/run';
import App from '../src/ui/App.vue';
import type { AppState } from '../src/ui/app';
import { createApp, dispatch } from '../src/ui/app';
import BoardScreen from '../src/ui/components/BoardScreen.vue';
import TitleScreen from '../src/ui/components/TitleScreen.vue';
import { initGame, useGame } from '../src/ui/store';

/** null を取り除く（テスト内の型の逃げ）。 */
function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('unexpected null');
  return value;
}

/** 盤面だけを描く。文字列関数と同じく「今の状態で描いた結果」を見る。 */
function mountBoard(app: AppState) {
  return mount(BoardScreen, {
    props: { run: app.run, blind: need(app.blind), fx: app.fx },
  });
}

/** App ごとマウントして、store 経由の dispatch で盤面まで進める。 */
async function mountAppOnBoard() {
  initGame('s');
  const { state, dispatch: send } = useGame();
  const wrapper = mount(App);
  send({ kind: 'newRun', seed: 's' });
  send({ kind: 'openBlind' });
  await nextTick();
  return { wrapper, state, send };
}

describe('盤面の描画', () => {
  it('目標金額・品目名・役の呼称・売上が出る', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    const wrapper = mountBoard(app);
    const html = wrapper.text();
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
    const wrapper = mountBoard(app);
    expect(wrapper.find('.hc[data-selected="true"]').exists()).toBe(true);
  });
  it('搬入すると 重さ × 単価 = 売上 が画面に出る', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    toggleSelect(app.blind, app.blind.hand[0].id);
    playHand(app.run, app.blind);
    const wrapper = mountBoard(app);
    expect(wrapper.find('.pf-weight').text()).toContain('重さ');
    expect(wrapper.find('.pf-mult').text()).toContain('単価');
    expect(wrapper.find('.res').text()).toContain('万円');
  });
  it('元請の縛りが盤面に出る（3日目締切なら大雨警報）', () => {
    const app = createApp('s');
    app.run.day = 3;
    app.run.blindIndex = 2;
    app.screen = 'board';
    app.blind = startBlind(app.run);
    expect(mountBoard(app).text()).toContain('大雨警報');
  });
  it('所持ジョーカーの名前と効果が常時出る', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    app.run.jokers.push({ defId: 'truck-8t', counters: {} });
    const html = mountBoard(app).text();
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
    const a = mount(TitleScreen, { props: { seed: 'alpha' } });
    const b = mount(TitleScreen, { props: { seed: 'beta' } });
    expect(a.find('[data-action="newRun"]').attributes('data-seed')).toBe(
      'alpha',
    );
    expect(b.find('[data-action="newRun"]').attributes('data-seed')).toBe(
      'beta',
    );
    expect(a.html()).not.toContain('data-seed="beta"');
  });
  it('搬入の直後の描画に fx-score が付く', async () => {
    const { wrapper, state, send } = await mountAppOnBoard();
    send({ kind: 'toggleCard', cardId: need(state.blind).hand[0].id });
    send({ kind: 'play' });
    await nextTick();
    expect(wrapper.find('.app-wrap').classes()).toContain('fx-score');
  });
  it('演出の次の操作では fx-score も fx-deal も付かない（再生され続けない）', async () => {
    const { wrapper, state, send } = await mountAppOnBoard();
    send({ kind: 'toggleCard', cardId: need(state.blind).hand[0].id });
    send({ kind: 'play' });
    await nextTick();
    expect(wrapper.find('.app-wrap').classes()).toContain('fx-score');
    send({ kind: 'toggleCard', cardId: need(state.blind).hand[0].id });
    await nextTick();
    const classes = wrapper.find('.app-wrap').classes();
    expect(classes).not.toContain('fx-score');
    expect(classes).not.toContain('fx-deal');
  });
  it('便を始めた直後の描画に fx-deal が付く', async () => {
    initGame('s');
    const { dispatch: send } = useGame();
    const wrapper = mount(App);
    send({ kind: 'openBlind' });
    await nextTick();
    expect(wrapper.find('.app-wrap').classes()).toContain('fx-deal');
  });
  it('fx が無くても採点の数字（重さ・単価・売上）は出ている', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    toggleSelect(app.blind, app.blind.hand[0].id);
    playHand(app.run, app.blind);
    const wrapper = mountBoard(app);
    expect(wrapper.html()).not.toContain('fx-score');
    expect(wrapper.find('.pf-weight').text()).toContain('重さ');
    expect(wrapper.find('.pf-mult').text()).toContain('単価');
    expect(wrapper.find('.res').text()).toContain('万円');
  });
  it('採点の演出では目標バーに --bar-from:0% と現在値の --bar-to が入る', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    toggleSelect(app.blind, app.blind.hand[0].id);
    dispatch(app, { kind: 'play' });
    const wrapper = mountBoard(app);
    const bar = wrapper.find('.bar > i').element as HTMLElement;
    // 初回の搬入なので採点直前の売上は 0。
    expect(bar.style.getPropertyValue('--bar-from')).toBe('0%');
    const to = Math.min(
      100,
      Math.floor((need(app.blind).revenue / need(app.blind).def.goal) * 100),
    );
    expect(bar.style.getPropertyValue('--bar-to')).toBe(`${to}%`);
  });
  it('採点では効いたジョーカーの札だけが光る印を持つ', () => {
    const app = createApp('s');
    app.screen = 'board';
    app.blind = startBlind(app.run);
    // 必ず効く（重さ +30）／3枚以上の汚泥が要るので今回は効かない。
    app.run.jokers.push({ defId: 'truck-2t', counters: {} });
    app.run.jokers.push({ defId: 'dehydrator', counters: {} });
    toggleSelect(app.blind, app.blind.hand[0].id);
    dispatch(app, { kind: 'play' });
    const wrapper = mountBoard(app);
    const chips = wrapper.findAll('.jc');
    const firedChip = need(
      chips.find((chip) => chip.text().includes('2t 軽トラ')),
    );
    const idleChip = need(chips.find((chip) => chip.text().includes('脱水機')));
    expect(firedChip.classes()).toContain('jc-fired');
    expect(idleChip.classes()).not.toContain('jc-fired');
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
    const detail = mountBoard(app).find('.score-detail').text();
    expect(detail).toContain('×1.25');
    expect(detail).not.toContain('×1.3');
  });
});
