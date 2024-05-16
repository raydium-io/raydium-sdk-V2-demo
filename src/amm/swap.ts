import { ApiV3PoolInfoStandardItem, fetchMultipleInfo } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import BN from 'bn.js'

export const swap = async () => {
  const raydium = await initSdk()
  const amountIn = 10000
  const poolId = '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg'

  // RAY-USDC pool
  const data = (await raydium.api.fetchPoolById({ ids: poolId })) as any
  const poolInfo = data[0] as ApiV3PoolInfoStandardItem
  const poolKeys = await raydium.liquidity.getAmmPoolKeys(poolId)

  const res = await fetchMultipleInfo({
    connection: raydium.connection,
    poolKeysList: [poolKeys],
    config: undefined,
  })
  const pool = res[0]

  await raydium.liquidity.initLayout()
  const out = raydium.liquidity.computeAmountOut({
    poolInfo: {
      ...poolInfo,
      baseReserve: pool.baseReserve,
      quoteReserve: pool.quoteReserve,
    },
    amountIn: new BN(amountIn),
    mintIn: poolInfo.mintA.address,
    mintOut: poolInfo.mintB.address,
    slippage: 0.001,
  })

  const { execute } = await raydium.liquidity.swap({
    poolInfo,
    amountIn: new BN(amountIn),
    amountOut: out.amountOut,
    fixedSide: 'in',
    inputMint: poolInfo.mintA.address,
    associatedOnly: false,
    txVersion,
  })
  const { txId } = await execute()
  console.log(`swap ${poolInfo.mintA.symbol} -> ${poolInfo.mintB.symbol} in amm pool:`, { txId })
}

/** uncomment code below to execute */
// swap()
