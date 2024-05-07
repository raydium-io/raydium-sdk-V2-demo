import { poolDepositDemo, poolWithdrawDemo } from '../../src/cpmm/demo';

jest.setTimeout(30000);

describe('cpmm feature test', () => {
  it('should deposit assets pool success', async () => {
    const res = await poolDepositDemo();
    console.log('deposit pool data', res);
    expect(res.error).toBeUndefined();
  });
  it('should withdraw pool lp success', async () => {
    const res = await poolWithdrawDemo();
    console.log('withdraw pool data', res);
    expect(res.error).toBeUndefined();
  });
});
