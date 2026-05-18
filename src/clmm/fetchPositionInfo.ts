import {
  CLMM_PROGRAM_ID,
  getPdaPersonalPositionAddress,
  TickUtil,
  ApiV3PoolInfoConcentratedItem,
  PositionUtils,
  TickArrayLayout,
  U64_IGNORE_RANGE,
  ApiV3Token,
  PersonalPositionLayout,
  DEVNET_PROGRAM_ID,
  Raydium,
  LockClPositionLayoutV2,
  LiquidityMathUtil,
  TickArrayUtil,
  getPdaTickArrayAddress,
} from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import Decimal from 'decimal.js'
import BN from 'bn.js'
import { initSdk } from '../config'

export const fetchPositionInfo = async ({
  positionNftMint,
  positionData,
  raydium: propsRaydium,
  programId = CLMM_PROGRAM_ID,
  isLock = false,
  notExit,
}: {
  positionNftMint: PublicKey
  positionData?: ReturnType<typeof PersonalPositionLayout.decode>
  raydium?: Raydium
  programId?: PublicKey
  isLock?: boolean
  notExit?: boolean
}) => {
  const raydium = propsRaydium ?? (await initSdk())

  let position = positionData
  if (!position) {
    // devnet:  DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID
    const positionPubKey = isLock
      ? positionNftMint
      : getPdaPersonalPositionAddress(programId, positionNftMint).publicKey
    const pos = await raydium.connection.getAccountInfo(positionPubKey)
    if (!pos) {
      console.log(`${positionNftMint.toBase58()} position data not found`)
    }
    position = PersonalPositionLayout.decode(pos!.data)
  }

  // code below: get all clmm position in wallet
  // devnet:  DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID
  // const allPosition = await raydium.clmm.getOwnerPositionInfo({ programId: CLMM_PROGRAM_ID }) // devnet:  DEVNET_PROGRAM_ID.CLMM
  // if (!allPosition.length) throw new Error('use do not have position')
  // const position = allPosition[0]

  const poolInfo = (
    await raydium.api.fetchPoolById({ ids: position.poolId.toBase58() })
  )[0] as ApiV3PoolInfoConcentratedItem
  const { rpcPoolInfo } = await raydium.clmm.getPoolInfoFromRpc(position.poolId.toBase58())

  /** get position pooled amount and price range */
  const priceLower = TickUtil.tickToPrice(position.tickLower, poolInfo.mintA.decimals, poolInfo.mintB.decimals)
  const priceUpper = TickUtil.tickToPrice(position.tickUpper, poolInfo.mintA.decimals, poolInfo.mintB.decimals)

  const sqrtPriceX64 = TickUtil.priceToSqrtPriceX64(
    new Decimal(poolInfo.price),
    poolInfo.mintA.decimals,
    poolInfo.mintB.decimals,
  )

  const sqrtPriceX64A = TickUtil.getSqrtPriceAtTick(position.tickLower)
  const sqrtPriceX64B = TickUtil.getSqrtPriceAtTick(position.tickUpper)

  const { amountA, amountB } = LiquidityMathUtil.getAmountsForLiquidity(
    sqrtPriceX64,
    sqrtPriceX64A,
    sqrtPriceX64B,
    position.liquidity,
    false,
  )
  const [pooledAmountA, pooledAmountB] = [
    new Decimal(amountA.toString()).div(10 ** poolInfo.mintA.decimals),
    new Decimal(amountB.toString()).div(10 ** poolInfo.mintB.decimals),
  ]

  const [tickLowerArrayAddress, tickUpperArrayAddress] = [
    getTickArrayAddress({ pool: poolInfo, tickNumber: position.tickLower }),
    getTickArrayAddress({ pool: poolInfo, tickNumber: position.tickUpper }),
  ]

  const tickArrayRes = await raydium.connection.getMultipleAccountsInfo([tickLowerArrayAddress, tickUpperArrayAddress])
  if (!tickArrayRes[0] || !tickArrayRes[1]) throw new Error('tick data not found')
  const tickArrayLower = TickArrayLayout.decode(tickArrayRes[0].data)
  const tickArrayUpper = TickArrayLayout.decode(tickArrayRes[1].data)
  const tickLowerState =
    tickArrayLower.ticks[TickArrayUtil.getTickOffsetInArray(position.tickLower, poolInfo.config.tickSpacing)]
  const tickUpperState =
    tickArrayUpper.ticks[TickArrayUtil.getTickOffsetInArray(position.tickUpper, poolInfo.config.tickSpacing)]
  const rpcPoolData = await raydium.clmm.getRpcClmmPoolInfo({ poolId: position.poolId })
  const tokenFees = PositionUtils.GetPositionFees(rpcPoolData, position, tickLowerState, tickUpperState)
  const rewards = PositionUtils.GetPositionRewards(rpcPoolData, position, tickLowerState, tickUpperState)
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
        (r) => r.mint.address === rpcPoolInfo.rewardInfos[idx].mint.toBase58(),
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

  console.log(`${isLock ? 'Locked ' : ''}position info`, {
    pool: `${poolInfo.mintA.symbol} - ${poolInfo.mintB.symbol}`,
    nft: position.nftMint.toBase58(),
    priceLower: priceLower.toString(),
    priceUpper: priceUpper.toString(),
    pooledAmountA: pooledAmountA.toString(),
    pooledAmountB: pooledAmountB.toString(),
    rewardInfos: poolRewardInfos.map((r) => ({
      mint: r.mint.symbol.replace(/WSOL/gi, 'SOL'),
      amount: r.amount.toString(),
    })),
  })
  if (!notExit) process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// fetchPositionInfo({ positionNftMint: new PublicKey('position nft mint') })

const getTickArrayAddress = (props: { pool: ApiV3PoolInfoConcentratedItem; tickNumber: number }) => {
  const startIndex = TickArrayUtil.getTickArrayStartIndex(props.tickNumber, props.pool.config.tickSpacing)
  const { publicKey: tickArrayAddress } = getPdaTickArrayAddress(
    new PublicKey(props.pool.programId),
    new PublicKey(props.pool.id),
    startIndex,
  )
  return tickArrayAddress
}
