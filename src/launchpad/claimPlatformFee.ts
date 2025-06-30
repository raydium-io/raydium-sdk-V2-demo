import { PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import { TxVersion, DEVNET_PROGRAM_ID, LAUNCHPAD_PROGRAM, printSimulate } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'

export const claimPlatformFee = async () => {
  const raydium = await initSdk()
  const poolId = new PublicKey('pool id')

  const { execute, transaction, extInfo, builder } = await raydium.launchpad.claimPlatformFee({
    programId: LAUNCHPAD_PROGRAM, // devnet: DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM
    platformId: new PublicKey('your platform id'),
    platformClaimFeeWallet: new PublicKey('your platform fee wallet'),
    poolId,

    // mintB: NATIVE_MINT,
    // vaultB: new PublicKey('4hovbmAKVRCyj6vmBxZ533ntnrUVGkQfwxzdxzewnR47'),
    // mintBProgram?: PublicKey;

    txVersion: TxVersion.V0,
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 600000,
    // },
  })

  //   printSimulate([transaction])

  try {
    const sentInfo = await execute({ sendAndConfirm: true })
    console.log(sentInfo)
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// claimPlatformFee()
