import { ApiV3PoolInfoStandardItem, RAYMint, FarmRewardInfo } from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { initSdk, txVersion } from '../config'

export const createAmmFarm = async () => {
  const raydium = await initSdk()
  // RAY-USDC pool
  // note: please ensure you this is owned by yourself
  const poolInfo = (
    await raydium.api.fetchPoolById({ ids: '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg' })
  )[0] as ApiV3PoolInfoStandardItem
  if (!poolInfo) throw new Error('pool not found')

  const rewardMint = await raydium.token.getTokenInfo(RAYMint)
  const currentChainTime = await raydium.currentBlockChainTime()
  const openTime = Math.floor(currentChainTime / 1000) // in seconds
  const endTime = openTime + 60 * 60 * 24 * 7

  // note: reward doesn't support 2022 mint at this moment
  const rewardInfos: FarmRewardInfo[] = [
    {
      mint: new PublicKey(rewardMint.address),
      perSecond: '1',
      openTime,
      endTime,
      rewardType: 'Standard SPL',
    },
  ]

  const { execute, extInfo, transaction } = await raydium.farm.create({
    poolInfo,
    rewardInfos,
    txVersion,
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log(
    'amm farm created:',
    { txId: `https://explorer.solana.com/tx/${txId}` },
    'farm id:',
    extInfo.farmId.toBase58()
  )
}

/** uncomment code below to execute */
// createAmmFarm()
