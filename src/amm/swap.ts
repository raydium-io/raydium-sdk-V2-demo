import { ApiV3PoolInfoStandardItem, fetchMultipleInfo } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import BN from 'bn.js'
import { isValidAmm } from './utils'

export const swap = async () => {
  const raydium = await initSdk()
  const amountIn = 100
  const poolId = 'FCEnSxyJfRSKsz6tASUENCsfGwKgkH6YuRn1AMmyHhZn'

  // RAY-USDC pool
  // note: api doesn't support get devnet pool info
  const data = (await raydium.api.fetchPoolById({ ids: poolId })) as any
  const poolInfo = data[0] as ApiV3PoolInfoStandardItem

  if (!isValidAmm(poolInfo.programId)) throw new Error('target pool is not AMM pool')
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
      status: pool.status.toNumber(),
      version: 4,
    },
    amountIn: new BN(amountIn),
    mintIn: poolInfo.mintA.address, // swap mintB -> mintA, use: poolInfo.mintB.address
    mintOut: poolInfo.mintB.address, // swap mintB -> mintA, use: poolInfo.mintA.address
    slippage: 0.01, // range: 1 ~ 0.0001, means 100% ~ 0.01%
  })

  const { execute } = await raydium.liquidity.swap({
    poolInfo,
    amountIn: new BN(amountIn),
    amountOut: out.minAmountOut, // out.amountOut means amount 'without' slippage
    fixedSide: 'in',
    inputMint: poolInfo.mintA.address, // swap mintB -> mintA, use: poolInfo.mintB.address
    associatedOnly: false,
    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 100000000,
    // },
  })

  const { txId } = await execute()
  console.log(`swap successfully in amm pool:`, { txId })
}

/** uncomment code below to execute */
// swap()
