/**
 * Moves an item from one index to another within an array.
 * Returns a new array — does not mutate the input.
 */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to) return items;
  const result = [...items];
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}
