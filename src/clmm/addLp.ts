import { ApiV3PoolInfoConcentratedItem, TickUtils, PoolUtils } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'

export const addLp = async () => {
  const raydium = await initSdk()
  // RAY-USDC pool
  const data = await raydium.api.fetchPoolById({ ids: '61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht' })
  const poolInfo = (data as any)[0] as ApiV3PoolInfoConcentratedItem

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

  const { execute } = await raydium.clmm.openPositionFromBase({
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
  console.log('clmm position opened:', { txId })
}

/** uncomment code below to execute */
// addLp()
