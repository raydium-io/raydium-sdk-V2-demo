import { ApiV3PoolInfoConcentratedItem, PoolUtils } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'

export const increaseLiquidity = async () => {
  const raydium = await initSdk()
  // SOL-USDC pool
  const data = await raydium.api.fetchPoolById({ ids: '2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv' })
  const poolInfo = (data as any)[0] as ApiV3PoolInfoConcentratedItem

  const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: poolInfo.programId })
  if (!allPosition.length) throw new Error('use do not have position')

  const position = allPosition.find((p) => p.poolId.toBase58() === poolInfo.id)
  if (!position) throw new Error(`use do not have position in pool: ${poolInfo.id}`)

  const inputAmount = 0.0001 // SOL UI amount
  const slippage = 0.005

  const epochInfo = await raydium.fetchEpochInfo()
  const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
    poolInfo,
    slippage: 0,
    inputA: true,
    tickUpper: Math.max(position.tickLower, position.tickUpper),
    tickLower: Math.min(position.tickLower, position.tickUpper),
    amount: new BN(new Decimal(inputAmount || '0').mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
    add: true,
    amountHasFee: true,
    epochInfo: epochInfo,
  })

  const { execute } = await raydium.clmm.increasePositionFromLiquidity({
    poolInfo,
    ownerPosition: position,
    ownerInfo: {
      useSOLBalance: true,
    },
    liquidity: new BN(new Decimal(res.liquidity.toString()).mul(1 - slippage).toFixed(0)),
    amountMaxA: new BN(new Decimal(inputAmount || '0').mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
    amountMaxB: new BN(new Decimal(res.amountSlippageB.amount.toString()).mul(1 + slippage).toFixed(0)),
    checkCreateATAOwner: true,
    txVersion,
  })

  const { txId } = await execute()
  console.log('clmm position liquidity increased:', { txId })
}

/** uncomment code below to execute */
// increaseLiquidity()
