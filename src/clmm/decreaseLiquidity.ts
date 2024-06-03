import { ApiV3PoolInfoConcentratedItem } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import { isValidClmm } from './utils'

export const decreaseLiquidity = async () => {
  const raydium = await initSdk()
  // SOL-USDC pool
  // note: api doesn't support get devnet pool info
  const data = await raydium.api.fetchPoolById({ ids: '2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv' })
  const poolInfo = data[0] as ApiV3PoolInfoConcentratedItem
  if (!isValidClmm(poolInfo.programId)) throw new Error('target pool is not CLMM pool')
  const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: poolInfo.programId })
  if (!allPosition.length) throw new Error('use do not have position')

  const position = allPosition.find((p) => p.poolId.toBase58() === poolInfo.id)
  if (!position) throw new Error(`use do not have position in pool: ${poolInfo.id}`)

  /** code below will get on chain realtime price to avoid slippage error, uncomment it if necessary */
  // const rpcData = await raydium.clmm.getRpcClmmPoolInfo({ poolId: poolInfo.id })
  // poolInfo.price = rpcData.currentPrice

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
