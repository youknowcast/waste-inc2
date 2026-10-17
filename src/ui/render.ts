import { BLINDS, blindAt, bossLabel, bossText } from '../data/blinds.ts';
import { ITEMS } from '../data/items.ts';
import { JOKERS, jokerDef } from '../data/jokers.ts';
import {
  RANKS,
  rankLabel,
  rankValue,
  SUIT_COLOR,
  SUIT_LABEL,
  SUIT_MARK,
  SUITS,
} from '../game/cards.ts';
import {
  DISCARDS_PER_BLIND,
  HAND_BONUS_PER_HAND,
  HAND_SIZE,
  HANDS_PER_BLIND,
  INTEREST_CAP,
  INTEREST_RATE,
  INTEREST_UNIT,
  MAX_JOKERS,
  RANK_A_MIN,
  RANK_S_MIN,
  RARITY_PRICE,
  REROLL_BASE,
  SHOP_SLOTS,
} from '../game/constants.ts';
import { HAND_LABEL, HAND_TABLE, HAND_TYPES } from '../game/hands.ts';
import { jokerRerollDiscount, jokerSellBonus } from '../game/jokers.ts';
import type { Payout, RunState } from '../game/run.ts';
import type { ShopState } from '../game/shop.ts';
import { rerollCost, sellValue } from '../game/shop.ts';
import type { JokerInstance, Rarity } from '../game/types.ts';
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

/**
 * 画面の中身だけを返す。ページの殻（`.app-wrap` と右上のボタン）は App.vue が持つ。
 */
export function renderScreenHtml(app: AppState): string {
  return renderScreen(app);
}

function renderScreen(app: AppState): string {
  switch (app.screen) {
    case 'title':
      return renderTitle(app);
    case 'blinds':
      return renderBlinds(app.run);
    case 'board':
      // 盤面は BoardScreen.vue が描く。blind が無いときだけタイトルに落とす。
      return app.blind ? '' : renderTitle(app);
    case 'cashout':
      return app.payout ? renderCashout(app.run, app.payout) : '';
    case 'shop':
      return app.shop ? renderShop(app.run, app.shop) : '';
    case 'result':
      return renderResult(app.run);
    case 'rules':
      return renderRules();
    default:
      return `<div class="placeholder">${app.screen}（未実装）</div>`;
  }
}

function renderTitle(app: AppState): string {
  return `
    <div class="title-screen">
      <h1>WASTE INC. II</h1>
      <p class="slug">waste-inc2</p>
      <p>産業廃棄物ローグライク</p>
      <button class="btn btn-primary" data-action="newRun" data-seed="${escapeHtml(app.run.seed)}">はじめる</button>
      <button class="btn btn-secondary btn-rules" data-action="openRules">あそびかた</button>
    </div>
  `;
}

