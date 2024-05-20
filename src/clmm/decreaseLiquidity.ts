import { ApiV3PoolInfoConcentratedItem } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'

export const decreaseLiquidity = async () => {
  const raydium = await initSdk()
  // SOL-USDC pool
  const data = await raydium.api.fetchPoolById({ ids: '2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv' })
  const poolInfo = data[0] as ApiV3PoolInfoConcentratedItem

  const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: poolInfo.programId })
  if (!allPosition.length) throw new Error('use do not have position')

  const position = allPosition.find((p) => p.poolId.toBase58() === poolInfo.id)
  if (!position) throw new Error(`use do not have position in pool: ${poolInfo.id}`)

  const { execute } = await raydium.clmm.decreaseLiquidity({
    poolInfo,
    ownerPosition: position,
    ownerInfo: {
      useSOLBalance: true,
      closePosition: true, // if liquidity wants to decrease doesn't equal to position liquidity, set to false
    },
    liquidity: position.liquidity,
    amountMinA: new BN(0),
    amountMinB: new BN(0),
    txVersion,
  })

  const { txId } = await execute()
  console.log('withdraw liquidity from clmm position:', { txId })
}

/** uncomment code below to execute */
// decreaseLiquidity()
