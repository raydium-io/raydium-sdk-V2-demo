import {
  ApiV3PoolInfoStandardItem,
  TokenAmount,
  toToken,
  Percent,
  AmmV4Keys,
  AmmV5Keys,
  printSimulate,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import { isValidAmm } from './utils'
import Decimal from 'decimal.js'
import BN from 'bn.js'
import { PublicKey } from '@solana/web3.js'

/**
 * Adds liquidity to a specified Raydium AMM pool (RAY-USDC in this example).
 */
export const addLiquidity = async () => {
  const raydium = await initSdk()

  // Configuration for the target pool
  const poolId = '6UmmUiYoBjSrhakAobJw8BvkmJtDVxaeBtbt7rxWo1mg' // RAY-USDC Pool ID
  
  let poolKeys: AmmV4Keys | AmmV5Keys | undefined
  let poolInfo: ApiV3PoolInfoStandardItem | undefined

  // 1. Fetch Pool Information
  if (raydium.cluster === 'mainnet') {
    // On mainnet, fetch comprehensive pool details from the Raydium API.
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0]
  } else {
    // On devnet/testnet, fetch minimal pool data directly from the RPC node.
    const data = await raydium.liquidity.getPoolInfoFromRpc({ poolId })
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
  }

  // Ensure pool data was successfully fetched
  if (!poolInfo) {
    throw new Error(`Failed to fetch pool information for ID: ${poolId}`)
  }

  // Validate the pool type
  if (!isValidAmm(poolInfo.programId)) {
    throw new Error('Target pool is not a valid AMM pool.')
  }

  // The amount of the fixed side token (Mint A) to input (human-readable format).
  const inputAmountHuman = '1' 

  // 2. Compute the required output amount (Mint B) based on slippage
  const computedAmounts = raydium.liquidity.computePairAmount({
    poolInfo,
    amount: inputAmountHuman,
    baseIn: true, // Use Mint A (RAY) as the input token
    slippage: new Percent(1, 100), // 1% maximum slippage tolerance
  })
  
  // Calculate the amount of Mint B required, ensuring the fixed amount is correctly scaled.
  const amountA = new Decimal(inputAmountHuman)
    .mul(new Decimal(10).pow(poolInfo.mintA.decimals))
    .toFixed(0) // Scale input amount to base units
    
  // Calculate the maximum amount of Mint B to deposit, scaled to base units.
  const amountBMax = new Decimal(computedAmounts.maxAnotherAmount.toExact())
    .mul(new Decimal(10).pow(poolInfo.mintB.decimals))
    .toFixed(0)

  // 3. Prepare and Execute the Transaction
  const { execute, transaction } = await raydium.liquidity.addLiquidity({
    poolInfo,
    poolKeys, // Required for non-mainnet or specific logic, passed if available.
    
    // Amount of token A to deposit (scaled to base units)
    amountInA: new TokenAmount(toToken(poolInfo.mintA), amountA),
    
    // Maximum amount of token B to deposit (scaled to base units)
    amountInB: new TokenAmount(toToken(poolInfo.mintB), amountBMax),
    
    // The minimum amount of the other token (Mint B) that must be received to prevent slippage.
    otherAmountMin: computedAmounts.minAnotherAmount,
    
    fixedSide: 'a', // Mint A is the fixed input amount
    txVersion,
    
    // optional: set up priority fee here (Jito tip example)
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 46591500,
    // },
  })

  // Execute the transaction and wait for confirmation
  const { txId } = await execute({ sendAndConfirm: true })
  
  console.log('Liquidity successfully added.')
  console.log(`Transaction ID: https://explorer.solana.com/tx/${txId}`)
  
  // Exit the process cleanly if running as a standalone script
  // process.exit() 
}

/** uncomment code below to execute */
// addLiquidity()
