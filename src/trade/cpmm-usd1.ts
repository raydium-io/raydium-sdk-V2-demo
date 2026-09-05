import { initSdk } from "../config";
import { BasicPoolInfo, Raydium, Router, toApiV3Token, toFeeConfig, Token, TokenAmount, TxVersion, CpmmPoolInfoLayout } from '@raydium-io/raydium-sdk-v2'
import { NATIVE_MINT, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'


export async function routeSwap(raydium: Raydium, input: { pool: string, mint: string, amount: number }, sell = false) {
    await raydium.fetchChainTime()
    const SOL = NATIVE_MINT
    const [inputMint, outputMint] = sell ? [new PublicKey(input.mint), SOL] : [SOL, new PublicKey(input.mint)]
    const [inputMintStr, outputMintStr] = [inputMint.toBase58(), outputMint.toBase58()]

    const poolKey = new PublicKey(input.pool)
    const cpmmPoolAccount = await raydium.connection.getAccountInfo(poolKey)

    if (!cpmmPoolAccount) throw new Error(`cpmm pool ${poolKey.toBase58()} not found`)

    const cpmmPoolInfo = CpmmPoolInfoLayout.decode(cpmmPoolAccount.data)

    const cpmmPool = {
        id: poolKey,
        version: 7,
        mintA: cpmmPoolInfo.mintA,
        mintB: cpmmPoolInfo.mintB,
    }

    // const cpmmPool = {
    //     id: new PublicKey('6wB4BxHKEBsRYRj2sMWWDFmQrz3ubGgxLq28StuNVAiM'),
    //     version: 7,
    //     mintA: new PublicKey('USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'),
    //     mintB: new PublicKey('rnMLBLnUueJveGpLCS2BGsY3McJGRXZ8bqQ8eBWbonk'),
    // }

    const cpmmPools: BasicPoolInfo[] = [
        cpmmPool
    ]

    const clmmPools: BasicPoolInfo[] = [
        {
            id: new PublicKey('G8LqPHYAMcwP14CDgk9XsV9VdwpsW3aJ59VubwnyrJVr'),
            version: 6,
            mintA: new PublicKey('So11111111111111111111111111111111111111112'),
            mintB: new PublicKey('USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB'),
        }
    ]
    const routes = raydium.tradeV2.getAllRoute({
        inputMint,
        outputMint,
        clmmPools: clmmPools,
        ammPools: [],
        cpmmPools: cpmmPools,
    })

    console.log('routes: ', routes)

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

    const swapRoutes = raydium.tradeV2.getAllRouteComputeAmountOut({
        inputTokenAmount: new TokenAmount(
            new Token({
                mint: inputMintStr,
                decimals: mintInfos[inputMintStr].decimals,
                isToken2022: mintInfos[inputMintStr].programId.equals(TOKEN_2022_PROGRAM_ID),
            }),
            input.amount
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
        slippage: 0.30,
        epochInfo: await raydium.connection.getEpochInfo(),
    })

    console.log('swapRoutes', swapRoutes)

    const targetRoute = swapRoutes[0]

    if (!targetRoute) throw new Error('no swap routes were found')
    const poolKeys = await raydium.tradeV2.computePoolToPoolKeys({
        pools: targetRoute.poolInfoList,
        ammRpcData: ammPoolsRpcInfo,
        clmmRpcData: clmmPoolsRpcInfo,
    })
    const { transactions } = await raydium.tradeV2.swap({
        routeProgram: Router,
        txVersion: TxVersion.LEGACY,
        swapInfo: targetRoute,
        swapPoolKeys: poolKeys,
        ownerInfo: {
            associatedOnly: true,
            checkCreateATAOwner: true,
        },
    })

    return transactions.flatMap((t) => t.instructions)
}

async function buy() {
    const raydium = await initSdk()
    const transactions = await routeSwap(raydium, { pool: '6wB4BxHKEBsRYRj2sMWWDFmQrz3ubGgxLq28StuNVAiM', mint: 'rnMLBLnUueJveGpLCS2BGsY3McJGRXZ8bqQ8eBWbonk', amount: 1000000 })
    console.log(transactions)
    process.exit()
}

async function sell() {
    const raydium = await initSdk()
    const transactions = await routeSwap(raydium, { pool: '6wB4BxHKEBsRYRj2sMWWDFmQrz3ubGgxLq28StuNVAiM', mint: 'rnMLBLnUueJveGpLCS2BGsY3McJGRXZ8bqQ8eBWbonk', amount: 1000000 }, true)
    console.log(transactions)
    process.exit()
}

sell()