import { RAYMint, USDCMint, OPEN_BOOK_PROGRAM } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'

export const createMarket = async () => {
  const raydium = await initSdk()

  // check mint info here: https://api-v3.raydium.io/mint/list
  // or get mint info by api: await raydium.token.getTokenInfo('mint address')

  const { execute, extInfo, transactions } = await raydium.marketV2.create({
    baseInfo: {
      mint: RAYMint,
      decimals: 6,
    },
    quoteInfo: {
      mint: USDCMint,
      decimals: 6,
    },
    lotSize: 1,
    tickSize: 0.01,
    dexProgramId: OPEN_BOOK_PROGRAM,
    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 6000,
    //   microLamports: 100000000,
    // },
  })

  console.log(`create market total ${transactions.length} txs, market info: `, extInfo.address)

  execute({
    // set sequentially to true means tx will be sent when previous one confirmed
    sequentially: true,
    onTxUpdate: (txInfoList) => {
      if (txInfoList.some((info) => info.status === 'error')) {
        console.log('create market failed')
        return
      }
      if (txInfoList.filter((info) => info.status === 'success').length === transactions.length) {
        console.log('create market success!')
        return
      }
      txInfoList.forEach((info, idx) => {
        console.log(`create market tx${idx + 1} status: ${info.status}, txId: ${info.txId}`)
      })
    },
  })
}

/** uncomment code below to execute */
// createMarket()
