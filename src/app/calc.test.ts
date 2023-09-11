import { doCalc } from '@/app/calc';

describe('simple maths', () => {
  it('easy', () => {
    expect(2 + 2).toBe(4);
  });

  it('use calc', () => {
    expect(doCalc(3)).toBe(4);
  });
});
