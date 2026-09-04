import { MakeTxData, TxBuilder, TxVersion } from '@raydium-io/raydium-sdk-v2'
import { connection, initSdk, owner, txVersion } from '../config'
import {
  ACCOUNTS_PER_TX,
  ReclaimableAccount,
  chunk,
  createWithdrawExcessLamportsInstruction,
  lamportsToSol,
  scanReclaimableRent,
} from './utils'

/** set to true to simulate every batch instead of sending it */
const DRY_RUN = true

/**
 * Reclaim the excess rent sitting in the wallet's SPL Token and Token-2022 accounts.
 *
 * One `WithdrawExcessLamports` instruction per account. The instruction takes no amount: each token
 * program computes `source.lamports - rent.minimum_balance(source.data_len())` itself, so it can
 * never take an account below the current rent-exempt minimum, never closes the account, and never
 * touches the token balance.
 *
 * Every instruction adds a writable account key to the message, so the work is batched at
 * ACCOUNTS_PER_TX to stay under the 1,232-byte transaction limit.
 *
 *   yarn dev src/rent/reclaimRent.ts
 */
export const reclaimRent = async () => {
  const raydium = await initSdk()

  const report = await scanReclaimableRent(connection, owner.publicKey)

  if (!report.accounts.length) {
    console.log('nothing above the current rent-exempt minimum — nothing to reclaim')
    process.exit()
  }

  console.log(
    `reclaiming ${lamportsToSol(report.reclaimableLamports)} SOL from ${report.accounts.length} token accounts ` +
      `in ${report.txCount} transaction(s)`
  )

  const batches = chunk(report.accounts, ACCOUNTS_PER_TX)

  const buildBatch = async (batch: ReclaimableAccount[]) => {
    const builder = new TxBuilder({
      connection,
      feePayer: owner.publicKey,
      cluster: raydium.cluster,
      owner: raydium.owner,
    })
    builder.addInstruction({
      instructions: batch.map((account) =>
        createWithdrawExcessLamportsInstruction({
          source: account.pubkey,
          destination: owner.publicKey, // any account can receive it; the wallet itself is the obvious choice
          authority: owner.publicKey, // the token account's owner
          programId: account.programId, // SPL Token or Token-2022, per account
        })
      ),
    })
    return builder.versionBuild({ txVersion })
  }

  const builtTxs = (await Promise.all(batches.map(buildBatch))) as MakeTxData<TxVersion>[]

  if (DRY_RUN) {
    // simulate each batch and print the lamport movement the cluster reports back
    for (const [index, built] of builtTxs.entries()) {
      const batch = batches[index]
      const addresses = [owner.publicKey.toBase58(), ...batch.map((account) => account.pubkey.toBase58())]
      const sim = await connection.simulateTransaction(built.transaction as any, {
        sigVerify: false,
        replaceRecentBlockhash: true,
        accounts: { encoding: 'base64', addresses },
      })
      const expected = batch.reduce((sum, account) => sum + account.reclaimableLamports, 0)
      console.log(`batch ${index + 1}/${builtTxs.length}:`, {
        err: sim.value.err,
        computeUnits: sim.value.unitsConsumed,
        expectedLamports: expected,
        postWalletLamports: sim.value.accounts?.[0]?.lamports,
      })
    }
    console.log('\nDRY_RUN is on — nothing was sent. Set DRY_RUN = false to reclaim for real.')
    process.exit()
  }

  // versionMultiBuild puts the calling builder's transaction first and appends extraPreBuildData
  // after it, so batch 1 drives and batches 2..n follow in order
  const [firstTx, ...restTxs] = builtTxs
  const { execute } = await firstTx.builder.versionMultiBuild({ txVersion, extraPreBuildData: restTxs as any })

  const { txIds } = await execute({ sequentially: true })
  txIds.forEach((txId, index) => console.log(`batch ${index + 1}: https://explorer.solana.com/tx/${txId}`))

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
reclaimRent()
