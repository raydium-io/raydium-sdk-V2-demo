import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'

/**
 * SIMD-0437 lowers `lamports_per_byte` from 6,960 to 696 across five feature-gated steps. An
 * account funded before a step keeps the balance it was created with, so every pre-existing account
 * is over-funded by `(128 + data_len) * (old_rate - new_rate)` lamports once the step activates.
 *
 * Both the SPL Token and the Token-2022 programs implement `WithdrawExcessLamports`, which hands
 * that difference back without closing the account or touching its token balance.
 */
export const ACCOUNT_STORAGE_OVERHEAD = 128

/** `lamports_per_byte` before the rollout, then after each of the five steps */
export const RENT_ROLLOUT_LAMPORTS_PER_BYTE = [6960, 6333, 5080, 2575, 1322, 696]

export const RENT_FINAL_LAMPORTS_PER_BYTE = RENT_ROLLOUT_LAMPORTS_PER_BYTE[RENT_ROLLOUT_LAMPORTS_PER_BYTE.length - 1]

/**
 * How many WithdrawExcessLamports instructions fit in one transaction.
 *
 * Each one adds a unique writable account key (32 bytes in the message) plus ~7 bytes of
 * instruction data; destination, authority and fee payer are all the same wallet. 20 keeps a
 * comfortable margin under the 1,232-byte transaction limit after compute-budget instructions.
 */
export const ACCOUNTS_PER_TX = 20

/**
 * `TokenInstruction::WithdrawExcessLamports` — discriminant 38 in both token programs.
 *
 * `@solana/spl-token` still does not export a builder for it (as of 0.4.15 the enum entry is
 * commented out: `// WithdrawalExcessLamports = 38`), so we encode it here from the Rust definition
 * in `spl-token-interface`:
 *
 * ```rust
 * /// 0. `[writable]` Source Account owned by the token program
 * /// 1. `[writable]` Destination account
 * /// 2. `[signer]` Authority
 * /// 3. `..3+M` `[signer]` M signer accounts
 * WithdrawExcessLamports,
 * ```
 *
 * The instruction takes no arguments — one discriminant byte. The program moves
 * `source.lamports - rent.minimum_balance(source.data_len())` to the destination, so it can never
 * drop the source below the current rent-exempt minimum.
 */
export function createWithdrawExcessLamportsInstruction(params: {
  source: PublicKey
  destination: PublicKey
  authority: PublicKey
  multiSigners?: PublicKey[]
  programId: PublicKey
}): TransactionInstruction {
  const { source, destination, authority, multiSigners = [], programId } = params
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: authority, isSigner: !multiSigners.length, isWritable: false },
      ...multiSigners.map((pubkey) => ({ pubkey, isSigner: true, isWritable: false })),
    ],
    data: Buffer.from([38]),
  })
}

export interface ReclaimableAccount {
  pubkey: PublicKey
  mint: PublicKey
  programId: PublicKey
  /** account data length, excluding the 128-byte storage overhead */
  space: number
  lamports: number
  /** what the account needs right now, straight from the cluster */
  rentExemptMinimum: number
  reclaimableLamports: number
  /** what the account would need once all five steps have activated */
  finalRentExemptMinimum: number
  projectedLamports: number
  amount: bigint
}

export interface ReclaimableRentReport {
  owner: PublicKey
  /** derived from the cluster, so it stays right as later steps activate */
  lamportsPerByte: number
  rolloutStep: number
  scannedCount: number
  accounts: ReclaimableAccount[]
  reclaimableLamports: number
  projectedLamports: number
  byProgram: Record<'token' | 'token2022', { count: number; reclaimableLamports: number }>
  txCount: number
}

// SPL token account layout. Token-2022 accounts keep the same first 165 bytes and append their
// extensions afterwards, so these offsets hold for both programs.
const MINT_OFFSET = 0
const AMOUNT_OFFSET = 64
const IS_NATIVE_OPTION_OFFSET = 109

