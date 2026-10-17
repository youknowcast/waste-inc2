import type { ScoreBreakdown, ScoreLine } from '../../game/score.ts';

/** 採点内訳の先頭 3 行は基礎（役・搬入物・基礎単価）。以降がジョーカー行。 */
export const BASE_SCORE_LINES = 3;

/**
 * 採点で効いたジョーカーの名前。
 * 得点に寄与したジョーカーは自分の `name` をジョーカー行の label に積むため、
 * 内訳のジョーカー行から寄与した集合が復元できる。
 */
export function firedJokerNames(score: ScoreBreakdown): Set<string> {
  return new Set(score.lines.slice(BASE_SCORE_LINES).map((line) => line.label));
}

/** 小数は 2 桁まで見て末尾の 0 を落とす（1.25 → 1.25、1.3 → 1.3）。 */
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2).replace(/\.?0+$/, '');
}

/** ジョーカー行を「名前 +30t」「名前 ×1.25」の形にする。 */
export function jokerLineText(line: ScoreLine): string {
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
