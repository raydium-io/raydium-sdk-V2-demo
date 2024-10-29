import {
  ApiV3PoolInfoStandardItem,
  TokenAmount,
  toToken,
  Percent,
  AmmV4Keys,
  AmmV5Keys,
  printSimulate,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import { isValidAmm } from './utils'
import Decimal from 'decimal.js'
import BN from 'bn.js'

export const addLiquidity = async () => {
  const raydium = await initSdk()

  // RAY-USDC pool
  const poolId = '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg'
  let poolKeys: AmmV4Keys | AmmV5Keys | undefined
  let poolInfo: ApiV3PoolInfoStandardItem

  if (raydium.cluster === 'mainnet') {
    // note: api doesn't support get devnet pool info, so in devnet else we go rpc method
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoStandardItem
  } else {
    // note: getPoolInfoFromRpc method only return required pool data for computing not all detail pool info
    const data = await raydium.liquidity.getPoolInfoFromRpc({ poolId })
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
  }

  if (!isValidAmm(poolInfo.programId)) throw new Error('target pool is not AMM pool')

  const inputAmount = '1'

  const r = raydium.liquidity.computePairAmount({
    poolInfo,
    amount: inputAmount,
    baseIn: true,
    slippage: new Percent(1, 100), // 1%
  })

  const { execute, transaction } = await raydium.liquidity.addLiquidity({
    poolInfo,
    poolKeys,
    amountInA: new TokenAmount(
      toToken(poolInfo.mintA),
      new Decimal(inputAmount).mul(10 ** poolInfo.mintA.decimals).toFixed(0)
    ),
    amountInB: new TokenAmount(
      toToken(poolInfo.mintB),
      new Decimal(r.maxAnotherAmount.toExact()).mul(10 ** poolInfo.mintA.decimals).toFixed(0)
    ),
    otherAmountMin: r.minAnotherAmount,
    fixedSide: 'a',
    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 100000000,
    // },
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('liquidity added:', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// addLiquidity()
