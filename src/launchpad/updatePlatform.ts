import {
  TxVersion,
  DEV_LAUNCHPAD_PROGRAM,
  printSimulate,
  LAUNCHPAD_PROGRAM,
  PlatformConfig,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

export const updatePlatform = async () => {
  const raydium = await initSdk()

  /**
   * note:
   * 1. only when on-chain epoch > platform config epoch can update platform
   * 2. only can update 1 platform config in one tx
   * 3. after 1 platform config updated, platform config epoch will be updated to on-chain epoch, next update should wait on-chian epoch grows up
   */
  const { execute, transaction } = await raydium.launchpad.updatePlatformConfig({
    // programId: DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM,
    platformAdmin: new PublicKey('owner'),
    updateInfo: { type: 'updateFeeRate', value: new BN(10) },

    /** other update example */
    // updateInfo: { type: 'updateClaimFeeWallet', value: new PublicKey('wallet') },
    // updateInfo: {
    //   type: 'migrateCpLockNftScale',
    //   value: {
    //     platformScale: new BN(400000),
    //     creatorScale: new BN(500000),
    //     burnScale: new BN(100000),
    //   },
    // },
    // updateInfo: { type: 'updateCpConfigId', value: new PublicKey('cp config id') },

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
// updatePlatform()
