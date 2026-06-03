import {
  ApiV3PoolInfoConcentratedItem,
  TickUtil,
  LiquidityMathUtil,
  ClmmKeys,
  getTransferAmountFeeV2,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'
import { isValidClmm } from './utils'

export const createPosition = async () => {
  const raydium = await initSdk()

  let poolInfo: ApiV3PoolInfoConcentratedItem
  // RAY-USDC pool
  const poolId = '61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht'
  let poolKeys: ClmmKeys | undefined

  if (raydium.cluster === 'mainnet') {
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

  const inputAmount = 1 // RAY amount
  const [startPrice, endPrice] = [0.000001, 100000]

  const lowerTick = TickUtil.toTickIndex(
    TickUtil.priceToTick(new Decimal(startPrice), poolInfo.mintA.decimals, poolInfo.mintB.decimals),
    poolInfo.config.tickSpacing,
  )
  const upperTick = TickUtil.toTickIndex(
    TickUtil.priceToTick(new Decimal(endPrice), poolInfo.mintA.decimals, poolInfo.mintB.decimals),
    poolInfo.config.tickSpacing,
  )

  const sqrtPriceCurrentX64 = TickUtil.priceToSqrtPriceX64(
    new Decimal(poolInfo.price),
    poolInfo.mintA.decimals,
    poolInfo.mintB.decimals,
  )
  const sqrtPriceLowerX64 = TickUtil.getSqrtPriceAtTick(lowerTick)
  const sqrtPriceUpperX64 = TickUtil.getSqrtPriceAtTick(upperTick)

  console.log('Tick Lower', lowerTick)
  console.log('Tick Upper', upperTick)
  console.log(
    'Price Lower',
    TickUtil.tickToPrice(lowerTick, poolInfo.mintA.decimals, poolInfo.mintB.decimals).toFixed(6),
  )
  console.log(
    'Price Upper',
    TickUtil.tickToPrice(upperTick, poolInfo.mintA.decimals, poolInfo.mintB.decimals).toFixed(6),
  )

  const desiredAmount0 = new BN(inputAmount).mul(new BN(10).pow(new BN(poolInfo.mintA.decimals)))
  const { fee = new BN(0) } = getTransferAmountFeeV2(
    desiredAmount0,
    poolInfo.mintA.extensions.feeConfig,
    await raydium.fetchEpochInfo(),
    false,
  )
  const res = LiquidityMathUtil.getLiquidityAndAmountsFromAmount({
    sqrtPriceCurrentX64,
    sqrtPriceLowerX64,
    sqrtPriceUpperX64,
    amountInfo: {
      type: 'amountA',
      amount: desiredAmount0.sub(fee),
    },
  })

  // Set slippage from config
  const SLIPPAGE_BPS = 100 // 1% slippage
  const amount0Max = res.amountA.muln(10000 + SLIPPAGE_BPS).divn(10000)
  const amount1Max = res.amountB.muln(10000 + SLIPPAGE_BPS).divn(10000)

  const { execute, extInfo } = await raydium.clmm.openPositionFromBase({
    poolInfo,
    poolKeys,
    tickUpper: Math.max(lowerTick, upperTick),
    tickLower: Math.min(lowerTick, upperTick),
    base: 'MintA',
    ownerInfo: {
      useSOLBalance: true,
    },
    liquidity: res.liquidity,
    baseAmount: amount0Max,
    otherAmountMax: amount1Max,
    nft2022: true,
    txVersion,
    // optional: set up priority fee here
    computeBudgetConfig: {
      units: 600000,
      microLamports: 100000,
    },
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('clmm position opened:', { txId, nft: extInfo.nftMint.toBase58() })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// createPosition()
