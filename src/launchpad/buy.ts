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
import { PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import Decimal from 'decimal.js'

export const buy = async () => {
  const raydium = await initSdk()

  const mintA = new PublicKey('mint address')
  const mintB = NATIVE_MINT
  const inAmount = new BN(1000)

  const programId = LAUNCHPAD_PROGRAM // devnet: DEV_LAUNCHPAD_PROGRAM

  const poolId = getPdaLaunchpadPoolId(programId, mintA, mintB).publicKey
  const poolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId })
  const data = await raydium.connection.getAccountInfo(poolInfo.platformId)
  const platformInfo = PlatformConfig.decode(data!.data)

  const shareFeeReceiver = undefined
  const shareFeeRate = shareFeeReceiver ? new BN(0) : new BN(10000) // do not exceed poolInfo.configInfo.maxShareFeeRate
  const slippage = new BN(100) // means 1%

  const res = Curve.buyExactIn({
    poolInfo,
    amountB: inAmount,
    protocolFeeRate: poolInfo.configInfo.tradeFeeRate,
    platformFeeRate: platformInfo.feeRate,
    curveType: poolInfo.configInfo.curveType,
    shareFeeRate,
  })

  console.log(
    'expected out amount: ',
    res.amountA.toString(),
    'minimum out amount: ',
    new Decimal(res.amountA.toString()).mul((10000 - slippage.toNumber()) / 10000).toFixed(0)
  )

  const { transaction, extInfo, execute } = await raydium.launchpad.buyToken({
    programId,
    mintA,
    // mintB: poolInfo.configInfo.mintB, // optional, default is sol
    // minMintAAmount: res.amountA, // optional, default sdk will calculated by realtime rpc data
    slippage,
    configInfo: poolInfo.configInfo,
    platformFeeRate: platformInfo.feeRate,
    txVersion: TxVersion.V0,
    buyAmount: inAmount,
    // shareFeeReceiver, // optional
    // shareFeeRate,  // optional, do not exceed poolInfo.configInfo.maxShareFeeRate

    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 600000,
    // },
  })

  console.log('expected receive amount:', extInfo.outAmount.toString())
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
// buy()
