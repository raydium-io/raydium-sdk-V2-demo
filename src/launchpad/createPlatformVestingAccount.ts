import {
  TxVersion,
  DEVNET_PROGRAM_ID,
  printSimulate,
  LAUNCHPAD_PROGRAM,
  PlatformConfig,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

export const createPlatformVestingAccount = async () => {
  const raydium = await initSdk()

  /** example to check platform's platformVestingWallet address */
  // const res = await raydium.connection.getAccountInfo(new PublicKey('platform id'))
  // if (!res) throw new Error('platform not found')
  // const platform = PlatformConfig.decode(res.data)
  // const platformVestingWallet = platform.platformVestingWallet

  const { transaction, extInfo, execute } = await raydium.launchpad.createPlatformVestingAccount({
    // programId: LAUNCHPAD_PROGRAM, // devnet: DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM,
    programId: DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM,
    platformVestingWallet: new PublicKey('platform vesting wallet'),

    // beneficiary can claim platform vesting after mints graduated
    beneficiary: new PublicKey('beneficiary wallet address'),
    platformId: new PublicKey('platform id'),
    poolId: new PublicKey('launch pool id'),

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
// createPlatformVestingAccount()
