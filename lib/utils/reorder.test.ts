import { moveItem } from './reorder';

describe('moveItem', () => {
  it('moves an item forward in the array', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item backward in the array', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('returns an equal array when from === to', () => {
    const input = ['a', 'b', 'c'];
    expect(moveItem(input, 1, 1)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const input = ['a', 'b', 'c'];
    moveItem(input, 0, 2);
    expect(input).toEqual(['a', 'b', 'c']);
  });

  it('handles a single-element array as a no-op', () => {
    expect(moveItem(['x'], 0, 0)).toEqual(['x']);
  });

  it('moves the first item to the last position', () => {
    expect(moveItem([1, 2, 3, 4], 0, 3)).toEqual([2, 3, 4, 1]);
  });

  it('moves the last item to the first position', () => {
    expect(moveItem([1, 2, 3, 4], 3, 0)).toEqual([4, 1, 2, 3]);
  });
});
