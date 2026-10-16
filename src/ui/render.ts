import { blindAt, bossLabel, bossText } from '../data/blinds.ts';
import type { JokerDef } from '../data/jokers.ts';
import { jokerDef } from '../data/jokers.ts';
import {
  itemName,
  rankLabel,
  rankValue,
  SUIT_COLOR,
  SUIT_MARK,
} from '../game/cards.ts';
import { MAX_JOKERS, RANK_A_MIN, RANK_S_MIN } from '../game/constants.ts';
import { jokerRerollDiscount, jokerSellBonus } from '../game/jokers.ts';
import type { BlindState, Payout, RunState } from '../game/run.ts';
import type { ScoreBreakdown, ScoreLine } from '../game/score.ts';
import type { ShopState } from '../game/shop.ts';
import { rerollCost, sellValue } from '../game/shop.ts';
import type { Card, JokerInstance } from '../game/types.ts';
import type { AppState } from './app.ts';

/**
 * HTML に値を差し込む前のエスケープ。
 * シードは `?seed=` から来るため、任意の文字列が入りうる。
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderApp(app: AppState): string {
  const screenHtml = renderScreen(app);
  return `
    <div class="app-wrap">
      ${renderSoundButton(app)}
      ${screenHtml}
    </div>
  `;
}

function renderScreen(app: AppState): string {
  switch (app.screen) {
    case 'title':
      return renderTitle(app);
    case 'blinds':
      return renderBlinds(app.run);
    case 'board':
      return app.blind ? renderBoard(app.run, app.blind) : renderTitle(app);
    case 'cashout':
      return app.payout ? renderCashout(app.run, app.payout) : '';
    case 'shop':
      return app.shop ? renderShop(app.run, app.shop) : '';
    case 'result':
      return renderResult(app.run);
    default:
      return `<div class="placeholder">${app.screen}（未実装）</div>`;
  }
}

function renderSoundButton(app: AppState): string {
  const icon = app.soundOn ? '🔊' : '🔇';
  return `<button class="sound-toggle" data-action="toggleSound" aria-label="音のON/OFF">${icon}</button>`;
}

function renderTitle(app: AppState): string {
  return `
    <div class="title-screen">
      <h1>WASTE INC. II</h1>
      <p class="slug">waste-inc2</p>
      <p>産業廃棄物ローグライク</p>
      <button class="btn btn-primary" data-action="newRun" data-seed="${escapeHtml(app.run.seed)}">はじめる</button>
    </div>
  `;
}

function timeLabel(index: number): string {
  if (index === 0) return '午前便';
  if (index === 1) return '午後便';
  return '締切';
}

function renderBlinds(run: RunState): string {
  const rows = [0, 1, 2].map((i) => renderBlindRow(run.day, i));
  return `
    <div class="blinds-screen">
      <div class="screen-title">元請の選択（${run.day}日目）</div>
      <div class="blinds-list">
        ${rows.join('')}
      </div>
      <div class="status-bar">
        <span>所持金 <b>${run.money}万円</b></span>
        <div class="jrow">${renderJokers(run.jokers)}</div>
      </div>
      <div class="btns">
        <button class="btn btn-primary" data-action="openBlind">次の便を始める</button>
      </div>
    </div>
  `;
}

function renderBlindRow(day: number, index: number): string {
  const def = blindAt(day, index as 0 | 1 | 2);
  const tag = timeLabel(index);
  const isBoss = index === 2;
  const bossName = def.bossId ? bossLabel(def.bossId) : null;
  const rule = def.bossId ? bossText(def.bossId) : null;
  return `
    <div class="blind-row${isBoss ? ' boss-row' : ''}">
      <span class="tag">${tag}</span>
      <span class="name">
        ${def.name}
        ${bossName ? `<span class="boss-name">${bossName}</span>` : ''}
        ${rule ? `<span class="rule">${rule}</span>` : ''}
      </span>
      <span class="amt">${def.goal}万円</span>
    </div>
  `;
}

function renderCashout(run: RunState, payout: Payout): string {
  return `
    <div class="cashout-screen">
      <div class="screen-title">精算</div>
      <div class="receipt">
        <div class="line"><span>報酬</span><span>${payout.reward}万円</span></div>
        <div class="line"><span>手数ボーナス</span><span>${payout.handBonus}万円</span></div>
        <div class="line"><span>利息</span><span>${payout.interest}万円</span></div>
        <div class="line total"><span>合計</span><span>${payout.total}万円</span></div>
      </div>
      <div class="status-bar">所持金 <b>${run.money}万円</b></div>
      <div class="btns">
        <button class="btn btn-primary" data-action="next">次へ</button>
      </div>
    </div>
  `;
}

function renderShop(run: RunState, shop: ShopState): string {
  const reroll = rerollCost(shop, jokerRerollDiscount(run));
  const canReroll = run.money >= reroll;
  return `
    <div class="shop-screen">
      <div class="screen-title">ショップ</div>
      <div class="offers">
        ${shop.offers.map((offer, i) => renderShopOffer(run, offer, i)).join('')}
      </div>
      <div class="btns">
        <button class="btn btn-secondary" data-action="reroll"${!canReroll ? ' disabled' : ''}>リロール ${reroll}万円</button>
        <button class="btn btn-primary" data-action="next">次へ</button>
      </div>
      <div class="status-bar">所持金 <b>${run.money}万円</b></div>
      <div class="shop-jokers">
        ${renderOwnedJokers(run)}
      </div>
    </div>
  `;
}

function renderShopOffer(
  run: RunState,
  offer: { defId: string; price: number },
  slot: number,
): string {
  const def = jokerDef(offer.defId);
  const affordable = run.money >= offer.price && run.jokers.length < MAX_JOKERS;
  return `
    <div class="offer">
      <div class="offer-info">
        <div class="jn">${def.name}</div>
        <div class="je">${def.text}</div>
      </div>
      <div class="offer-buy">
        <span class="price">${offer.price}万円</span>
        <button class="btn btn-primary" data-action="buy" data-slot="${slot}"${!affordable ? ' disabled' : ''}>買う</button>
      </div>
    </div>
  `;
}

function renderOwnedJokers(
  run: RunState,
  options: { sellable?: boolean } = {},
): string {
  if (run.jokers.length === 0) return '';
  const sellable = options.sellable ?? true;
  return `
    <div class="owned-title">所持ジョーカー</div>
    <div class="owned-list">
      ${run.jokers
        .map((j, i) => {
          const def = jokerDef(j.defId);
          const value = sellValue(def, jokerSellBonus(run));
          const sellButton = sellable
            ? `<button class="btn btn-secondary" data-action="sell" data-index="${i}">売る ${value}万円</button>`
            : '';
          return `
            <div class="owned-joker">
              <div class="jc">
                <div class="jn">${def.name}</div>
                <div class="je">${def.text}</div>
              </div>
              ${sellButton}
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function renderResult(run: RunState): string {
  const cleared =
    (run.day - 1) * 3 + (run.result === 'lost' ? run.blindIndex : 0);
  const rank =
    run.totalRevenue < RANK_A_MIN
      ? 'B'
      : run.totalRevenue < RANK_S_MIN
        ? 'A'
        : 'S';
  return `
    <div class="result-screen">
      <div class="screen-title">リザルト</div>
      <div class="result-rank">ランク <b>${rank}</b></div>
      <div class="result-summary">
        <div class="line"><span>総売上</span><span>${run.totalRevenue}万円</span></div>
        <div class="line"><span>残金</span><span>${run.money}万円</span></div>
        <div class="line"><span>突破した便</span><span>${cleared}／9</span></div>
        <div class="line"><span>シード</span><span>${escapeHtml(run.seed)}</span></div>
      </div>
      ${run.result === 'lost' ? '<div class="result-fate">解散</div>' : ''}
      <div class="owned-list">
        ${renderOwnedJokers(run, { sellable: false })}
      </div>
      <div class="btns">
        <button class="btn btn-primary" data-action="newRun" data-seed="${escapeHtml(run.seed)}">もう一度</button>
      </div>
    </div>
  `;
}

function renderBoard(run: RunState, blind: BlindState): string {
  const def = blind.def;
  const remaining = Math.max(0, def.goal - blind.revenue);
  const bossName = def.bossId ? bossLabel(def.bossId) : null;

  return `
    <div class="bd">
      <div class="bd-top">
        <div>
          <div class="bd-day">${run.day}日目 ${timeLabel(run.blindIndex)}</div>
          <div class="bd-meta">残り手札 ${blind.handsLeft} ・ 捨て札 ${blind.discardsLeft}</div>
        </div>
        <div class="bd-goal">
          <div class="l">目標</div>
          <div class="n">${def.goal}<span>万円</span></div>
        </div>
      </div>
      ${progressBarHtml(blind.revenue, def.goal)}
      <div class="bar-l"><span>売上 ${blind.revenue}万円</span><span>あと ${remaining}万円</span></div>

      ${blind.lastScore ? renderStage(blind.lastScore) : renderQuietStage()}

      <div class="hand">
        ${blind.hand.map((card) => cardHtml(card, { selected: blind.selected.includes(card.id) })).join('')}
      </div>

      <div class="foot">
        <div class="jrow">
          ${renderJokers(run.jokers)}
        </div>
        <div class="btns">
          ${
            blind.status === 'playing'
              ? `<button class="btn btn-primary" data-action="play">搬入</button>
               <button class="btn btn-secondary" data-action="discard">捨てる</button>`
              : `<button class="btn btn-primary" data-action="settle">締める</button>`
          }
        </div>
      </div>
      ${bossName ? `<div class="boss">${bossName}</div>` : ''}
    </div>
  `;
}

function renderQuietStage(): string {
  return `<div class="stage quiet"><span>役を作って「搬入」</span></div>`;
}

function renderStage(score: ScoreBreakdown): string {
  const jokerLines = score.lines.slice(3);
  const handLabel = score.lines[0]?.label ?? '';
  const details = [
    handLabel,
    ...jokerLines.map(
      (line) => `<span class="hl">${jokerLineHtml(line)}</span>`,
    ),
  ];

  return `
    <div class="stage">
      <span class="pf pf-weight">重さ ${score.weight}t</span>
      <span class="op">×</span>
      <span class="pf pf-mult">単価 ${score.mult}</span>
      <span class="op">=</span>
      <span class="res">${score.revenue}万円</span>
    </div>
    <div class="score-detail">${details.join(' ／ ')}</div>
  `;
}

function jokerLineHtml(line: ScoreLine): string {
  const value = formatNumber(line.value);
  switch (line.kind) {
    case 'weight':
      return `${line.label} +${value}t`;
    case 'mult':
      return `${line.label} +${value}`;
    case 'xweight':
      return `${line.label} ×${value}`;
    case 'xmult':
      return `${line.label} ×${value}`;
  }
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export function cardHtml(
  card: Card,
  opts: { selected?: boolean; small?: boolean } = {},
): string {
  const selectedAttr = opts.selected ? ' data-selected="true"' : '';
  const smallClass = opts.small ? ' small' : '';
  return `
    <div class="hc${smallClass}" style="border-color:${SUIT_COLOR[card.suit]}" data-action="toggleCard" data-card="${card.id}"${selectedAttr}>
      <div class="r">${rankLabel(card.rank)}</div>
      <div class="n">${itemName(card)}</div>
      <div class="w">${SUIT_MARK[card.suit]} ${rankValue(card.rank)}t</div>
    </div>
  `;
}

function renderJokers(jokers: JokerInstance[]): string {
  const slots: string[] = [];
  for (let i = 0; i < MAX_JOKERS; i++) {
    const inst = jokers[i];
    if (inst) {
      slots.push(jokerHtml(jokerDef(inst.defId), inst));
    } else {
      slots.push(`<div class="jc empty"></div>`);
    }
  }
  return slots.join('');
}

export function jokerHtml(def: JokerDef, _inst: JokerInstance): string {
  return `
    <div class="jc">
      <div class="jn">${def.name}</div>
      <div class="je">${def.text}</div>
    </div>
  `;
}

export function progressBarHtml(current: number, goal: number): string {
  const pct = goal > 0 ? Math.min(100, Math.floor((current / goal) * 100)) : 0;
  return `<div class="bar"><i style="width:${pct}%"></i></div>`;
}
