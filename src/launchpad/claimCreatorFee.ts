import { TxVersion, DEVNET_PROGRAM_ID, printSimulate, LAUNCHPAD_PROGRAM } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import { NATIVE_MINT, TOKEN_PROGRAM_ID } from '@solana/spl-token'

export const claimCreatorFee = async () => {
  const raydium = await initSdk()

  const { transaction, execute } = await raydium.launchpad.claimCreatorFee({
    programId: DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM,

    mintB: NATIVE_MINT, // currently all launchlab pool mintB is WSOL
    // mintBProgram: TOKEN_PROGRAM_ID,

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
// claimCreatorFee()
