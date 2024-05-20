import { ApiV3PoolInfoStandardItemCpmm, Percent } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'

export const deposit = async () => {
  const raydium = await initSdk()

  // SOL - USDC pool
  const data = await raydium.api.fetchPoolById({ ids: '7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny' })

  const poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
  const uiInputAmount = '0.0001'
  const inputAmount = new BN(new Decimal(uiInputAmount).mul(10 ** poolInfo.mintA.decimals).toFixed(0))
  const slippage = new Percent(1, 100) // 1%
  const baseIn = true

  // computePairAmount is not necessary, addLiquidity will compute automatically,
  // just for ui display
  /*
  const computeRes = await raydium.cpmm.computePairAmount({
    poolInfo,
    amount: uiInputAmount,
    slippage,
    baseIn,
    epochInfo: await raydium.fetchEpochInfo()
  })

  computeRes.anotherAmount.amount -> pair amount needed to add liquidity
  computeRes.anotherAmount.fee -> token2022 transfer fee, might be undefined if isn't token2022 program
  */

  const { execute } = await raydium.cpmm.addLiquidity({
    poolInfo,
    inputAmount,
    slippage,
    baseIn,
    txVersion,
  })
  const { txId } = await execute()
  console.log('pool deposited', { txId })
}

/** uncomment code below to execute */
// deposit()
