import { ApiV3PoolInfoConcentratedItem, PoolUtils, Percent } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk } from '../config'

export const clmmSwap = async () => {
  const raydium = await initSdk()
  const poolId = '61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht'
  const inputAmount = new BN(1)
  // RAY-USDC pool
  const data = await raydium.api.searchPoolById({ ids: poolId })
  const poolInfo = data.data[0] as ApiV3PoolInfoConcentratedItem

  const clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
    owner: raydium.ownerPubKey,
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
  })

  const { txId } = await execute()
  console.log('swapped in clmm pool:', { txId })
}

clmmSwap()
