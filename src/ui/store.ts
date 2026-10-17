import { reactive, ref } from 'vue';
import type { Action, AppState } from './app.ts';
import { createApp, dispatch as dispatchAction } from './app.ts';

/**
 * 単一インスタンスのゲームなので、モジュールスコープのシングルトンで持つ。
 * `reactive()` で包むことで、`dispatch` の変更が描画に反映される。
 */
let game: AppState | null = null;

/**
 * dispatch のたびに増える描画カウンタ。
 * 元の実装は毎回 innerHTML を差し替えていたため、演出（fx）は「いま」の描画にだけ付く。
 * Vue でも同じ描画単位（＝毎回の作り直し）を保てるよう、画面側がこれを key に使う。
 */
const renderTick = ref(0);

/** ゲームを初期化し、リアクティブな状態を保持する。 */
export function initGame(seed: string): void {
  game = reactive(createApp(seed));
}

/** 保持している状態と、それを更新する dispatch を返す。 */
export function useGame(): {
  state: AppState;
  tick: typeof renderTick;
  dispatch: (action: Action) => void;
} {
  if (!game) {
    throw new Error('initGame を先に呼んでください');
  }

  const state = game;

  return {
    state,
    tick: renderTick,
    dispatch: (action: Action) => {
      // fx のクリアは既存の dispatch の先頭で行われる（演出を1回に抑える要）。
      dispatchAction(state, action);
      renderTick.value++;
    },
  };
}
