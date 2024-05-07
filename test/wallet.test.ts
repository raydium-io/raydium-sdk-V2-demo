import { initWallet } from '../src/common/connection';
jest.setTimeout(30000);

describe('wallet', () => {
  it.skip('works', async () => {
    const res = await initWallet();
    expect(res.owner).not.toBeNull();
    expect(res.tokenAccounts.size).toBeGreaterThan(1);
  });
});
