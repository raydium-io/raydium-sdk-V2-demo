import { ApiV3PoolInfoStandardItem, AmmV4Keys, AmmRpcData } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import BN from 'bn.js'
import { isValidAmm } from './utils'
import Decimal from 'decimal.js'
import { NATIVE_MINT } from '@solana/spl-token'
import { printSimulateInfo } from '../util'

export const swap = async () => {
  const raydium = await initSdk()
  const amountIn = 500
  const inputMint = NATIVE_MINT.toBase58()
  const poolId = '58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2' // SOL-USDC pool

  let poolInfo: ApiV3PoolInfoStandardItem | undefined
  let poolKeys: AmmV4Keys | undefined
  let rpcData: AmmRpcData

  if (raydium.cluster === 'mainnet') {
    // note: api doesn't support get devnet pool info, so in devnet else we go rpc method
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoStandardItem
    if (!isValidAmm(poolInfo.programId)) throw new Error('target pool is not AMM pool')
    poolKeys = await raydium.liquidity.getAmmPoolKeys(poolId)
    rpcData = await raydium.liquidity.getRpcPoolInfo(poolId)
  } else {
    // note: getPoolInfoFromRpc method only return required pool data for computing not all detail pool info
    const data = await raydium.liquidity.getPoolInfoFromRpc({ poolId })
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
    rpcData = data.poolRpcData
  }
  const [baseReserve, quoteReserve, status] = [rpcData.baseReserve, rpcData.quoteReserve, rpcData.status.toNumber()]

  if (poolInfo.mintA.address !== inputMint && poolInfo.mintB.address !== inputMint)
    throw new Error('input mint does not match pool')

  const baseIn = inputMint === poolInfo.mintA.address
  const [mintIn, mintOut] = baseIn ? [poolInfo.mintA, poolInfo.mintB] : [poolInfo.mintB, poolInfo.mintA]

  const out = raydium.liquidity.computeAmountOut({
    poolInfo: {
      ...poolInfo,
      baseReserve,
      quoteReserve,
      status,
      version: 4,
    },
    amountIn: new BN(amountIn),
    mintIn: mintIn.address,
    mintOut: mintOut.address,
    slippage: 0.01, // range: 1 ~ 0.0001, means 100% ~ 0.01%
  })

  console.log(
    `computed swap ${new Decimal(amountIn)
      .div(10 ** mintIn.decimals)
      .toDecimalPlaces(mintIn.decimals)
      .toString()} ${mintIn.symbol || mintIn.address} to ${new Decimal(out.amountOut.toString())
      .div(10 ** mintOut.decimals)
      .toDecimalPlaces(mintOut.decimals)
      .toString()} ${mintOut.symbol || mintOut.address}, minimum amount out ${new Decimal(out.minAmountOut.toString())
      .div(10 ** mintOut.decimals)
      .toDecimalPlaces(mintOut.decimals)} ${mintOut.symbol || mintOut.address}`
  )

  const { execute } = await raydium.liquidity.swap({
    poolInfo,
    poolKeys,
    amountIn: new BN(amountIn),
    amountOut: out.minAmountOut, // out.amountOut means amount 'without' slippage
    fixedSide: 'in',
    inputMint: mintIn.address,
    txVersion,

    // optional: set up token account
    // config: {
    //   inputUseSolBalance: true, // default: true, if you want to use existed wsol token account to pay token in, pass false
    //   outputUseSolBalance: true, // default: true, if you want to use existed wsol token account to receive token out, pass false
    //   associatedOnly: true, // default: true, if you want to use ata only, pass true
    // },

    // optional: set up priority fee here
    computeBudgetConfig: {
      units: 600000,
      microLamports: 100000000,
    },
  })

  printSimulateInfo()
  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log(`swap successfully in amm pool:`, { txId: `https://explorer.solana.com/tx/${txId}` })

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
swap()
