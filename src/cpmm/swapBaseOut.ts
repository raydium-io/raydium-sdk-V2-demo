// Importing necessary modules and utilities from the Raydium SDK
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
import { PublicKey } from '@solana/web3.js'

/**
 * Executes a swap operation with a fixed output token amount.
 * Calculates the required input token amount for the swap.
 */
export const swapBaseOut = async () => {
  // Initialize the Raydium SDK
  const raydium = await initSdk()

  // Define the pool ID for the SOL-USDC pool
  const poolId = '7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny'

  // Define the desired output amount (e.g., 1 USDC)
  const outputAmount = new BN(1000000)
  const outputMint = USDCMint

  let poolInfo: ApiV3PoolInfoStandardItemCpmm
  let poolKeys: CpmmKeys | undefined
  let rpcData: CpmmRpcData

  if (raydium.cluster === 'mainnet') {
    // Fetch pool information from the API (mainnet only)
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
    if (!isValidCpmm(poolInfo.programId)) throw new Error('Target pool is not a CPMM pool')
    rpcData = await raydium.cpmm.getRpcPoolInfo(poolInfo.id, true)
  } else {
    // Fetch pool information from the RPC (for devnet or other clusters)
    const data = await raydium.cpmm.getPoolInfoFromRpc(poolId)
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
    rpcData = data.rpcData
  }

  // Validate that the output mint matches the pool's tokens
  if (outputMint.toBase58() !== poolInfo.mintA.address && outputMint.toBase58() !== poolInfo.mintB.address)
    throw new Error('Input mint does not match pool')

  const baseIn = outputMint.toBase58() === poolInfo.mintB.address

  // Calculate the swap result using the CurveCalculator
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
   * swapResult.sourceAmountSwapped -> Input amount
   * swapResult.destinationAmountSwapped -> Output amount
   * swapResult.tradeFee -> Swap fee charged on the input mint
   */

  // Execute the swap transaction
  const { execute, transaction } = await raydium.cpmm.swap({
    poolInfo,
    poolKeys,
    inputAmount: new BN(0), // If fixedOut is true, this argument won't be used
    fixedOut: true,
    swapResult: {
      sourceAmountSwapped: swapResult.amountIn,
      destinationAmountSwapped: outputAmount,
    },
    slippage: 0.001, // Slippage tolerance (e.g., 0.1%)
    baseIn,
    txVersion,
    // optional: set up priority fee here
    computeBudgetConfig: {
      units: 600000,
      microLamports: 465915,
    },

    // optional: add transfer sol to tip account instruction. e.g sent tip to jito
    // txTipConfig: {
    //   address: new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'),
    //   amount: new BN(10000000), // 0.01 sol
    // },
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
