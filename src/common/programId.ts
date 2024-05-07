import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

export const RENT_PROGRAM_ID = new PublicKey(
  'SysvarRent111111111111111111111111111111111'
);

export const SYSTEM_PROGRAM_ID = SystemProgram.programId;
export const MEMO_PROGRAM_ID2 = new PublicKey(
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
);

export function findProgramAddress(
  seeds: Array<Buffer | Uint8Array>,
  programId: PublicKey
): {
  publicKey: PublicKey;
  nonce: number;
} {
  const [publicKey, nonce] = PublicKey.findProgramAddressSync(seeds, programId);
  return { publicKey, nonce };
}

export function getATAAddress(
  owner: PublicKey,
  mint: PublicKey,
  programId?: PublicKey
): {
  publicKey: PublicKey;
  nonce: number;
} {
  return findProgramAddress(
    [
      owner.toBuffer(),
      (programId ?? TOKEN_PROGRAM_ID).toBuffer(),
      mint.toBuffer(),
    ],
    new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
  );
}
