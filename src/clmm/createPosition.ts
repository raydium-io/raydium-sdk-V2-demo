import { ApiV3PoolInfoConcentratedItem, TickUtils, PoolUtils } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'
import { isValidClmm } from './utils'

export const createPosition = async () => {
  const raydium = await initSdk()
  // RAY-USDC pool
  // note: api doesn't support get devnet pool info
  const data = await raydium.api.fetchPoolById({ ids: '61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht' })
  const poolInfo = (data as any)[0] as ApiV3PoolInfoConcentratedItem
  if (!isValidClmm(poolInfo.programId)) throw new Error('target pool is not CLMM pool')

  /** code below will get on chain realtime price to avoid slippage error, uncomment it if necessary */
  // const rpcData = await raydium.clmm.getRpcClmmPoolInfo({ poolId: poolInfo.id })
  // poolInfo.price = rpcData.currentPrice

  const inputAmount = 1 // RAY amount
  const [startPrice, endPrice] = [0.1, 100]

  const { tick: lowerTick } = TickUtils.getPriceAndTick({
    poolInfo,
    price: new Decimal(startPrice),
    baseIn: true,
  })

  const { tick: upperTick } = TickUtils.getPriceAndTick({
    poolInfo,
    price: new Decimal(endPrice),
    baseIn: true,
  })

  const epochInfo = await raydium.fetchEpochInfo()
  const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
    poolInfo,
    slippage: 0,
    inputA: true,
    tickUpper: Math.max(lowerTick, upperTick),
    tickLower: Math.min(lowerTick, upperTick),
    amount: new BN(new Decimal(inputAmount || '0').mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
    add: true,
    amountHasFee: true,
    epochInfo: epochInfo,
  })

  const { execute, extInfo } = await raydium.clmm.openPositionFromBase({
    poolInfo,
    tickUpper: Math.max(lowerTick, upperTick),
    tickLower: Math.min(lowerTick, upperTick),
    base: 'MintA',
    ownerInfo: {},
    baseAmount: new BN(new Decimal(inputAmount || '0').mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
    otherAmountMax: res.amountSlippageB.amount,
    txVersion,
  })

  const { txId } = await execute()
  console.log('clmm position opened:', { txId }, ', nft mint:', extInfo.nftMint.toBase58())
}

/** uncomment code below to execute */
// createPosition()
