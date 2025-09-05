import {
  ApiV3PoolInfoStandardItemCpmm,
  CpmmKeys,
  CpmmParsedRpcData,
  CurveCalculator,
  USDCMint,
  FeeOn,
  printSimulate,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import BN from 'bn.js'
import { isValidCpmm } from './utils'
import { NATIVE_MINT } from '@solana/spl-token'
import { printSimulateInfo } from '../util'
import { PublicKey } from '@solana/web3.js'

// swapBaseOut means fixed output token amount, calculate needed input token amount
export const swapBaseOut = async () => {
  const raydium = await initSdk()

  // SOL - USDC pool
  const poolId = '7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny'

  // means want to buy 1 USDC
  const outputAmount = new BN(1000000000)
  const outputMint = new PublicKey('HzE9e1d3PzsuqgPV6YV4Ggh2JLVm5LZEB9DNF9VecEgu')

  let poolInfo: ApiV3PoolInfoStandardItemCpmm
  let poolKeys: CpmmKeys | undefined
  let rpcData: CpmmParsedRpcData

  if (raydium.cluster === 'mainnet') {
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
  const swapResult = CurveCalculator.swapBaseOutput(
    outputAmount.gt(rpcData[baseIn ? 'quoteReserve' : 'baseReserve'])
      ? rpcData[baseIn ? 'quoteReserve' : 'baseReserve'].sub(new BN(1))
      : outputAmount,
    baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
    baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
    rpcData.configInfo!.tradeFeeRate,
    rpcData.configInfo!.creatorFeeRate,
    rpcData.configInfo!.protocolFeeRate,
    rpcData.configInfo!.fundFeeRate,
    rpcData.feeOn === FeeOn.BothToken || rpcData.feeOn === FeeOn.OnlyTokenB
  )

  console.log(
    'swap result',
    Object.keys(swapResult).reduce(
      (acc, cur) => ({
        ...acc,
        [cur]: swapResult[cur as keyof typeof swapResult].toString(),
      }),
      {}
    )
  )
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
    swapResult,
    slippage: 0.0001, // range: 1 ~ 0.0001, means 100% ~ 0.01%
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

  printSimulate([transaction])
  // printSimulateInfo()
  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  // const { txId } = await execute({ sendAndConfirm: true })
  // console.log(`swapped: ${poolInfo.mintA.symbol} to ${poolInfo.mintB.symbol}:`, {
  //   txId: `https://explorer.solana.com/tx/${txId}`,
  // })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
swapBaseOut()
