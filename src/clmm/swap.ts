import {
  ApiV3PoolInfoConcentratedItem,
  ClmmKeys,
  ComputeClmmPoolInfo,
  PoolUtils,
  ReturnTypeFetchMultiplePoolTickArrays,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import { isValidClmm } from './utils'

export const swap = async () => {
  const raydium = await initSdk()
  let poolInfo: ApiV3PoolInfoConcentratedItem
  // RAY-USDC pool
  const poolId = '61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht'
  let poolKeys: ClmmKeys | undefined
  let clmmPoolInfo: ComputeClmmPoolInfo
  let tickCache: ReturnTypeFetchMultiplePoolTickArrays

  const inputAmount = new BN(100)

  if (raydium.cluster === 'mainnet') {
    // note: api doesn't support get devnet pool info, so in devnet else we go rpc method
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoConcentratedItem
    if (!isValidClmm(poolInfo.programId)) throw new Error('target pool is not CLMM pool')

    clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
      connection: raydium.connection,
      poolInfo,
    })
    tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
      connection: raydium.connection,
      poolKeys: [clmmPoolInfo],
    })
  } else {
    const data = await raydium.clmm.getPoolInfoFromRpc(poolId)
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
    clmmPoolInfo = data.computePoolInfo
    tickCache = data.tickData
  }

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
    poolKeys,
    inputMint: poolInfo.mintA.address,
    amountIn: inputAmount,
    amountOutMin: minAmountOut.amount.raw,
    observationId: clmmPoolInfo.observationId,
    ownerInfo: {
      useSOLBalance: true,
    },
    remainingAccounts,
    txVersion,
  })

  const { txId } = await execute()
  console.log('swapped in clmm pool:', { txId })
}

/** uncomment code below to execute */
// swap()
