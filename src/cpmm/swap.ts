import { ApiV3PoolInfoStandardItemCpmm, CurveCalculator } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import BN from 'bn.js'
import { isValidCpmm } from './utils'

export const swap = async () => {
  const raydium = await initSdk()

  // SOL - USDC pool
  // note: api doesn't support get devnet pool info
  const data = await raydium.api.fetchPoolById({ ids: '7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny' })
  const poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
  if (!isValidCpmm(poolInfo.programId)) throw new Error('target pool is not CPMM pool')
  const rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true)

  const inputAmount = new BN(100)

  // swap pool mintA for mintB
  const swapResult = CurveCalculator.swap(
    inputAmount,
    rpcData.baseReserve,
    rpcData.quoteReserve,
    rpcData.configInfo!.tradeFeeRate
  )

  /**
   * swapResult.sourceAmountSwapped -> input amount
   * swapResult.destinationAmountSwapped -> output amount
   * swapResult.tradeFee -> this swap fee, charge input mint
   */

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
