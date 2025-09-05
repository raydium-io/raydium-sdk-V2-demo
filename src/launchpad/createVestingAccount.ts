import { TxVersion, DEVNET_PROGRAM_ID, printSimulate } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import BN from 'bn.js'
import { PublicKey } from '@solana/web3.js'

export const createVestingAccount = async () => {
  const raydium = await initSdk()

  const shareAmount = new BN(100000) // must less than pool's total locked amount

  const { transaction, execute } = await raydium.launchpad.createVesting({
    // programId: DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM, // open when develop on devnet
    poolId: new PublicKey('pool Id'),
    beneficiary: new PublicKey('share wallet address'),
    shareAmount,
    txVersion: TxVersion.V0,
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 600000,
    // },
  })

  // printSimulate([transaction])

  try {
    const sentInfo = await execute({ sendAndConfirm: true })
    console.log(sentInfo)
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// createVestingAccount()
