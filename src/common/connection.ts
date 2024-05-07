import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, AccountLayout, RawAccount } from '@solana/spl-token';
import bs58 from 'bs58';
import BN from 'bn.js';

let owner: Keypair | undefined;

export const connection = new Connection(clusterApiUrl('devnet')); //<YOUR_RPC_URL>
const PRIVATE_KEY = '<YOUR_WALLET_SECRET_KEY>';

let tokenAccounts = new Map<string, RawAccount & { publicKey?: PublicKey }>();
let solBalance = new BN(0);

export const initWallet = async () => {
  owner = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));

  const solAccountResp = await connection.getAccountInfo(
    owner.publicKey,
    'confirmed'
  );
  if (solAccountResp) solBalance = new BN(solAccountResp.lamports);

  const ownerTokenAccountResp = await connection.getTokenAccountsByOwner(
    owner.publicKey,
    { programId: TOKEN_PROGRAM_ID },
    'confirmed'
  );

  for (const { pubkey: publicKey, account } of ownerTokenAccountResp.value) {
    const accountInfo = AccountLayout.decode(account.data);
    tokenAccounts.set(accountInfo.mint.toBase58(), {
      ...accountInfo,
      publicKey,
    });
  }

  return {
    owner,
    tokenAccounts,
    solBalance,
  };
};
