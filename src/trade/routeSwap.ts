import {
  USDCMint,
  toFeeConfig,
  toApiV3Token,
  Router,
  TokenAmount,
  Token,
  DEVNET_PROGRAM_ID,
  printSimulate,
  setLoggerLevel,
  LogLevel,
} from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { NATIVE_MINT, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { initSdk, txVersion } from '../config'
import { readCachePoolData, writeCachePoolData } from '../cache/utils'
import { printSimulateInfo } from '../util'

const poolType: Record<number, string> = {
  4: 'AMM',
  5: 'AMM Stable',
  6: 'CLMM',
  7: 'CPMM',
}

setLoggerLevel('Raydium_tradeV2', LogLevel.Debug)

async function routeSwap() {
  const raydium = await initSdk()
  await raydium.fetchChainTime()

  const inputAmount = '8000000'
  const SOL = NATIVE_MINT // or WSOLMint
  const [inputMint, outputMint] = [SOL, new PublicKey('7i5XE77hnx1a6hjWgSuYwmqdmLoDJNTU1rYA6Gqx7QiE')]
  const [inputMintStr, outputMintStr] = [inputMint.toBase58(), outputMint.toBase58()]

  // strongly recommend cache all pool data, it will reduce lots of data fetching time
  // code below is a simple way to cache it, you can implement it with any other ways
  // let poolData = readCachePoolData() // initial cache time is 10 mins(1000 * 60 * 10), if wants to cache longer, set bigger number in milliseconds
  let poolData = readCachePoolData(1000 * 60 * 60 * 24 * 10) // example for cache 1 day
  if (poolData.ammPools.length === 0) {
    console.log(
      '**Please ensure you are using "paid" rpc node or you might encounter fetch data error due to pretty large pool data**'
    )
    console.log('fetching all pool basic info, this might take a while (more than 1 minutes)..')
    poolData = await raydium.tradeV2.fetchRoutePoolBasicInfo()
    // devent pool info
    // fetchRoutePoolBasicInfo({
    //   amm: DEVNET_PROGRAM_ID.AmmV4,
    //   clmm: DEVNET_PROGRAM_ID.CLMM,
    //   cpmm: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
    // })
    writeCachePoolData(poolData)
  }

  console.log('computing swap route..')
  // route here also can cache for a time period by pair to reduce time
  // e.g.{inputMint}-${outputMint}'s routes, if poolData don't change, routes should be almost same
  const routes = raydium.tradeV2.getAllRoute({
    inputMint,
    outputMint,
    ...poolData,
  })

  // data here also can try to cache if you wants e.g. mintInfos
  // but rpc related info doesn't suggest to cache it for a long time, because base/quote reserve and pool price change by time
  const {
    routePathDict,
    mintInfos,
    ammPoolsRpcInfo,
    ammSimulateCache,

    clmmPoolsRpcInfo,
    computeClmmPoolInfo,
    computePoolTickData,

    computeCpmmData,
  } = await raydium.tradeV2.fetchSwapRoutesData({
    routes,
    inputMint,
    outputMint,
  })

  console.log('calculating available swap routes...')
  const swapRoutes = raydium.tradeV2.getAllRouteComputeAmountOut({
    inputTokenAmount: new TokenAmount(
      new Token({
        mint: inputMintStr,
        decimals: mintInfos[inputMintStr].decimals,
        isToken2022: mintInfos[inputMintStr].programId.equals(TOKEN_2022_PROGRAM_ID),
      }),
      inputAmount
    ),
    directPath: routes.directPath.map(
      (p) =>
        ammSimulateCache[p.id.toBase58()] || computeClmmPoolInfo[p.id.toBase58()] || computeCpmmData[p.id.toBase58()]
    ),
    routePathDict,
    simulateCache: ammSimulateCache,
    tickCache: computePoolTickData,
    mintInfos: mintInfos,
    outputToken: toApiV3Token({
      ...mintInfos[outputMintStr],
      programId: mintInfos[outputMintStr].programId.toBase58(),
      address: outputMintStr,
      freezeAuthority: undefined,
      mintAuthority: undefined,
      extensions: {
        feeConfig: toFeeConfig(mintInfos[outputMintStr].feeConfig),
      },
    }),
    chainTime: Math.floor(raydium.chainTimeData?.chainTime ?? Date.now() / 1000),
    slippage: 0.005, // range: 1 ~ 0.0001, means 100% ~ 0.01%
    epochInfo: await raydium.connection.getEpochInfo(),
  })

  // swapRoutes are sorted by out amount, so first one should be the best route
  const targetRoute = swapRoutes[0]
  if (!targetRoute) throw new Error('no swap routes were found')

  console.log('best swap route:', {
    input: targetRoute.amountIn.amount.toExact(),
    output: targetRoute.amountOut.amount.toExact(),
    minimumOut: targetRoute.minAmountOut.amount.toExact(),
    swapType: targetRoute.routeType,
    routes: targetRoute.poolInfoList.map((p) => `${poolType[p.version]} ${p.id} ${(p as any).status}`).join(` -> `),
  })

  console.log('fetching swap route pool keys..')
  const poolKeys = await raydium.tradeV2.computePoolToPoolKeys({
    pools: targetRoute.poolInfoList,
    ammRpcData: ammPoolsRpcInfo,
    clmmRpcData: clmmPoolsRpcInfo,
  })

  console.log('build swap tx..')
  const { execute, transactions } = await raydium.tradeV2.swap({
    routeProgram: Router,
    txVersion,
    swapInfo: targetRoute,
    swapPoolKeys: poolKeys,
    ownerInfo: {
      associatedOnly: true,
      checkCreateATAOwner: true,
    },
    computeBudgetConfig: {
      units: 600000,
      microLamports: 465915,
    },
  })

  // printSimulate(transactions)

  printSimulateInfo()
  console.log('execute tx..')
  // sequentially should always to be true because first tx does initialize token accounts needed for swap
  const { txIds } = await execute({ sequentially: true })
  console.log('txIds:', txIds)
  txIds.forEach((txId) => console.log(`https://explorer.solana.com/tx/${txId}`))

  process.exit() // if you don't want to end up node execution, comment this line
}
/** uncomment code below to execute */
// routeSwap()
