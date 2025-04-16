import {
  Curve,
  TxVersion,
  DEV_LAUNCHPAD_PROGRAM,
  LAUNCHPAD_PROGRAM,
  printSimulate,
  getPdaLaunchpadPoolId,
  PlatformConfig,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import BN from 'bn.js'
import { PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import Decimal from 'decimal.js'

export const sell = async () => {
  const raydium = await initSdk()

  const mintA = new PublicKey('your mint')
  const mintB = NATIVE_MINT

  const programId = LAUNCHPAD_PROGRAM // devnet: DEV_LAUNCHPAD_PROGRAM

  const poolId = getPdaLaunchpadPoolId(programId, mintA, mintB).publicKey
  const poolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId })
  const data = await raydium.connection.getAccountInfo(poolInfo.platformId)
  const platformInfo = PlatformConfig.decode(data!.data)

  const inAmount = new BN(100000)
  const shareFeeReceiver = undefined
  const shareFeeRate = shareFeeReceiver ? new BN(0) : new BN(10000) // do not exceed poolInfo.configInfo.maxShareFeeRate
  const slippage = new BN(100) // means 1%

  const res = Curve.sellExactIn({
    poolInfo,
    amountA: inAmount,
    protocolFeeRate: poolInfo.configInfo.tradeFeeRate,
    platformFeeRate: platformInfo.feeRate,
    curveType: poolInfo.configInfo.curveType,
    shareFeeRate,
  })
  console.log(
    'expected out amount: ',
    res.amountB.toString(),
    'minimum out amount: ',
    new Decimal(res.amountB.toString()).mul((10000 - slippage.toNumber()) / 10000).toFixed(0)
  )

  const { execute, transaction, builder } = await raydium.launchpad.sellToken({
    programId,
    mintA,
    // mintB, // default is sol
    configInfo: poolInfo.configInfo,
    platformFeeRate: platformInfo.feeRate,
    txVersion: TxVersion.V0,
    sellAmount: inAmount,
  })

  // printSimulate([transaction])

  try {
    const sentInfo = await execute({ sendAndConfirm: true })
    console.log(sentInfo)
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// sell()
