import { ApiV3PoolInfoConcentratedItem, ClmmKeys, PoolUtils } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'
import { isValidClmm } from './utils'

export const increaseLiquidity = async () => {
  const raydium = await initSdk()
  // SOL-USDC pool
  const poolId = 'Enfoa5Xdtirwa46xxa5LUVcQWe7EUb2pGzTjfvU7EBS1'
  let poolInfo: ApiV3PoolInfoConcentratedItem
  let poolKeys: ClmmKeys | undefined

  if (raydium.cluster === 'mainnet') {
    // note: api doesn't support get devnet pool info, so in devnet else we go rpc method
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoConcentratedItem
    if (!isValidClmm(poolInfo.programId)) throw new Error('target pool is not CLMM pool')
  } else {
    const data = await raydium.clmm.getPoolInfoFromRpc(poolId)
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
  }

  /** code below will get on chain realtime price to avoid slippage error, uncomment it if necessary */
  // const rpcData = await raydium.clmm.getRpcClmmPoolInfo({ poolId: poolInfo.id })
  // poolInfo.price = rpcData.currentPrice

  const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: poolInfo.programId })
  if (!allPosition.length) throw new Error('user do not have any positions')

  const position = allPosition.find((p) => p.poolId.toBase58() === poolInfo.id)
  if (!position) throw new Error(`user do not have position in pool: ${poolInfo.id}`)

  const inputAmount = 0.0001 // SOL UI amount
  const slippage = 0.05

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
    poolKeys,
    ownerPosition: position,
    ownerInfo: {
      useSOLBalance: true,
    },
    liquidity: new BN(new Decimal(res.liquidity.toString()).mul(1 - slippage).toFixed(0)),
    amountMaxA: new BN(new Decimal(inputAmount || '0').mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
    amountMaxB: new BN(new Decimal(res.amountSlippageB.amount.toString()).mul(1 + slippage).toFixed(0)),
    checkCreateATAOwner: true,
    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 100000000,
    // },
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('clmm position liquidity increased:', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// increaseLiquidity()
