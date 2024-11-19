import {
  ApiV3PoolInfoConcentratedItem,
  ClmmKeys,
  ComputeClmmPoolInfo,
  PoolUtils,
  ReturnTypeFetchMultiplePoolTickArrays,
  USDCMint,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import { isValidClmm } from './utils'
import { NATIVE_MINT } from '@solana/spl-token'
import Decimal from 'decimal.js'

// swapBaseOut means fixed output token amount, calculate needed input token amount
export const swapBaseOut = async () => {
  const raydium = await initSdk()
  let poolInfo: ApiV3PoolInfoConcentratedItem
  // SOL-USDC pool
  const poolId = '2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv'
  let poolKeys: ClmmKeys | undefined
  let clmmPoolInfo: ComputeClmmPoolInfo
  let tickCache: ReturnTypeFetchMultiplePoolTickArrays

  const outputMint = NATIVE_MINT
  const amountOut = new BN(1000000)

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

  if (outputMint.toBase58() !== poolInfo.mintA.address && outputMint.toBase58() !== poolInfo.mintB.address)
    throw new Error('input mint does not match pool')

  const { remainingAccounts, ...res } = await PoolUtils.computeAmountIn({
    poolInfo: clmmPoolInfo,
    tickArrayCache: tickCache[poolId],
    amountOut,
    baseMint: outputMint,
    slippage: 0.01,
    epochInfo: await raydium.fetchEpochInfo(),
  })

  const [mintIn, mintOut] =
    outputMint.toBase58() === poolInfo.mintB.address
      ? [poolInfo.mintA, poolInfo.mintB]
      : [poolInfo.mintB, poolInfo.mintA]

  console.log({
    amountIn: `${new Decimal(res.amountIn.amount.toString()).div(10 ** mintIn.decimals).toString()} ${mintIn.symbol}`,
    maxAmountIn: `${new Decimal(res.maxAmountIn.amount.toString()).div(10 ** mintIn.decimals).toString()} ${
      mintIn.symbol
    }`,
    realAmountOut: `${new Decimal(res.realAmountOut.amount.toString()).div(10 ** mintOut.decimals).toString()} ${
      mintOut.symbol
    }`,
  })

  const { execute } = await raydium.clmm.swapBaseOut({
    poolInfo,
    poolKeys,
    outputMint,
    amountInMax: res.maxAmountIn.amount,
    amountOut: res.realAmountOut.amount,
    observationId: clmmPoolInfo.observationId,
    ownerInfo: {
      useSOLBalance: true, // if wish to use existed wsol token account, pass false
    },
    remainingAccounts,
    txVersion,

    // optional: set up priority fee here
    computeBudgetConfig: {
      units: 600000,
      microLamports: 465915,
    },
  })

  const { txId } = await execute({ sendAndConfirm: true })
  console.log('swapped in clmm pool:', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// swapBaseOut()
