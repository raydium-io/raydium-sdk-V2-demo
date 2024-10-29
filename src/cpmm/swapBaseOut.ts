import {
  ApiV3PoolInfoStandardItemCpmm,
  CpmmKeys,
  CpmmRpcData,
  CurveCalculator,
  USDCMint,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import BN from 'bn.js'
import { isValidCpmm } from './utils'
import { NATIVE_MINT } from '@solana/spl-token'
import { printSimulateInfo } from '../util'

// swapBaseOut means fixed output token amount, calculate needed input token amount
export const swapBaseOut = async () => {
  const raydium = await initSdk()

  // SOL - USDC pool
  const poolId = '7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny'

  // means want to buy 1 USDC
  const outputAmount = new BN(1000000)
  const outputMint = USDCMint

  let poolInfo: ApiV3PoolInfoStandardItemCpmm
  let poolKeys: CpmmKeys | undefined
  let rpcData: CpmmRpcData

  if (raydium.cluster === 'mainnet') {
    // note: api doesn't support get devnet pool info, so in devnet else we go rpc method
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
    if (!isValidCpmm(poolInfo.programId)) throw new Error('target pool is not CPMM pool')
    rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true)
  } else {
    const data = await raydium.cpmm.getPoolInfoFromRpc(poolId)
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
    rpcData = data.rpcData
  }

  if (outputMint.toBase58() !== poolInfo.mintA.address && outputMint.toBase58() !== poolInfo.mintB.address)
    throw new Error('input mint does not match pool')

  const baseIn = outputMint.toBase58() === poolInfo.mintB.address

  // swap pool mintA for mintB
  const swapResult = CurveCalculator.swapBaseOut({
    poolMintA: poolInfo.mintA,
    poolMintB: poolInfo.mintB,
    tradeFeeRate: rpcData.configInfo!.tradeFeeRate,
    baseReserve: rpcData.baseReserve,
    quoteReserve: rpcData.quoteReserve,
    outputMint,
    outputAmount,
  })

  /**
   * swapResult.sourceAmountSwapped -> input amount
   * swapResult.destinationAmountSwapped -> output amount
   * swapResult.tradeFee -> this swap fee, charge input mint
   */

  const { execute, transaction } = await raydium.cpmm.swap({
    poolInfo,
    poolKeys,
    inputAmount: new BN(0), // if set fixedOut to true, this arguments won't be used
    fixedOut: true,
    swapResult: {
      sourceAmountSwapped: swapResult.amountIn,
      destinationAmountSwapped: outputAmount,
    },
    slippage: 0.001, // range: 1 ~ 0.0001, means 100% ~ 0.01%
    baseIn,
    txVersion,
    // optional: set up priority fee here
    computeBudgetConfig: {
      units: 600000,
      microLamports: 1000000,
    },
  })

  printSimulateInfo()
  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log(`swapped: ${poolInfo.mintA.symbol} to ${poolInfo.mintB.symbol}:`, {
    txId: `https://explorer.solana.com/tx/${txId}`,
  })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// swapBaseOut()
