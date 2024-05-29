import { ApiV3PoolInfoConcentratedItem } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'

export const closePosition = async () => {
  const raydium = await initSdk()
  // SOL-USDC pool
  // note: api doesn't support get devnet pool info
  const data = await raydium.api.fetchPoolById({ ids: '2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv' })
  const poolInfo = data[0] as ApiV3PoolInfoConcentratedItem
  if (!poolInfo) throw new Error('pool not found')

  /** code below will get on chain realtime price to avoid slippage error, uncomment it if necessary */
  // const rpcData = await raydium.clmm.getRpcClmmPoolInfo({ poolId: poolInfo.id })
  // poolInfo.price = rpcData.currentPrice

  const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: poolInfo.programId })
  if (!allPosition.length) throw new Error('use do not have position')

  const position = allPosition.find((p) => p.poolId.toBase58() === poolInfo.id)
  if (!position) throw new Error(`use do not have position in pool: ${poolInfo.id}`)

  const { execute } = await raydium.clmm.closePosition({
    poolInfo,
    ownerPosition: position,
    txVersion,
  })

  const { txId } = await execute()
  console.log('clmm position closed:', { txId })
}

/** uncomment code below to execute */
// closePosition()
