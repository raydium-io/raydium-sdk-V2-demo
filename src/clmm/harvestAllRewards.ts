import { ApiV3PoolInfoConcentratedItem, CLMM_PROGRAM_ID, ClmmPositionLayout } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'

export const harvestAllRewards = async () => {
  const raydium = await initSdk()

  const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: CLMM_PROGRAM_ID })
  const nonZeroPosition = allPosition.filter((p) => !p.liquidity.isZero())
  if (!nonZeroPosition.length) throw new Error('use do not have position')

  // RAY-USDC pool
  const positionPoolInfoList = (await raydium.api.fetchPoolById({
    ids: nonZeroPosition.map((p) => p.poolId.toBase58()).join(','),
  })) as ApiV3PoolInfoConcentratedItem[]

  const allPositions = nonZeroPosition.reduce(
    (acc, cur) => ({
      ...acc,
      [cur.poolId.toBase58()]: acc[cur.poolId.toBase58()] ? acc[cur.poolId.toBase58()].concat(cur) : [cur],
    }),
    {} as Record<string, ClmmPositionLayout[]>
  )

  const { execute } = await raydium.clmm.harvestAllRewards({
    allPoolInfo: positionPoolInfoList.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.id]: cur,
      }),
      {}
    ),
    allPositions,
    ownerInfo: {
      useSOLBalance: true,
    },
    programId: CLMM_PROGRAM_ID,
    txVersion,
  })

  const { txIds } = await execute()
  console.log('harvested all clmm rewards:', { txIds })
}

/** uncomment code below to execute */
// harvestAllRewards()
