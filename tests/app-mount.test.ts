// @vitest-environment jsdom
import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../src/ui/App.vue';
import { initGame } from '../src/ui/store';

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
});
