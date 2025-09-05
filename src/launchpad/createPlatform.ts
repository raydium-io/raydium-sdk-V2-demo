import { TxVersion, DEVNET_PROGRAM_ID, printSimulate, LAUNCHPAD_PROGRAM } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

export const createPlatform = async () => {
  const raydium = await initSdk()
  const owner = raydium.ownerPubKey

  /** notice: every wallet only enable to create "1" platform config */
  const { transaction, extInfo, execute } = await raydium.launchpad.createPlatformConfig({
    // programId: LAUNCHPAD_PROGRAM, // devnet: DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM,
    programId: DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM,
    platformAdmin: owner,
    platformClaimFeeWallet: owner,
    platformLockNftWallet: owner,
    cpConfigId: new PublicKey('5MxLgy9oPdTC3YgkiePHqr3EoCRD9uLVYRQS2ANAs7wy'),

    transferFeeExtensionAuth: new PublicKey('auth'), // or just set owner

    creatorFeeRate: new BN('0'), // set number for fee rate
    /**
     * when migration, launchpad pool will deposit mints in vaultA/vaultB to new cpmm pool
     * and return lp to migration wallet
     * migrateCpLockNftScale config is to set up usage of these lp
     * note: sum of these 3 should be 10**6, means percent (0%~100%)
     */
    migrateCpLockNftScale: {
      platformScale: new BN(400000), // means 40%, locked 40% of return lp and return to platform nft wallet
      creatorScale: new BN(500000), // means 50%, locked 50% of return lp and return to creator nft wallet
      burnScale: new BN(100000), // means 10%, burned return lp percent after migration
    },
    feeRate: new BN(1000), // launch lab buy and sell platform feeRate
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
