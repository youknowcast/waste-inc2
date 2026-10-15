import type { BlindState, Payout, RunState } from '../game/run.ts';
import {
  advanceBlind,
  discardSelected,
  playHand,
  settleBlind,
  startBlind,
  startRun,
  toggleSelect,
} from '../game/run.ts';
import type { ShopState } from '../game/shop.ts';

export type Screen =
  | 'title'
  | 'blinds'
  | 'board'
  | 'cashout'
  | 'shop'
  | 'result';

export type Action =
  | { kind: 'newRun'; seed: string }
  | { kind: 'openBlind' }
  | { kind: 'toggleCard'; cardId: string }
  | { kind: 'play' }
  | { kind: 'discard' }
  | { kind: 'settle' }
  | { kind: 'plunder' }
  | { kind: 'next' }
  | { kind: 'buy'; slot: number }
  | { kind: 'reroll' }
  | { kind: 'sell'; index: number }
  | { kind: 'toggleSound' };

export type AppState = {
  screen: Screen;
  run: RunState;
  blind: BlindState | null;
  shop: ShopState | null;
  payout: Payout | null;
  soundOn: boolean;
};

export function createApp(seed: string): AppState {
  return {
    screen: 'title',
    run: startRun(seed),
    blind: null,
    shop: null,
    payout: null,
    soundOn: true,
  };
}

export function dispatch(app: AppState, action: Action): void {
  switch (action.kind) {
    case 'newRun': {
      app.run = startRun(action.seed);
      app.blind = startBlind(app.run);
      app.shop = null;
      app.payout = null;
      app.screen = 'board';
      break;
    }
    case 'openBlind': {
      // Task 10: ブラインド選択画面を実装する
      break;
    }
    case 'toggleCard': {
      if (app.screen !== 'board' || !app.blind) return;
      toggleSelect(app.blind, action.cardId);
      break;
    }
    case 'play': {
      if (app.screen !== 'board' || !app.blind) return;
      playHand(app.run, app.blind);
      break;
    }
    case 'discard': {
      if (app.screen !== 'board' || !app.blind) return;
      discardSelected(app.run, app.blind);
      break;
    }
    case 'settle': {
      if (app.screen !== 'board' || !app.blind) return;
      app.payout = settleBlind(app.run, app.blind);
      advanceBlind(app.run);
      app.screen = 'cashout';
      break;
    }
    case 'plunder':
    case 'next': {
      // Task 10: shop / result 遷移を実装する
      break;
    }
    case 'buy':
    case 'reroll':
    case 'sell': {
      // Task 10: ショップアクションを実装する
      break;
    }
    case 'toggleSound': {
      app.soundOn = !app.soundOn;
      break;
    }
  }
}

export function actionFromElement(el: {
  dataset: DOMStringMap;
}): Action | null {
  const kind = el.dataset.action;
  if (!kind) return null;

  switch (kind) {
    case 'newRun':
      return { kind: 'newRun', seed: String(el.dataset.seed ?? '') };
    case 'openBlind':
      return { kind: 'openBlind' };
    case 'toggleCard': {
      const cardId = el.dataset.card;
      if (!cardId) return null;
      return { kind: 'toggleCard', cardId };
    }
    case 'play':
      return { kind: 'play' };
    case 'discard':
      return { kind: 'discard' };
    case 'settle':
      return { kind: 'settle' };
    case 'plunder':
      return { kind: 'plunder' };
    case 'next':
      return { kind: 'next' };
    case 'buy': {
      const slot = Number(el.dataset.slot);
      if (Number.isNaN(slot)) return null;
      return { kind: 'buy', slot };
    }
    case 'reroll':
      return { kind: 'reroll' };
    case 'sell': {
      const index = Number(el.dataset.index);
      if (Number.isNaN(index)) return null;
      return { kind: 'sell', index };
    }
    case 'toggleSound':
      return { kind: 'toggleSound' };
    default:
      return null;
  }
}
