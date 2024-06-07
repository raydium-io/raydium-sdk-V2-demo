import { ApiV3PoolInfoConcentratedItem, RAYMint } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'
import { isValidClmm } from './utils'

export const setFarmRewards = async () => {
  const raydium = await initSdk()
  // note: please ensure you this is owned by yourself
  // note: api doesn't support get devnet pool info
  const data = await raydium.api.fetchPoolById({ ids: '364UXpiEuXbngVmd7oJWRKncewiRPm1ouLLLoHuewWkE' })
  const poolInfo = (data as any)[0] as ApiV3PoolInfoConcentratedItem
  if (!isValidClmm(poolInfo.programId)) throw new Error('target pool is not CLMM pool')

  const mint = await raydium.token.getTokenInfo(RAYMint.toBase58())
  const currentChainTime = await raydium.currentBlockChainTime()
  const openTime = Math.floor(currentChainTime / 1000) // in seconds
  const endTime = openTime + 60 * 60 * 24 * 7

  const editRewardInfos = [
    {
      mint,
      openTime,
      endTime,
      perSecond: new Decimal(1),
    },
  ]

  // this is to add more rewards to 'existing' farming reward
  const setRewardBuildData = await raydium.clmm.setRewards({
    poolInfo,
    rewardInfos: editRewardInfos,
    checkCreateATAOwner: true,
    ownerInfo: {
      useSOLBalance: true,
    },
    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 100000000,
    // },
  })

  const { txId } = await setRewardBuildData.execute()
  console.log('clmm farm created:', { txId })

  /** example below: if you want to combine edit reward and add new rewards in one tx  */
  /*
  const mint2 = await raydium.token.getTokenInfo(SOLMint.toBase58())
  const newRewardInfos = [
    {
      mint:mint2,
      openTime,
      endTime,
      perSecond: new Decimal(1),
    },
  ]

  const initRewardBuildData = await raydium.clmm.initRewards({
    poolInfo,
    ownerInfo: { useSOLBalance: true },
    checkCreateATAOwner: true,
    rewardInfos: newRewardInfos,
    txVersion
  })

  const {execute} = await setRewardBuildData.builder.addInstruction(initRewardBuildData.builder.AllTxData).build()
  const txId = await execute()
  console.log('edit and add more rewards to clmm farm', { txId })
  */
}

/** uncomment code below to execute */
// setFarmRewards()
