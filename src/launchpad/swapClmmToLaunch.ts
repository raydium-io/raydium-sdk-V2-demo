import {
  TxVersion,
  DEV_LAUNCHPAD_PROGRAM,
  printSimulate,
  getPdaLaunchpadPoolId,
  Curve,
  PlatformConfig,
  LAUNCHPAD_PROGRAM,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import BN from 'bn.js'
import { NATIVE_MINT } from '@solana/spl-token'
import Decimal from 'decimal.js'

export const swapClmmToLaunch = async () => {
  const raydium = await initSdk()

  // !!! please ensure your clmm out mint equals to launch pool mint B !!!
  /** this is DEVNET demo !!
   * if you want to use in mainnet, use xxx - sol clmm pool and input mint should be xxx
   * if there're launch mints support non sol config, you can use those clmm pools
   * */
  // e.g. swap CLMM sol -> 'usdc' -----> LAUNCH 'usdc' -> xxx mint
  const clmmPoolId = 'FXAXqgjNK6JVzVV2frumKTEuxC8hTEUhVTJTRhMMwLmM' // sol -> usdc
  // this is launchpad pool id not mint address
  const launchPoolId = 'DxwFUg3xpB6VWCsDN3FFSBCLep2mTNhhC1so6FE1RufB' // usdc -> cc

  // note: how to get launch mint's pool Id
  //   const { publicKey: poolId } = getPdaLaunchpadPoolId(DEV_LAUNCHPAD_PROGRAM, mintA, mintB)

  /** if you want cache rpc data to reduce rpc call in every swap compute,
   *  can pre fetch data and pass to computeClmmToLaunchAmount method,
   *  or computeClmmToLaunchAmount will call rpc get realtime pool data every time
   */
  //   const clmmPoolData = await raydium.clmm.getPoolInfoFromRpc(clmmPoolId)
  //   const launchPoolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId: new PublicKey(launchPoolId) })
  //   const platformRes = await raydium.connection.getAccountInfo(launchPoolInfo.platformId)
  //   const launchPlatformInfo = PlatformConfig.decode(platformRes!.data)

  const inputAmount = new BN(1000)
  const inputMint = NATIVE_MINT
  const slippage = 0.01

  /** code below is to display pre-calculated swap result only */
  //   const data = await raydium.tradeV2.computeClmmToLaunchAmount({
  //     inputAmount,
  //     inputMint: NATIVE_MINT,

  //     clmmPoolId,
  //     launchPoolId,
  //     slippage,

  //     // clmmPoolData,
  //     // launchPoolInfo,
  //     // launchPlatformInfo,
  //   })

  //   console.log(
  //     `swap ${inputAmount.toString()} ${inputMint.toBase58()} to ${data.outAmount.toString()}, min amount out: ${data.minOutAmount.toString()}`
  //   )

  const { transaction, extInfo, execute } = await raydium.tradeV2.swapClmmToLaunchMint({
    inputAmount,
    inputMint,

    clmmPoolId,
    launchPoolId,
    slippage,
    txVersion: TxVersion.V0,
  })

  console.log(
    'swap route info',
    extInfo.routes.map((data) => `${data.mint.toString()}: ${data.amount.toString()}`).join(' -> ')
  )

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
swapClmmToLaunch()
