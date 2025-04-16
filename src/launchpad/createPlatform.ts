import { TxVersion, DEV_LAUNCHPAD_PROGRAM, printSimulate, LAUNCHPAD_PROGRAM } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import BN from 'bn.js'

export const createPlatform = async () => {
  const raydium = await initSdk()
  const owner = raydium.ownerPubKey

  /** notice: every wallet only enable to create "1" platform config */
  const { transaction, extInfo, execute } = await raydium.launchpad.createPlatformConfig({
    programId: LAUNCHPAD_PROGRAM, // devnet: DEV_LAUNCHPAD_PROGRAM,
    platformAdmin: owner,
    platformClaimFeeWallet: owner,
    platformLockNftWallet: owner,
    migrateCpLockNftScale: {
      platformScale: new BN(400000), // set up your config
      creatorScale: new BN(400000), // set up your config
      burnScale: new BN(200000), // set up your config
    },
    feeRate: new BN(1000), // set up your config
    name: 'your platform name',
    web: 'https://your.platform.org',
    img: 'https://your.platform.org/img',
    txVersion: TxVersion.V0,
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 600000,
    // },
  })

  //   printSimulate([transaction])

  try {
    const sentInfo = await execute({ sendAndConfirm: true })
    console.log(sentInfo, `platformId: ${extInfo.platformId.toBase58()}`)
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// createPlatform()
