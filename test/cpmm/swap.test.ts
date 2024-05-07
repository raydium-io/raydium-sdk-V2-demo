import { swapTokenBaseInDemo, swapTokenBaseOutDemo } from '../../src/cpmm/demo';

jest.setTimeout(30000);

describe('cpmm feature test', () => {
  it('should swapBaseIn via pool success', async () => {
    const res = await swapTokenBaseInDemo();
    console.log('swapBaseIn pool data', res);
    expect(res.error).toBeUndefined();
  });

  it('should swapBaseOut via pool success', async () => {
    const res = await swapTokenBaseOutDemo();
    console.log('swapBaseOut pool data', res);
    expect(res.error).toBeUndefined();
  });
});
