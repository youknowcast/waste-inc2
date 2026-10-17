/** 便（元請選択・盤面）に出す呼称。0=午前便, 1=午後便, 2=締切。 */
export function timeLabel(index: number): string {
  if (index === 0) return '午前便';
  if (index === 1) return '午後便';
  return '締切';
}
