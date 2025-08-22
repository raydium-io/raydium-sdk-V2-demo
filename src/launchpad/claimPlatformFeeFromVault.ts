import { PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import { TxVersion, DEVNET_PROGRAM_ID, LAUNCHPAD_PROGRAM, printSimulate } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'

export const claimPlatformFeeFromVault = async () => {
  const raydium = await initSdk()

  const { execute, transaction, extInfo, builder } = await raydium.launchpad.claimVaultPlatformFee({
    programId: DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM, // devnet: DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM
    platformId: new PublicKey('your platform id'),
    claimFeeWallet: new PublicKey('your platform fee wallet'),

    mintB: NATIVE_MINT, // currently all mintB is WSOL
    // mintBProgram?: TOKEN_PROGRAM_ID;

    txVersion: TxVersion.V0,
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 600000,
    // },
  })

  try {
    const sentInfo = await execute({ sendAndConfirm: true })
    console.log(sentInfo)
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// claimPlatformFeeFromVault()
