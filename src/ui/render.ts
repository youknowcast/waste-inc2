import { bossLabel } from '../data/blinds.ts';
import type { JokerDef } from '../data/jokers.ts';
import { jokerDef } from '../data/jokers.ts';
import {
  itemName,
  rankLabel,
  rankValue,
  SUIT_COLOR,
  SUIT_MARK,
} from '../game/cards.ts';
import { MAX_JOKERS } from '../game/constants.ts';
import type { BlindState, RunState } from '../game/run.ts';
import type { ScoreBreakdown, ScoreLine } from '../game/score.ts';
import type { Card, JokerInstance } from '../game/types.ts';
import type { AppState } from './app.ts';

export function renderApp(app: AppState): string {
  switch (app.screen) {
    case 'title':
      return renderTitle(app);
    case 'board':
      return app.blind ? renderBoard(app.run, app.blind) : renderTitle(app);
    default:
      return `<div class="placeholder">${app.screen}（未実装）</div>`;
  }
}

function renderTitle(_app: AppState): string {
  return `
    <div class="title-screen">
      <h1>WASTE INC. II</h1>
      <p>産業廃棄物ローグライク</p>
      <button class="btn btn-primary" data-action="newRun" data-seed="demo">はじめる</button>
    </div>
  `;
}

function timeLabel(index: number): string {
  if (index === 0) return '午前便';
  if (index === 1) return '午後便';
  return '締切';
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
          <button class="btn btn-primary" data-action="play">搬入</button>
          <button class="btn btn-secondary" data-action="discard">捨てる</button>
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
  return n.toFixed(1).replace(/\.0$/, '');
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
