import { RAYMint, USDCMint, OPEN_BOOK_PROGRAM, DEVNET_PROGRAM_ID, WSOLMint } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'

export const createMarket = async () => {
  const raydium = await initSdk()

  // check mint info here: https://api-v3.raydium.io/mint/list
  // or get mint info by api: await raydium.token.getTokenInfo('mint address')

  const { execute, extInfo, transactions } = await raydium.marketV2.create({
    baseInfo: {
      // create market doesn't support token 2022
      mint: RAYMint,
      decimals: 6,
    },
    quoteInfo: {
      // create market doesn't support token 2022
      mint: USDCMint,
      decimals: 9,
    },
    lotSize: 1,
    tickSize: 0.01,
    dexProgramId: OPEN_BOOK_PROGRAM,
    // dexProgramId: DEVNET_PROGRAM_ID.OPENBOOK_MARKET, // devnet

    // requestQueueSpace: 5120 + 12, // optional
    // eventQueueSpace: 262144 + 12, // optional
    // orderbookQueueSpace: 65536 + 12, // optional

    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 46591500,
    // },
  })

  console.log(
    `create market total ${transactions.length} txs, market info: `,
    Object.keys(extInfo.address).reduce(
      (acc, cur) => ({
        ...acc,
        [cur]: extInfo.address[cur as keyof typeof extInfo.address].toBase58(),
      }),
      {}
    )
  )

  const txIds = await execute({
    // set sequentially to true means tx will be sent when previous one confirmed
    sequentially: true,
  })

  console.log(
    'note: create market does not support token 2022, if you need more detail error info, set txVersion to TxVersion.LEGACY'
  )
  console.log('create market txIds:', txIds)
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// createMarket()