export const rentExemptMinimumAt = (space: number, lamportsPerByte: number) =>
  (ACCOUNT_STORAGE_OVERHEAD + space) * lamportsPerByte

export const lamportsToSol = (lamports: number) => lamports / 10 ** 9

/**
 * Read-only scan of every SPL Token and Token-2022 account owned by `owner`, looking for lamports
 * above the current rent-exempt minimum.
 *
 * The minimum comes from `getMinimumBalanceForRentExemption` rather than a hardcoded rate, so this
 * keeps working unchanged through all five SIMD-0437 steps.
 */
export async function scanReclaimableRent(connection: Connection, owner: PublicKey): Promise<ReclaimableRentReport> {
  const [tokenResp, token2022Resp, zeroLenMinimum] = await Promise.all([
    connection.getTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
    connection.getTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID }),
    connection.getMinimumBalanceForRentExemption(0),
  ])

  const rawAccounts = [...tokenResp.value, ...token2022Resp.value]

  // one lookup per distinct account size — a wallet normally has two or three
  const spaces = Array.from(new Set(rawAccounts.map(({ account }) => account.data.length)))
  const minimums = new Map(
    await Promise.all(
      spaces.map(async (space) => [space, await connection.getMinimumBalanceForRentExemption(space)] as const)
    )
  )

  const accounts: ReclaimableAccount[] = []

  for (const { pubkey, account } of rawAccounts) {
    // wrapped SOL carries its token balance *as* lamports; both programs refuse to withdraw from it
    const isNative = account.data.readUInt32LE(IS_NATIVE_OPTION_OFFSET) === 1
    if (isNative) continue

    const space = account.data.length
    const rentExemptMinimum = minimums.get(space)!
    const reclaimableLamports = account.lamports - rentExemptMinimum
    if (reclaimableLamports <= 0) continue

    const finalRentExemptMinimum = rentExemptMinimumAt(space, RENT_FINAL_LAMPORTS_PER_BYTE)

    accounts.push({
      pubkey,
      mint: new PublicKey(account.data.subarray(MINT_OFFSET, MINT_OFFSET + 32)),
      programId: account.owner,
      space,
      lamports: account.lamports,
      rentExemptMinimum,
      reclaimableLamports,
      finalRentExemptMinimum,
      projectedLamports: Math.max(account.lamports - finalRentExemptMinimum, 0),
      amount: account.data.readBigUInt64LE(AMOUNT_OFFSET),
    })
  }

  accounts.sort((a, b) => b.reclaimableLamports - a.reclaimableLamports)

  const byProgram = {
    token: { count: 0, reclaimableLamports: 0 },
    token2022: { count: 0, reclaimableLamports: 0 },
  }
  let reclaimableLamports = 0
  let projectedLamports = 0

  for (const account of accounts) {
    const key = account.programId.equals(TOKEN_2022_PROGRAM_ID) ? 'token2022' : 'token'
    byProgram[key].count += 1
    byProgram[key].reclaimableLamports += account.reclaimableLamports
    reclaimableLamports += account.reclaimableLamports
    projectedLamports += account.projectedLamports
  }

  // minimum_balance(0) is exactly the 128-byte storage overhead priced at the current rate
  const lamportsPerByte = Math.round(zeroLenMinimum / ACCOUNT_STORAGE_OVERHEAD)
  let rolloutStep = 0
  RENT_ROLLOUT_LAMPORTS_PER_BYTE.forEach((value, index) => {
    if (Math.abs(value - lamportsPerByte) < Math.abs(RENT_ROLLOUT_LAMPORTS_PER_BYTE[rolloutStep] - lamportsPerByte))
      rolloutStep = index
  })

  return {
    owner,
    lamportsPerByte,
    rolloutStep,
    scannedCount: rawAccounts.length,
    accounts,
    reclaimableLamports,
    projectedLamports,
    byProgram,
    txCount: Math.ceil(accounts.length / ACCOUNTS_PER_TX),
  }
}

export const chunk = <T>(list: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < list.length; i += size) chunks.push(list.slice(i, i + size))
  return chunks
}
