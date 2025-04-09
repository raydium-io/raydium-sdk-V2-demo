import { PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import { TxVersion, DEV_LAUNCHPAD_PROGRAM, printSimulate } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'

export const claimPlatformFee = async () => {
  const raydium = await initSdk()
  const poolId = new PublicKey('pool id')

  if (raydium.cluster !== 'devnet')
    throw new Error('Please check rpc setting, launchpad currently only support in devent')

  const { execute, transaction, extInfo, builder } = await raydium.launchpad.claimPlatformFee({
    programId: DEV_LAUNCHPAD_PROGRAM, // launchpad currently only support in devent
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
