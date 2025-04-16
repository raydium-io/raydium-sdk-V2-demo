import {
  TxVersion,
  DEV_LAUNCHPAD_PROGRAM,
  printSimulate,
  getPdaLaunchpadConfigId,
  LaunchpadConfig,
  LAUNCHPAD_PROGRAM,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import BN from 'bn.js'
import { Keypair, PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'

export const createMint = async () => {
  const raydium = await initSdk()

  const programId = LAUNCHPAD_PROGRAM // devent: DEV_LAUNCHPAD_PROGRAM

  const pair = Keypair.generate()
  const mintA = pair.publicKey

  const configId = getPdaLaunchpadConfigId(programId, NATIVE_MINT, 0, 0).publicKey

  const configData = await raydium.connection.getAccountInfo(configId)
  if (!configData) throw new Error('config not found')
  const configInfo = LaunchpadConfig.decode(configData.data)
  const mintBInfo = await raydium.token.getTokenInfo(configInfo.mintB)

  const inAmount = new BN(1000)
  const { execute, transactions, extInfo } = await raydium.launchpad.createLaunchpad({
    programId,
    mintA,
    decimals: 6,
    name: 'new launchpad mint',
    symbol: 'NLP',
    migrateType: 'amm',
    uri: 'https://google.com',

    configId,
    configInfo, // optional, sdk will get data by configId if not provided
    mintBDecimals: mintBInfo.decimals, // default 9
    /** default platformId is Raydium platform, you can create your platform config in ./createPlatform.ts script */
    // platformId: new PublicKey('your platform id'),
    txVersion: TxVersion.V0,
    slippage: new BN(100), // means 1%
    buyAmount: inAmount,
    createOnly: true, // true means create mint only, false will "create and buy together"
    extraSigners: [pair],

    // shareFeeReceiver: new PublicKey('your share wallet'), // only works when createOnly=false
    // shareFeeRate: new BN(1000), // only works when createOnly=false

    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 46591500,
    // },
  })

  printSimulate(transactions)

  try {
    const sentInfo = await execute({ sequentially: true })
    console.log('poolId: ', extInfo)
    console.log(sentInfo)
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// createMint()
