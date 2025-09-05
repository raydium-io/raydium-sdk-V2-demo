import { TxVersion, DEVNET_PROGRAM_ID, printSimulate, LAUNCHPAD_PROGRAM } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import { PublicKey } from '@solana/web3.js'

export const claimVesting = async () => {
  const raydium = await initSdk()

  const { transaction, extInfo, execute } = await raydium.launchpad.claimVesting({
    programId: LAUNCHPAD_PROGRAM, // devnet: DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM
    poolId: new PublicKey('pool id'),
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
