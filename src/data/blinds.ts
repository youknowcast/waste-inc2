export type BossId = 'inspection' | 'haggling' | 'storm';

export type BlindDef = {
  day: number;
  index: 0 | 1 | 2;
  name: string;
  goal: number;
  reward: number;
  bossId?: BossId;
};

export const BLINDS: readonly BlindDef[] = [
  { day: 1, index: 0, name: '小口収集', goal: 300, reward: 3 },
  { day: 1, index: 1, name: '量産現場', goal: 450, reward: 4 },
  {
    day: 1,
    index: 2,
    name: '抜き打ち立入検査',
    goal: 600,
    reward: 5,
    bossId: 'inspection',
  },
  { day: 2, index: 0, name: '解体現場', goal: 800, reward: 3 },
  { day: 2, index: 1, name: '再開発現場', goal: 1200, reward: 4 },
  {
    day: 2,
    index: 2,
    name: '元請の値切り',
    goal: 1600,
    reward: 5,
    bossId: 'haggling',
  },
  { day: 3, index: 0, name: '大型土木', goal: 2000, reward: 3 },
  { day: 3, index: 1, name: '最終処分場搬入', goal: 3000, reward: 4 },
  {
    day: 3,
    index: 2,
    name: '大雨警報',
    goal: 5000,
    reward: 5,
    bossId: 'storm',
  },
] as const;

export function blindAt(day: number, index: 0 | 1 | 2): BlindDef {
  const def = BLINDS.find((b) => b.day === day && b.index === index);
  if (!def) {
    throw new Error(`Blind not found: day=${day}, index=${index}`);
  }
  return def;
}

export function bossLabel(id: BossId): string {
  switch (id) {
    case 'inspection':
      return '抜き打ち立入検査';
    case 'haggling':
      return '元請の値切り';
    case 'storm':
      return '大雨警報';
  }
}

export function bossText(id: BossId): string {
  switch (id) {
    case 'inspection':
      return '特管のカードは採点されない（役の成立には数えるが、重さも単価も乗らない）';
    case 'haggling':
      return '役の基礎単価が半減する（端数は切り上げ）';
    case 'storm':
      return '手札が7枚に減る';
  }
}
