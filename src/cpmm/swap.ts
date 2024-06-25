import {
  ApiV3PoolInfoStandardItemCpmm,
  CpmmKeys,
  CpmmRpcData,
  CurveCalculator,
  getPdaPoolAuthority,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import BN from 'bn.js'
import { isValidCpmm } from './utils'

export const swap = async () => {
  const raydium = await initSdk()

  // SOL - USDC pool
  const poolId = '7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny'
  let poolInfo: ApiV3PoolInfoStandardItemCpmm
  let poolKeys: CpmmKeys | undefined
  let rpcData: CpmmRpcData

  if (raydium.cluster === 'mainnet') {
    // note: api doesn't support get devnet pool info, so in devnet else we go rpc method
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
    if (!isValidCpmm(poolInfo.programId)) throw new Error('target pool is not CPMM pool')
    rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true)
  } else {
    const data = await raydium.cpmm.getPoolInfoFromRpc(poolId)
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
    rpcData = data.rpcData
  }

  const inputAmount = new BN(100)
  const inputMint = poolInfo.mintA.address
  const baseIn = inputMint === poolInfo.mintA.address

  // swap pool mintA for mintB
  const swapResult = CurveCalculator.swap(
    inputAmount,
    baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
    baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
    rpcData.configInfo!.tradeFeeRate
  )

  /**
   * swapResult.sourceAmountSwapped -> input amount
   * swapResult.destinationAmountSwapped -> output amount
   * swapResult.tradeFee -> this swap fee, charge input mint
   */

  const { execute } = await raydium.cpmm.swap({
    poolInfo,
    poolKeys,
    swapResult,
    slippage: 0.1, // range: 1 ~ 0.0001, means 100% ~ 0.01%
    baseIn,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 100000000,
    // },
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log(`swapped: ${poolInfo.mintA.symbol} to ${poolInfo.mintB.symbol}:`, { txId })
}

/** uncomment code below to execute */
// swap()
