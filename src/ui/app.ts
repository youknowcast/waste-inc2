import { jokerRerollDiscount } from '../game/jokers.ts';
import type { BlindState, Payout, RunState } from '../game/run.ts';
import {
  addJoker,
  advanceBlind,
  discardSelected,
  loseRun,
  playHand,
  removeJoker,
  settleBlind,
  startBlind,
  startRun,
  toggleSelect,
} from '../game/run.ts';
import type { ShopState } from '../game/shop.ts';
import { canBuy, openShop, rerollCost, rerollShop } from '../game/shop.ts';
import { loadSoundOn, playSound, saveSoundOn } from './sound.ts';

export type Screen =
  | 'title'
  | 'blinds'
  | 'board'
  | 'cashout'
  | 'shop'
  | 'result';

/** いま再生すべき演出の種類。 */
export type FxKind = 'deal' | 'score';

export type Action =
  | { kind: 'newRun'; seed: string }
  | { kind: 'openBlind' }
  | { kind: 'toggleCard'; cardId: string }
  | { kind: 'play' }
  | { kind: 'discard' }
  | { kind: 'settle' }
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
  /** いま再生すべき演出。dispatch のたびにクリアされる */
  fx: FxKind | null;
};

export function createApp(seed: string): AppState {
  return {
    screen: 'title',
    run: startRun(seed),
    blind: null,
    shop: null,
    payout: null,
    soundOn: loadSoundOn(),
    fx: null,
  };
}

export function dispatch(app: AppState, action: Action): void {
  // 演出は 1 回だけ。ここで毎回クリアしないと、描画のたびに再生され続ける。
  app.fx = null;

  switch (action.kind) {
    case 'newRun': {
      app.run = startRun(action.seed);
      app.blind = null;
      app.shop = null;
      app.payout = null;
      app.screen = 'blinds';
      break;
    }
    case 'openBlind': {
      app.blind = startBlind(app.run);
      app.shop = null;
      app.payout = null;
      app.screen = 'board';
      app.fx = 'deal';
      for (let i = 0; app.blind && i < app.blind.hand.length; i++) {
        setTimeout(() => playSound('deal'), i * 40);
      }
      break;
    }
    case 'toggleCard': {
      if (app.screen !== 'board' || !app.blind) return;
      toggleSelect(app.blind, action.cardId);
      playSound('pick');
      break;
    }
    case 'play': {
      if (app.screen !== 'board' || !app.blind) return;
      const score = playHand(app.run, app.blind);
      if (score) {
        app.fx = 'score';
        setTimeout(() => playSound('scoreWeight'), 80);
        setTimeout(() => playSound('scoreMult'), 240);
        setTimeout(() => playSound('scoreRevenue'), 400);
        if (app.blind.status === 'cleared') {
          setTimeout(() => playSound('clear'), 650);
        } else if (app.blind.status === 'failed') {
          setTimeout(() => playSound('fail'), 500);
        }
      }
      break;
    }
    case 'discard': {
      if (app.screen !== 'board' || !app.blind) return;
      discardSelected(app.run, app.blind);
      playSound('discard');
      break;
    }
    case 'settle': {
      if (app.screen !== 'board' || !app.blind) return;
      if (app.blind.status === 'playing') return;
      if (app.blind.status === 'cleared') {
        app.payout = settleBlind(app.run, app.blind);
        app.screen = 'cashout';
      } else {
        loseRun(app.run, app.blind);
        app.screen = 'result';
      }
      break;
    }
    case 'next': {
      if (app.screen === 'cashout') {
        app.shop = openShop(app.run.rng);
        app.payout = null;
        app.screen = 'shop';
      } else if (app.screen === 'shop') {
        advanceBlind(app.run);
        app.shop = null;
        app.blind = null;
        if (app.run.result === 'won') {
          app.screen = 'result';
        } else {
          app.screen = 'blinds';
        }
      }
      break;
    }
    case 'buy': {
      if (app.screen !== 'shop' || !app.shop) return;
      const offer = app.shop.offers[action.slot];
      if (!offer || !canBuy(app.run, offer)) return;
      app.run.money -= offer.price;
      addJoker(app.run, offer.defId);
      app.shop.offers.splice(action.slot, 1);
      playSound('buy');
      break;
    }
    case 'reroll': {
      if (app.screen !== 'shop' || !app.shop) return;
      const cost = rerollCost(app.shop, jokerRerollDiscount(app.run));
      if (app.run.money < cost) return;
      app.run.money -= cost;
      rerollShop(app.run.rng, app.shop);
      playSound('buy');
      break;
    }
    case 'sell': {
      if (app.screen !== 'shop') return;
      removeJoker(app.run, action.index);
      break;
    }
    case 'toggleSound': {
      app.soundOn = !app.soundOn;
      saveSoundOn(app.soundOn);
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
