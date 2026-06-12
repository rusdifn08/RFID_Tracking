/** Nama tampilan kustom per line (lineId tetap untuk query/fetch) */
export const resolveLineDisplayTitle = (
  lineId: number,
  defaultTitle: string,
  displayTitles: Record<string, string> | undefined
): string => {
  const custom = displayTitles?.[lineId.toString()]?.trim();
  return custom || defaultTitle;
};
