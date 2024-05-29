import { ApiV3PoolInfoConcentratedItem, PoolUtils } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'

export const swap = async () => {
  const raydium = await initSdk()
  const poolId = '61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht'
  const inputAmount = new BN(100)
  // RAY-USDC pool
  // note: api doesn't support get devnet pool info
  const data = await raydium.api.fetchPoolById({ ids: poolId })
  const poolInfo = data[0] as ApiV3PoolInfoConcentratedItem

  const clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
    connection: raydium.connection,
    poolInfo,
  })

  const tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
    connection: raydium.connection,
    poolKeys: [clmmPoolInfo],
  })

  const { minAmountOut, remainingAccounts } = await PoolUtils.computeAmountOutFormat({
    poolInfo: clmmPoolInfo,
    tickArrayCache: tickCache[poolId],
    amountIn: inputAmount,
    tokenOut: poolInfo.mintB,
    slippage: 0.01,
    epochInfo: await raydium.fetchEpochInfo(),
  })

  const { execute } = await raydium.clmm.swap({
    poolInfo,
    inputMint: poolInfo.mintA.address,
    amountIn: inputAmount,
    amountOutMin: minAmountOut.amount.raw,
    ownerInfo: {},
    remainingAccounts,
    txVersion,
  })

  const { txId } = await execute()
  console.log('swapped in clmm pool:', { txId })
}

/** uncomment code below to execute */
// swap()
