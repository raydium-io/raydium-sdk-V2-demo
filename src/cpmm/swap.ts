import { ApiV3PoolInfoStandardItemCpmm, Percent, CurveCalculator } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import BN from 'bn.js'

export const swap = async () => {
  const raydium = await initSdk()

  // SOL - USDC pool
  const data = await raydium.api.fetchPoolById({ ids: '7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny' })
  const poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
  const rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true)

  const inputAmount = new BN(10000)

  // swap pool mintA for mintB
  const swapResult = CurveCalculator.swap(
    inputAmount,
    rpcData.baseReserve,
    rpcData.quoteReserve,
    rpcData.configInfo!.tradeFeeRate
  )

  swapResult.destinationAmountSwapped

  const { execute } = await raydium.cpmm.swap({
    poolInfo,
    swapResult,
    baseIn: true,
  })

  const { txId } = await execute()
  console.log(`swapped: ${poolInfo.mintA.symbol} to ${poolInfo.mintB.symbol}:`, { txId })
}

/** uncomment code below to execute */
// swap()
