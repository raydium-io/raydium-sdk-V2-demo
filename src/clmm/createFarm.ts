import { ApiV3PoolInfoConcentratedItem, RAYMint } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'

export const createFarm = async () => {
  const raydium = await initSdk()
  // note: please ensure you this is owned by yourself
  const data = await raydium.api.fetchPoolById({ ids: '61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht' })
  const poolInfo = (data as any)[0] as ApiV3PoolInfoConcentratedItem

  const mint = await raydium.token.getTokenInfo(RAYMint.toBase58())
  const currentChainTime = await raydium.currentBlockChainTime()
  const openTime = Math.floor(currentChainTime / 1000) // in seconds
  const endTime = openTime + 60 * 60 * 24 * 7

  const newRewardInfos = [
    {
      mint,
      openTime,
      endTime,
      perSecond: new Decimal(1),
    },
  ]

  const { execute } = await raydium.clmm.initRewards({
    poolInfo,
    rewardInfos: newRewardInfos,
    checkCreateATAOwner: true,
    ownerInfo: {
      useSOLBalance: true,
    },
    txVersion,
  })

  const { txId } = await execute()
  console.log('clmm farm created:', { txId })
}

/** uncomment code below to execute */
// createFarm()
