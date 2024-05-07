import { createPoolDemo } from '../../src/cpmm/demo';

jest.setTimeout(30000);

describe('cpmm feature test', () => {
  it('should create pool success', async () => {
    const res = await createPoolDemo();
    console.log('create pool data', res);
    expect(res.error).toBeUndefined();
  });
});
