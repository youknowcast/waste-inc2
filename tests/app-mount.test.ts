// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/ui/App.vue';
import { initGame, useGame } from '../src/ui/store';

function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('unexpected null');
  return value;
}

describe('App のマウント', () => {
  beforeEach(() => {
    initGame('s');
  });

  it('タイトル画面の文字が DOM に出る', () => {
    const wrapper = mount(App);
    const html = wrapper.html();

    expect(html).toContain('WASTE INC. II');
    expect(html).toContain('waste-inc2');
  });

  it('殻（.app-wrap と 🔊 / ？ ボタン）を App が描く', () => {
    const wrapper = mount(App);

    expect(wrapper.find('.app-wrap').exists()).toBe(true);
    expect(wrapper.find('.sound-toggle').text()).toBe('🔊');
    expect(wrapper.find('.help-toggle').text()).toBe('？');
  });

  it('盤面では「？」ボタンが出て、rules 画面では出ない', async () => {
    const { dispatch } = useGame();
    const wrapper = mount(App);

    dispatch({ kind: 'newRun', seed: 's' });
    dispatch({ kind: 'openBlind' });
    await nextTick();
    expect(wrapper.find('.help-toggle').exists()).toBe(true);

    dispatch({ kind: 'openRules' });
    await nextTick();
    expect(wrapper.find('.help-toggle').exists()).toBe(false);
  });

  it('便を始めると fx-deal が .app-wrap に付く', async () => {
    const { dispatch } = useGame();
    const wrapper = mount(App);

    dispatch({ kind: 'openBlind' });
    await nextTick();
    expect(wrapper.find('.app-wrap').classes()).toContain('fx-deal');
  });

  it('搬入の直後は fx-score が .app-wrap に付く', async () => {
    const { state, dispatch } = useGame();
    const wrapper = mount(App);

    dispatch({ kind: 'openBlind' });
    await nextTick();
    dispatch({ kind: 'toggleCard', cardId: need(state.blind).hand[0].id });
    dispatch({ kind: 'play' });
    await nextTick();
    expect(wrapper.find('.app-wrap').classes()).toContain('fx-score');
  });
});
