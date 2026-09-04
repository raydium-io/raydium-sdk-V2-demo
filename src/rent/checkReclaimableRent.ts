import { PublicKey } from '@solana/web3.js'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { connection, owner } from '../config'
import { ACCOUNTS_PER_TX, RENT_ROLLOUT_LAMPORTS_PER_BYTE, lamportsToSol, scanReclaimableRent } from './utils'

/**
 * Query how much rent the wallet can reclaim right now.
 *
 * Solana's SIMD-0437 rollout lowers the rent-exempt minimum in five steps. Accounts created before
 * a step keep the balance they were funded with, so after each step they hold more than they need.
 * The SPL Token and Token-2022 programs both expose `WithdrawExcessLamports`, which returns that
 * difference without closing the account and without touching its token balance.
 *
 * This script signs nothing and sends nothing — it only reads accounts.
 *
 *   yarn dev src/rent/checkReclaimableRent.ts
 *   yarn dev src/rent/checkReclaimableRent.ts <wallet address>   # inspect any wallet
 */
export const checkReclaimableRent = async () => {
  // scan any address passed on the command line, otherwise the configured wallet
  const target = process.argv[2] ? new PublicKey(process.argv[2]) : owner.publicKey

  const report = await scanReclaimableRent(connection, target)

  console.log(`wallet: ${report.owner.toBase58()}`)
  console.log(
    `rent rollout: step ${report.rolloutStep} of ${RENT_ROLLOUT_LAMPORTS_PER_BYTE.length - 1} ` +
      `(lamports_per_byte ${RENT_ROLLOUT_LAMPORTS_PER_BYTE[0].toLocaleString()} → ${report.lamportsPerByte.toLocaleString()})`
  )
  console.log(`scanned ${report.scannedCount} token accounts, ${report.accounts.length} hold excess rent\n`)

  if (!report.accounts.length) {
    console.log('nothing above the current rent-exempt minimum — nothing to reclaim')
    return report
  }

  console.table(
    report.accounts.slice(0, 20).map((account) => ({
      account: account.pubkey.toBase58(),
      program: account.programId.equals(TOKEN_2022_PROGRAM_ID) ? 'Token-2022' : 'SPL Token',
      space: account.space,
      lamports: account.lamports,
      minimum: account.rentExemptMinimum,
      reclaimable: account.reclaimableLamports,
      tokenAmount: account.amount.toString(),
    }))
  )
  if (report.accounts.length > 20) console.log(`… and ${report.accounts.length - 20} more`)

  console.log(
    `\nSPL Token  : ${report.byProgram.token.count} accounts · ${lamportsToSol(
      report.byProgram.token.reclaimableLamports
    )} SOL`
  )
  console.log(
    `Token-2022 : ${report.byProgram.token2022.count} accounts · ${lamportsToSol(
      report.byProgram.token2022.reclaimableLamports
    )} SOL`
  )
  console.log(`\nreclaimable now      : ${lamportsToSol(report.reclaimableLamports)} SOL`)
  console.log(`after all five steps : ${lamportsToSol(report.projectedLamports)} SOL`)
  console.log(
    `\nreclaiming would run as ${report.txCount} transaction(s) at ${ACCOUNTS_PER_TX} accounts per transaction ` +
      `(network fee ≈ ${lamportsToSol(report.txCount * 5000)} SOL)`
  )
  console.log('token balances are never touched — WithdrawExcessLamports only moves lamports above the minimum')

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
checkReclaimableRent()
