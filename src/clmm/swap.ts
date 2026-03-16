import {
  ApiV3PoolInfoConcentratedItem,
  ClmmKeys,
  ComputeClmmPoolInfo,
  PoolUtils,
  ReturnTypeFetchMultiplePoolTickArrays,
  RAYMint,
  swapInternal,
  TickArrayLayout,
  getPdaExBitmapAccount,
  TickArrayBitmapUtil,
  TickArrayBitmapExtensionLayout,
  getMultipleAccountsInfo,
  fetchTickArrays,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import { isValidClmm } from './utils'
import { printSimulateInfo } from '../util'
import { PublicKey } from '@solana/web3.js'

export const swap = async () => {
  const raydium = await initSdk()
  let poolInfo: ApiV3PoolInfoConcentratedItem
  // RAY-USDC pool
  const poolId = 'DiwsGxJYoRZURvyCtMsJVyxR86yZBBbSYeeWNm7YCmT6'
  const inputMint = RAYMint.toBase58()
  let poolKeys: ClmmKeys | undefined
  let clmmPoolInfo: ComputeClmmPoolInfo
  let tickCache: ReturnTypeFetchMultiplePoolTickArrays

  const inputAmount = new BN(1000000)

  if (raydium.cluster === 'mainnet') {
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoConcentratedItem
    if (!isValidClmm(poolInfo.programId)) throw new Error('target pool is not CLMM pool')

    clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
      connection: raydium.connection,
      poolInfo,
    })
    tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
      connection: raydium.connection,
      poolKeys: [clmmPoolInfo],
    })
  } else {
    const data = await raydium.clmm.getPoolInfoFromRpc(poolId)
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
    clmmPoolInfo = data.computePoolInfo
    tickCache = data.tickData
  }

  if (inputMint !== poolInfo.mintA.address && inputMint !== poolInfo.mintB.address)
    throw new Error('input mint does not match pool')

  const baseIn = inputMint === poolInfo.mintA.address

  const tickArrayBitmapExtension = getPdaExBitmapAccount(clmmPoolInfo.programId, clmmPoolInfo.id).publicKey
  const tickArrayBitmapExtensionRes = await raydium.connection.getAccountInfo(tickArrayBitmapExtension)

  const tickArrays = await fetchTickArrays(
    clmmPoolInfo.programId,
    raydium.connection,
    clmmPoolInfo.id,
    clmmPoolInfo.tickCurrent,
    clmmPoolInfo.tickCurrent,
    clmmPoolInfo.tickArrayBitmap,
  )

  const simulation = swapInternal({
    programId: clmmPoolInfo.programId,
    poolId: clmmPoolInfo.id,
    poolInfo: clmmPoolInfo.accInfo,
    tickArrays,
    configInfo: {
      ...clmmPoolInfo.ammConfig,
      fundOwner: new PublicKey(clmmPoolInfo.ammConfig.fundOwner),
      owner: PublicKey.default,
      bump: 0,
    },
    tickarrayBitmapExtension: TickArrayBitmapExtensionLayout.decode(tickArrayBitmapExtensionRes!.data),
    amountSpecified: inputAmount,
    sqrtPriceLimitX64: clmmPoolInfo.accInfo.sqrtPriceX64,
    zeroForOne: baseIn, // sell A for B,
    isBaseInput: true, // isBaseInput = false for exact output,
    blockTimestamp: Math.floor(Date.now() / 1000),
    includeExtraTickArrays: true,
  })

  const { execute } = await raydium.clmm.swap({
    poolInfo,
    poolKeys,
    inputMint: poolInfo[baseIn ? 'mintA' : 'mintB'].address,
    amountIn: inputAmount,
    amountOutMin: simulation.amountCalculated,
    observationId: clmmPoolInfo.observationId,
    ownerInfo: {
      useSOLBalance: true, // if wish to use existed wsol token account, pass false
    },
    remainingAccounts: simulation.accounts,
    txVersion,

    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 465915,
    // },

    // optional: add transfer sol to tip account instruction. e.g sent tip to jito
    // txTipConfig: {
    //   address: new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'),
    //   amount: new BN(10000000), // 0.01 sol
    // },
  })

  printSimulateInfo()
  // const { txId } = await execute()
  // console.log('swapped in clmm pool:', { txId: `https://explorer.solana.com/tx/${txId}` })
  // process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
swap()
