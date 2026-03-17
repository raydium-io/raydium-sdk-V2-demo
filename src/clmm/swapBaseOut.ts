import {
  ClmmKeys,
  getPdaExBitmapAccount,
  printSimulate,
  swapInternal,
  TickArrayBitmapExtensionLayout,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'

import { PublicKey } from '@solana/web3.js'
import { formatBN } from '../util'

// swapBaseOut means fixed output token amount, calculate needed input token amount
export const swapBaseOut = async () => {
  const raydium = await initSdk()
  const poolId = 'pool id'
  let poolKeys: ClmmKeys | undefined
  const zeroForOne = true // sell pool mint A for B
  const amountOut = zeroForOne ? new BN(1_000_000_000) : new BN(1_000_000)

  const { poolInfo, rpcData, configInfo, tickArrays } = await raydium.clmm.getSwapPoolInfo(poolId, zeroForOne)
  const [programId, poolIdPub] = [new PublicKey(poolInfo.programId), new PublicKey(poolInfo.id)]
  const [inputMint, outputMint, inputDecimals, outputDecimals] = zeroForOne
    ? [poolInfo.mintA.address, poolInfo.mintB.address, poolInfo.mintA.decimals, poolInfo.mintB.decimals]
    : [poolInfo.mintB.address, poolInfo.mintA.address, poolInfo.mintB.decimals, poolInfo.mintA.decimals]

  const tickArrayBitmapExtension = getPdaExBitmapAccount(programId, poolIdPub).publicKey
  const tickArrayBitmapExtensionRes = await raydium.connection.getAccountInfo(tickArrayBitmapExtension)

  const simulation = swapInternal({
    programId,
    poolId: poolIdPub,
    poolInfo: rpcData,
    tickArrays,
    configInfo,
    tickarrayBitmapExtension: TickArrayBitmapExtensionLayout.decode(tickArrayBitmapExtensionRes!.data),
    amountSpecified: amountOut,
    sqrtPriceLimitX64: new BN(0),
    zeroForOne, // sell A for B,
    isBaseInput: false, // isBaseInput = false for exact output,
    blockTimestamp: Math.floor(Date.now() / 1000),
    includeExtraTickArrays: true,
  })

  console.log('swap simulate info')
  console.log(
    `swap ${formatBN(simulation.amountCalculated, inputDecimals)} ${inputMint} for ${formatBN(amountOut, outputDecimals)} ${outputMint.toString()}`,
  )

  const { execute, transaction } = await raydium.clmm.swapBaseOut({
    poolInfo,
    poolKeys,
    outputMint,
    amountInMax: simulation.amountCalculated,
    amountOut: amountOut,
    observationId: rpcData.observationId,
    ownerInfo: {
      useSOLBalance: true, // if wish to use existed wsol token account, pass false
    },
    remainingAccounts: simulation.accounts,
    txVersion,

    // optional: set up priority fee here
    computeBudgetConfig: {
      units: 1400000,
      microLamports: 600000,
    },

    // optional: add transfer sol to tip account instruction. e.g sent tip to jito
    // txTipConfig: {
    //   address: new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'),
    //   amount: new BN(10000000), // 0.01 sol
    // },
  })
  printSimulate([transaction])
  // const { txId } = await execute({ sendAndConfirm: true })
  // console.log('swapped in clmm pool:', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
swapBaseOut()
