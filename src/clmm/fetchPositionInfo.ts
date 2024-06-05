import {
  CLMM_PROGRAM_ID,
  getPdaPersonalPositionAddress,
  TickUtils,
  ApiV3PoolInfoConcentratedItem,
  PositionUtils,
  TickArrayLayout,
  U64_IGNORE_RANGE,
  ApiV3Token,
  PositionInfoLayout,
} from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import Decimal from 'decimal.js'
import BN from 'bn.js'
import { initSdk } from '../config'

export const fetchPositionInfo = async () => {
  const raydium = await initSdk()
  const positionNftMint = new PublicKey('GQxt6TExLLZDQmrS3K4tmDn48yGhiWziVc1nQNmPcb5u')

  const positionPubKey = getPdaPersonalPositionAddress(CLMM_PROGRAM_ID, positionNftMint).publicKey
  const pos = await raydium.connection.getAccountInfo(positionPubKey)
  const position = PositionInfoLayout.decode(pos!.data)

  // code below: get all clmm position in wallet
  // const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: CLMM_PROGRAM_ID })
  // if (!allPosition.length) throw new Error('use do not have position')
  // const position = allPosition[0]

  const poolInfo = (
    await raydium.api.fetchPoolById({ ids: position.poolId.toBase58() })
  )[0] as ApiV3PoolInfoConcentratedItem

  const epochInfo = await raydium.connection.getEpochInfo()

  /** get position pooled amount and price range */
  const priceLower = TickUtils.getTickPrice({
    poolInfo,
    tick: position.tickLower,
    baseIn: true,
  })
  const priceUpper = TickUtils.getTickPrice({
    poolInfo,
    tick: position.tickUpper,
    baseIn: true,
  })
  const { amountA, amountB } = PositionUtils.getAmountsFromLiquidity({
    poolInfo,
    ownerPosition: position,
    liquidity: position.liquidity,
    slippage: 0,
    add: false,
    epochInfo,
  })
  const [pooledAmountA, pooledAmountB] = [
    new Decimal(amountA.amount.toString()).div(10 ** poolInfo.mintA.decimals),
    new Decimal(amountB.amount.toString()).div(10 ** poolInfo.mintB.decimals),
  ]

  const [tickLowerArrayAddress, tickUpperArrayAddress] = [
    TickUtils.getTickArrayAddressByTick(
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
      position.tickLower,
      poolInfo.config.tickSpacing
    ),
    TickUtils.getTickArrayAddressByTick(
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
      position.tickUpper,
      poolInfo.config.tickSpacing
    ),
  ]

  const tickArrayRes = await raydium.connection.getMultipleAccountsInfo([tickLowerArrayAddress, tickUpperArrayAddress])
  if (!tickArrayRes[0] || !tickArrayRes[1]) throw new Error('tick data not found')
  const tickArrayLower = TickArrayLayout.decode(tickArrayRes[0].data)
  const tickArrayUpper = TickArrayLayout.decode(tickArrayRes[1].data)
  const tickLowerState =
    tickArrayLower.ticks[TickUtils.getTickOffsetInArray(position.tickLower, poolInfo.config.tickSpacing)]
  const tickUpperState =
    tickArrayUpper.ticks[TickUtils.getTickOffsetInArray(position.tickUpper, poolInfo.config.tickSpacing)]
  const rpcPoolData = await raydium.clmm.getRpcClmmPoolInfo({ poolId: position.poolId })
  const tokenFees = PositionUtils.GetPositionFeesV2(rpcPoolData, position, tickLowerState, tickUpperState)
  const rewards = PositionUtils.GetPositionRewardsV2(rpcPoolData, position, tickLowerState, tickUpperState)

  const [tokenFeeAmountA, tokenFeeAmountB] = [
    tokenFees.tokenFeeAmountA.gte(new BN(0)) && tokenFees.tokenFeeAmountA.lt(U64_IGNORE_RANGE)
      ? tokenFees.tokenFeeAmountA
      : new BN(0),
    tokenFees.tokenFeeAmountB.gte(new BN(0)) && tokenFees.tokenFeeAmountB.lt(U64_IGNORE_RANGE)
      ? tokenFees.tokenFeeAmountB
      : new BN(0),
  ]
  const [rewardMintAFee, rewardMintBFee] = [
    {
      mint: poolInfo.mintA,
      amount: new Decimal(tokenFeeAmountA.toString())
        .div(10 ** poolInfo.mintA.decimals)
        .toDecimalPlaces(poolInfo.mintA.decimals),
    },
    {
      mint: poolInfo.mintB,
      amount: new Decimal(tokenFeeAmountB.toString())
        .div(10 ** poolInfo.mintB.decimals)
        .toDecimalPlaces(poolInfo.mintB.decimals),
    },
  ]

  const rewardInfos = rewards.map((r) => (r.gte(new BN(0)) && r.lt(U64_IGNORE_RANGE) ? r : new BN(0)))
  const poolRewardInfos = rewardInfos
    .map((r, idx) => {
      const rewardMint = poolInfo.rewardDefaultInfos.find(
        (r) => r.mint.address === rpcPoolData.rewardInfos[idx].tokenMint.toBase58()
      )?.mint

      if (!rewardMint) return undefined
      return {
        mint: rewardMint,
        amount: new Decimal(r.toString()).div(10 ** rewardMint.decimals).toDecimalPlaces(rewardMint.decimals),
      }
    })
    .filter(Boolean) as { mint: ApiV3Token; amount: Decimal }[]

  const feeARewardIdx = poolRewardInfos.findIndex((r) => r!.mint.address === poolInfo.mintA.address)
  if (poolRewardInfos[feeARewardIdx])
    poolRewardInfos[feeARewardIdx].amount = poolRewardInfos[feeARewardIdx].amount.add(rewardMintAFee.amount)
  else poolRewardInfos.push(rewardMintAFee)
  const feeBRewardIdx = poolRewardInfos.findIndex((r) => r!.mint.address === poolInfo.mintB.address)
  if (poolRewardInfos[feeBRewardIdx])
    poolRewardInfos[feeBRewardIdx].amount = poolRewardInfos[feeBRewardIdx].amount.add(rewardMintBFee.amount)
  else poolRewardInfos.push(rewardMintBFee)

  console.log('position info', {
    pool: `${poolInfo.mintA.symbol} - ${poolInfo.mintB.symbol}`,
    nft: position.nftMint.toBase58(),
    priceLower: priceLower.price.toString(),
    priceUpper: priceUpper.price.toString(),
    pooledAmountA: pooledAmountA.toString(),
    pooledAmountB: pooledAmountB.toString(),
    rewardInfos: poolRewardInfos.map((r) => ({
      mint: r.mint.symbol.replace(/WSOL/gi, 'SOL'),
      amount: r.amount.toString(),
    })),
  })
}

/** uncomment code below to execute */
fetchPositionInfo()