export function timeLabel(index: number): string {
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
        <div class="jrow">${renderBlindsJokers(run.jokers)}</div>
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

/** あそびかたに出すレア度の呼称（表示用）。 */
const RARITY_LABEL: Record<Rarity, string> = {
  COMMON: 'コモン',
  UNCOMMON: 'アンコモン',
  RARE: 'レア',
};

function renderRules(): string {
  return `
    <div class="rules-screen">
      <div class="screen-title">あそびかた</div>
      ${rulesIntro()}
      ${rulesDay()}
      ${rulesScore()}
      ${rulesHands()}
      ${rulesBoss()}
      ${rulesMoney()}
      ${rulesJokers()}
      ${rulesItems()}
      <div class="btns rules-back">
        <button class="btn btn-primary" data-action="closeRules">もどる</button>
      </div>
    </div>
  `;
}

function rulesSection(title: string, body: string): string {
  return `
    <section class="rules-sec">
      <h2>${escapeHtml(title)}</h2>
      ${body}
    </section>
  `;
}

function rulesIntro(): string {
  return rulesSection(
    'ひとこと',
    `<p>産廃の配車担当になって、9つの現場を回る。手札から5枚まで出して積載パターンを作り、<b>重さ × 単価</b> で売上を弾けさせる。1プレイ10〜15分。届かなければその場で解散。</p>`,
  );
}

function rulesDay(): string {
  const rows = BLINDS.map(
    (blind) => `
      <div class="rules-blind" data-blind="d${blind.day}-${blind.index}">
        <span class="rb-day">${blind.day}日目</span>
        <span class="rb-time">${escapeHtml(timeLabel(blind.index))}</span>
        <span class="rb-name">${escapeHtml(blind.name)}</span>
        <span class="rb-goal">${blind.goal}万円</span>
        <span class="rb-reward">報酬 ${blind.reward}万円</span>
      </div>
    `,
  ).join('');
  return rulesSection(
    '1日の流れ',
    `<p>1営業日 = 3便（午前便 → 午後便 → 締切の元請）、3日 = 9便。各便は手札 ${HAND_SIZE} 枚で始まり、${HANDS_PER_BLIND} 回搬入でき、${DISCARDS_PER_BLIND} 回捨てられる。</p>
     <div class="rules-blinds">${rows}</div>`,
  );
}

function rulesScore(): string {
  const base = HAND_TABLE.three.baseWeight;
  const mult = HAND_TABLE.three.baseMult;
  const cardValue = rankValue(9);
  const cardCount = 3;
  const cardWeight = cardValue * cardCount;
  const weight = base + cardWeight;
  return rulesSection(
    '得点は 重さ × 単価',
    `<div class="rules-formula">売上 = 重さ × 単価</div>
     <p>重さは<b>役の基礎の重さ ＋ 出したカードの重さ</b>。役ごとに決まった基礎の重さに、出したカードの重さが乗る。カードの数字はそのまま、絵札（J/Q/K）は ${rankValue(11)}t、A は ${rankValue(14)}t。単価は役の基礎値から始まり、ジョーカーで盛る。</p>
     <div class="rules-example">
       <span>${escapeHtml(HAND_LABEL.three)}（${cardValue}t を${cardCount}枚）</span>
       <span class="op">→</span>
       <span>役の基礎 ${base}t</span>
       <span class="op">+</span>
       <span>カード ${cardWeight}t</span>
       <span class="op">=</span>
       <span class="w">重さ ${weight}t</span>
       <span class="op">×</span>
       <span class="m">単価 ${mult}</span>
       <span class="op">=</span>
       <span class="r">${weight * mult}万円</span>
     </div>`,
  );
}

function rulesHands(): string {
  const rows = HAND_TYPES.map((type) => {
    const table = HAND_TABLE[type];
    return `
      <div class="rules-hand" data-hand="${type}">
        <span class="rh-name">${escapeHtml(HAND_LABEL[type])}</span>
        <span class="rh-w">重さ ${table.baseWeight}</span>
        <span class="rh-m">単価 ${table.baseMult}</span>
      </div>
    `;
  }).join('');
  return rulesSection(
    '狙う役と基礎の数字',
    `<p>上にある役ほど出しやすく、下にあるほど強い（ただし最下段の2役は同じ基礎値で同格）。得点は <b>役の基礎の重さ ＋ 出したカードの重さ</b> に、役の基礎の単価を掛けたところから始まる。</p>
     <div class="rules-hands">${rows}</div>`,
  );
}

function rulesBoss(): string {
  const rows = BLINDS.filter((blind) => blind.index === 2)
    .map((blind) => {
      if (!blind.bossId) return '';
      return `
        <div class="rules-boss" data-boss="${blind.bossId}">
          <div class="rb-head">${blind.day}日目 ${escapeHtml(blind.name)}</div>
          <div class="rb-label">${escapeHtml(bossLabel(blind.bossId))}</div>
          <div class="rb-text">${escapeHtml(bossText(blind.bossId))}</div>
        </div>
      `;
    })
    .join('');
  return rulesSection(
    '締切の縛り',
    `<p>各日の締切（3便目）は元請の縛りつき。突破できなければその場で解散。</p>
     <div class="rules-bosses">${rows}</div>`,
  );
}

function rulesMoney(): string {
  const rarityRows = Object.entries(RARITY_PRICE)
    .map(
      ([rarity, price]) =>
        `<span class="rules-rarity">${escapeHtml(RARITY_LABEL[rarity as Rarity])} ${price}万円</span>`,
    )
    .join('');
  return rulesSection(
    'お金',
    `<ul class="rules-list">
       <li>便を突破すると上の表の<b>報酬</b>が入る。</li>
       <li><b>手数ボーナス</b>：残した搬入1回につき ${HAND_BONUS_PER_HAND}万円。</li>
       <li><b>利息</b>：所持金 ${INTEREST_UNIT}万円ごとに ${INTEREST_RATE}万円、上限 ${INTEREST_CAP}万円。</li>
       <li><b>ショップ</b>：各便の突破後に開く。品揃えは ${SHOP_SLOTS} 枠。</li>
       <li><b>価格</b>：${rarityRows}</li>
       <li><b>リロール</b>：${REROLL_BASE}万円から。</li>
       <li><b>ジョーカー枠</b>：${MAX_JOKERS}枚まで。</li>
     </ul>`,
  );
}

function rulesJokers(): string {
  const cards = JOKERS.map(
    (joker) => `
      <div class="rules-joker">
        <div class="jn">${escapeHtml(joker.name)}</div>
        <div class="je">${escapeHtml(joker.text)}</div>
      </div>
    `,
  ).join('');
  return rulesSection(
    `ジョーカー ${JOKERS.length}枚`,
    `<p>積載・交渉・分類シナジー・経済の4系統。${MAX_JOKERS}枚まで持ち歩ける。</p>
     <div class="rules-jokers">${cards}</div>`,
  );
}

function rulesItems(): string {
  const groups = SUITS.map(
    (suit) => `
      <div class="rules-suit" data-suit="${suit}">
        <div class="rs-head" style="color:${SUIT_COLOR[suit]}">${SUIT_MARK[suit]} ${escapeHtml(SUIT_LABEL[suit])}</div>
        <div class="rs-items">
          ${RANKS.map((rank) => `<span class="rs-item"><b>${rankLabel(rank)}</b> ${escapeHtml(ITEMS[suit][rank])}</span>`).join('')}
        </div>
      </div>
    `,
  ).join('');
  return rulesSection(
    `品目 ${SUITS.length * RANKS.length}枚`,
    `<p>4分類 × 13ランク。数字が重さそのもので、絵札は ${rankValue(11)}t、A は ${rankValue(14)}t。<b>4分類は採点上等価</b>で強弱は無い（らしさはジョーカー側にある）。</p>
     <div class="rules-suits">${groups}</div>`,
  );
}

/**
 * 元請選択（未移植）のジョーカー枠。
 * 盤面のジョーカー札は BoardScreen.vue / JokerChip.vue が描くため、ここは blinds 専用。
 */
function renderBlindsJokers(jokers: JokerInstance[]): string {
  const slots: string[] = [];
  for (let i = 0; i < MAX_JOKERS; i++) {
    const inst = jokers[i];
    if (inst) {
      const def = jokerDef(inst.defId);
      slots.push(`
    <div class="jc">
      <div class="jn">${def.name}</div>
      <div class="je">${def.text}</div>
    </div>
  `);
    } else {
      slots.push(`<div class="jc empty"></div>`);
    }
  }
  return slots.join('');
}
