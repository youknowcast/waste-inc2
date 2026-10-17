import { reactive } from 'vue';
import type { Action, AppState } from './app.ts';
import { createApp, dispatch as dispatchAction } from './app.ts';

/**
 * 単一インスタンスのゲームなので、モジュールスコープのシングルトンで持つ。
 * `reactive()` で包むことで、`dispatch` の変更が描画に反映される。
 */
let game: AppState | null = null;

/** ゲームを初期化し、リアクティブな状態を保持する。 */
export function initGame(seed: string): void {
  game = reactive(createApp(seed));
}

/** 保持している状態と、それを更新する dispatch を返す。 */
export function useGame(): {
  state: AppState;
  dispatch: (action: Action) => void;
} {
  if (!game) {
    throw new Error('initGame を先に呼んでください');
  }

  const state = game;

  return {
    state,
    dispatch: (action: Action) => {
      // fx のクリアは既存の dispatch の先頭で行われる（演出を1回に抑える要）。
      dispatchAction(state, action);
    },
  };
}
