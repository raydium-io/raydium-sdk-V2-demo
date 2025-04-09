import {
  TxVersion,
  DEV_LAUNCHPAD_PROGRAM,
  printSimulate,
  getPdaLaunchpadConfigId,
  LaunchpadConfig,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import BN from 'bn.js'
import { Keypair } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'

export const createMint = async () => {
  const raydium = await initSdk()

  const programId = DEV_LAUNCHPAD_PROGRAM // currently only support in devent

  if (!programId.equals(DEV_LAUNCHPAD_PROGRAM) || raydium.cluster !== 'devnet')
    throw new Error('Please check program id and rpc setting, launchpad currently only support in devent')

  const pair = Keypair.generate()
  const mintA = pair.publicKey

  const configId = getPdaLaunchpadConfigId(programId, NATIVE_MINT, 0, 0).publicKey

  const configData = await raydium.connection.getAccountInfo(configId)
  if (!configData) throw new Error('config not found')
  const configInfo = LaunchpadConfig.decode(configData.data)
  const mintBInfo = await raydium.token.getTokenInfo(configInfo.mintB)

  const inAmount = new BN(10000)
  const { builder, extInfo } = await raydium.launchpad.createLaunchpad({
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

    // shareFeeReceiver: new PublicKey('share wallet'), // only works when createOnly=false
    // shareFeeRate: new BN(1000),  // only works when createOnly=false

    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 600000,
    // },
  })

  builder.addInstruction({ signers: [pair] })
  const { execute, transaction } = await builder.buildV0()

  // printSimulate([transaction])

  try {
    const sentInfo = await execute({ sendAndConfirm: true })
    console.log('poolId: ', extInfo)
    console.log(sentInfo)
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// createMint()
