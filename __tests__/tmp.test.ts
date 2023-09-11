import { doCalc } from '@/app/calc';

describe('simple maths', () => {
  test('easy', () => {
    expect(2 + 2).toBe(4);
  });

  test('use calc', () => {
    expect(doCalc(3)).toBe(4);
  });
});
