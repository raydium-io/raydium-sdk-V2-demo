import { ApiV3PoolInfoStandardItem } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import BN from 'bn.js'
import { isValidAmm } from './utils'

export const withdrawLiquidity = async () => {
  const raydium = await initSdk()
  // RAY-USDC pool
  // note: api doesn't support get devnet pool info
  const data = await raydium.api.fetchPoolById({ ids: '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg' })
  const poolInfo = data[0] as ApiV3PoolInfoStandardItem

  if (!isValidAmm(poolInfo.programId)) throw new Error('target pool is not AMM pool')

  const { execute } = await raydium.liquidity.removeLiquidity({
    poolInfo,
    amountIn: new BN(1),
    txVersion,
  })

  const { txId } = await execute()
  console.log('liquidity withdraw:', { txId })
}

/** uncomment code below to execute */
// withdrawLiquidity()
