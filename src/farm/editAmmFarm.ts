import { USDCMint, FarmRewardInfo } from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { initSdk, txVersion } from '../config'

export const editAmmFarm = async () => {
  const raydium = await initSdk()

  // RAY-USDC farm
  const farmId = '3f7UP66ZtrRgpd3z39WfM9oiRVKV9uiZWABTsWG76Zqy'
  // note: please ensure you this is owned by yourself, not support devnet
  const farmInfo = (await raydium.api.fetchFarmInfoById({ ids: farmId }))[0]
  if (!farmInfo) throw new Error('farm not found')

  // existing reward mint
  const rewardMint = await raydium.token.getTokenInfo(farmInfo.rewardInfos[0].mint.address)
  const currentChainTime = await raydium.currentBlockChainTime()
  const openTime = Math.floor(currentChainTime / 1000) // in seconds
  const endTime = openTime + 60 * 60 * 24 * 7
  // note: reward doesn't support 2022 mint at this moment
  const newRewardInfos: FarmRewardInfo[] = [
    {
      mint: new PublicKey(rewardMint.address),
      perSecond: '1',
      openTime,
      endTime,
      rewardType: 'Standard SPL',
    },
  ]

  const editFarmBuilder = await raydium.farm.restartRewards({
    farmInfo,
    newRewardInfos,
    txVersion,
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await editFarmBuilder.execute({ sendAndConfirm: true })
  console.log('amm farm reward edited:', { txId: `https://explorer.solana.com/tx/${txId}` })

  /** example below: if you want to edit reward and add new rewards in one tx  */
  /*
  const rewardAddedMint = await raydium.token.getTokenInfo(USDCMint)
  const newAddedRewardInfos: FarmRewardInfo[] = [
    {
      mint: new PublicKey(rewardAddedMint.address),
      perSecond: '1',
      openTime,
      endTime,
      rewardType: 'Standard SPL',
    },
  ]
  const addNewRewardBuildData = await raydium.farm.addNewRewardsToken({
    farmInfo,
    newRewardInfos: newAddedRewardInfos,
    txVersion,
  })

  editFarmBuilder.builder.addInstruction(addNewRewardBuildData.builder.AllTxData)
  const { execute } = await editFarmBuilder.builder.versionBuild({ txVersion })
  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await editFarmBuilder.execute({ sendAndConfirm: true })
  console.log('amm farm reward edited and added:', { txId })
  */
}

/** uncomment code below to execute */
editAmmFarm()
