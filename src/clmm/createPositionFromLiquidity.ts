import {
  ApiV3PoolInfoConcentratedItem,
  TickUtils,
  PoolUtils,
  ClmmKeys,
  printSimulate,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'

export const createPositionFromLiquidity = async () => {
  const raydium = await initSdk()

  let poolInfo: ApiV3PoolInfoConcentratedItem
  // SOL-ai16z pool
  const poolId = '8sN9549P3Zn6xpQRqpApN57xzkCh6sJxLwuEjcG2W4Ji'
  let poolKeys: ClmmKeys | undefined
  const slippage = 0.025 // means 2.5%

  const data = await raydium.clmm.getPoolInfoFromRpc(poolId)
  poolInfo = data.poolInfo
  poolKeys = data.poolKeys

  /** code below will get on chain realtime price to avoid slippage error, uncomment it if necessary */
  // const rpcData = await raydium.clmm.getRpcClmmPoolInfo({ poolId: poolInfo.id })
  // poolInfo.price = rpcData.currentPrice
  await raydium.account.fetchWalletTokenAccounts()

  console.log(
    `sol balance: ${new Decimal(raydium.account.tokenAccounts.find((t) => t.isNative)?.amount.toString() ?? 0)
      .div(10 ** 9)
      .toDecimalPlaces(9)
      .toString()}`
  )

  // we do NOT suggest use all sol amount as input amount
  // since tx needs tx fees and openPosition fees
  const inputAmount = new Decimal(raydium.account.tokenAccounts.find((t) => t.isNative)!.amount.toString())
    .div(10 ** poolInfo.mintA.decimals)
    .mul(0.6)
    .toDecimalPlaces(poolInfo.mintA.decimals)
    .toString()
  //   const inputAmount = 0.025 // SOL "UI" amount
  const [startPrice, endPrice] = [560.979027728865622, 647.86110003403338]

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

  console.log('computed lp/amountA/amountB to ins:', {
    lp: res.liquidity.toString(),
    amountMaxA: `${inputAmount} SOL`,
    amountMaxB: `${new Decimal(res.amountSlippageB.amount.toString())
      .mul(1 + slippage)
      .div(10 ** poolInfo.mintB.decimals)
      .toDecimalPlaces(poolInfo.mintB.decimals)
      .toString()} ai16z`,
  })

  const { execute, extInfo, transaction } = await raydium.clmm.openPositionFromLiquidity({
    poolInfo,
    poolKeys,
    tickUpper: Math.max(lowerTick, upperTick),
    tickLower: Math.min(lowerTick, upperTick),
    liquidity: res.liquidity,
    amountMaxA: new BN(new Decimal(inputAmount || '0').mul(10 ** poolInfo.mintA.decimals).toFixed(0)),
    amountMaxB: new BN(new Decimal(res.amountSlippageB.amount.toString()).mul(1 + slippage).toFixed(0)),
    ownerInfo: {
      useSOLBalance: true,
    },
    txVersion,
    nft2022: true,
    // optional: set up priority fee here
    computeBudgetConfig: {
      units: 600000,
      microLamports: 10000,
    },
  })

  printSimulate([transaction])
  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('clmm position opened:', { txId, nft: extInfo.address.nftMint.toBase58() })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// createPositionFromLiquidity()
