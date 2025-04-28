import { TxVersion, DEV_LAUNCHPAD_PROGRAM, printSimulate, LAUNCHPAD_PROGRAM } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import { PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'

export const claimVesting = async () => {
  const raydium = await initSdk()

  /** notice: every wallet only enable to create "1" platform config */
  const { transaction, extInfo, execute } = await raydium.launchpad.claimPlatformFee({
    programId: LAUNCHPAD_PROGRAM, // devent: DEV_LAUNCHPAD_PROGRAM
    platformId: new PublicKey('platform id'),
    platformClaimFeeWallet: new PublicKey('vesting receiver'),
    poolId: new PublicKey('pool id'),

    mintB: NATIVE_MINT,
    vaultB: new PublicKey('pool vault B'),

    txVersion: TxVersion.V0,
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 600000,
    // },
  })

  printSimulate([transaction])

  try {
    const sentInfo = await execute({ sendAndConfirm: true })
    console.log(sentInfo)
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// claimVesting()
