import {
  MARKET_STATE_LAYOUT_V3,
  AMM_V4,
  OPEN_BOOK_PROGRAM,
  FEE_DESTINATION_ID,
  DEVNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import { PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
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
  const baseAmount = new BN(1000)
  const quoteAmount = new BN(1000)

  if (
    baseMintInfo.programId !== TOKEN_PROGRAM_ID.toBase58() ||
    quoteMintInfo.programId !== TOKEN_PROGRAM_ID.toBase58()
  ) {
    throw new Error(
      'amm pools with openbook market only support TOKEN_PROGRAM_ID mints, if you want to create pool with token-2022, please create cpmm pool instead'
    )
  }

  if (baseAmount.mul(quoteAmount).lte(new BN(1).mul(new BN(10 ** baseMintInfo.decimals)).pow(new BN(2)))) {
    throw new Error('initial liquidity too low, try adding more baseAmount/quoteAmount')
  }

  const { execute, extInfo } = await raydium.liquidity.createPoolV4({
    programId: AMM_V4,
    // programId: DEVNET_PROGRAM_ID.AmmV4, // devnet
    marketInfo: {
      marketId,
      programId: OPEN_BOOK_PROGRAM,
      // programId: DEVNET_PROGRAM_ID.OPENBOOK_MARKET, // devent
    },
    baseMintInfo: {
      mint: baseMint,
      decimals: baseMintInfo.decimals, // if you know mint decimals here, can pass number directly
    },
    quoteMintInfo: {
      mint: quoteMint,
      decimals: quoteMintInfo.decimals, // if you know mint decimals here, can pass number directly
    },
    baseAmount: new BN(1000),
    quoteAmount: new BN(1000),

    // sol devnet faucet: https://faucet.solana.com/
    // baseAmount: new BN(4 * 10 ** 9), // if devent pool with sol/wsol, better use amount >= 4*10**9
    // quoteAmount: new BN(4 * 10 ** 9), // if devent pool with sol/wsol, better use amount >= 4*10**9

    startTime: new BN(0), // unit in seconds
    ownerInfo: {
      useSOLBalance: true,
    },
    associatedOnly: false,
    txVersion,
    feeDestinationId: FEE_DESTINATION_ID,
    // feeDestinationId: DEVNET_PROGRAM_ID.FEE_DESTINATION_ID, // devnet
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 4659150,
    // },
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log(
    'amm pool created! txId: ',
    txId,
    ', poolKeys:',
    Object.keys(extInfo.address).reduce(
      (acc, cur) => ({
        ...acc,
        [cur]: extInfo.address[cur as keyof typeof extInfo.address].toBase58(),
      }),
      {}
    )
  )
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// createAmmPool()
