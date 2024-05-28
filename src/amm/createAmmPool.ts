import { MARKET_STATE_LAYOUT_V3, AMM_V4, OPEN_BOOK_PROGRAM } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

export const createAmmPool = async () => {
  const raydium = await initSdk()
  const marketId = new PublicKey(`<you market id here>`)

  // if you are confirmed your market info, don't have to get market info from rpc below
  const marketBufferInfo = await raydium.connection.getAccountInfo(new PublicKey(marketId))
  const { baseMint, quoteMint } = MARKET_STATE_LAYOUT_V3.decode(marketBufferInfo!.data)

  // check mint info here: https://api-v3.raydium.io/mint/list
  // or get mint info by api: await raydium.token.getTokenInfo('mint address')

  const baseMintInfo = await raydium.token.getTokenInfo(baseMint)
  const quoteMintInfo = await raydium.token.getTokenInfo(quoteMint)

  const { execute, extInfo, transaction } = await raydium.liquidity.createPoolV4({
    programId: AMM_V4,
    marketInfo: {
      marketId,
      programId: OPEN_BOOK_PROGRAM,
    },
    baseMintInfo: {
      mint: baseMint,
      decimals: baseMintInfo.decimals, // if you know mint decimals here, can pass number directly
    },
    quoteMintInfo: {
      mint: quoteMint,
      decimals: quoteMintInfo.decimals, // if you know mint decimals here, can pass number directly
    },
    baseAmount: new BN(100),
    quoteAmount: new BN(100),
    startTime: new BN(0),
    ownerInfo: {
      useSOLBalance: true,
    },
    associatedOnly: false,
    txVersion,
    feeDestinationId: new PublicKey('7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5'),
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 10000000,
    // },
  })

  // const { txId } = await execute()
  // console.log('amm pool created! txId: ', txId)
}

/** uncomment code below to execute */
// createAmmPool()
