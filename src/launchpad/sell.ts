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

  const mintInfo = await raydium.token.getTokenInfo(mintA)
  const epochInfo = await raydium.connection.getEpochInfo()

  const res = Curve.sellExactIn({
    poolInfo,
    amountA: inAmount,
    protocolFeeRate: poolInfo.configInfo.tradeFeeRate,
    platformFeeRate: platformInfo.feeRate,
    curveType: poolInfo.configInfo.curveType,
    shareFeeRate,
    creatorFeeRate: platformInfo.creatorFeeRate,
    slot: await raydium.connection.getSlot(),
    transferFeeConfigA: mintInfo.extensions.feeConfig
      ? {
          transferFeeConfigAuthority: PublicKey.default,
          withdrawWithheldAuthority: PublicKey.default,
          withheldAmount: BigInt(0),
          olderTransferFee: {
            epoch: BigInt(mintInfo.extensions.feeConfig.olderTransferFee.epoch ?? epochInfo?.epoch ?? 0),
            maximumFee: BigInt(mintInfo.extensions.feeConfig.olderTransferFee.maximumFee),
            transferFeeBasisPoints: mintInfo.extensions.feeConfig.olderTransferFee.transferFeeBasisPoints,
          },
          newerTransferFee: {
            epoch: BigInt(mintInfo.extensions.feeConfig.newerTransferFee.epoch ?? epochInfo?.epoch ?? 0),
            maximumFee: BigInt(mintInfo.extensions.feeConfig.newerTransferFee.maximumFee),
            transferFeeBasisPoints: mintInfo.extensions.feeConfig.newerTransferFee.transferFeeBasisPoints,
          },
        }
      : undefined,
  })
  console.log(
    'expected out amount: ',
    res.amountB.toString(),
    'minimum out amount: ',
    new Decimal(res.amountB.toString()).mul((10000 - slippage.toNumber()) / 10000).toFixed(0)
  )

  // Raydium UI usage: https://github.com/raydium-io/raydium-ui-v3-public/blob/master/src/store/useLaunchpadStore.ts#L637
  const { execute, transaction, builder } = await raydium.launchpad.sellToken({
    programId,
    mintA,
    mintAProgram: new PublicKey(mintInfo.programId),
    // mintB, // default is sol
    poolInfo,
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
