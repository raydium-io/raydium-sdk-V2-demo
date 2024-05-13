import { ApiV3PoolInfoStandardItem } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk } from '../config'
import Decimal from 'decimal.js'

export const depositCpmm = async () => {
  const raydium = await initSdk()
  const data = await raydium.api.searchPoolById({ ids: 'ovmBQjzQNK2XHwLS5msaRDDkb5E3NPQXxgKLVxWR9wZ' })
  const poolInfo = data.data[0] as ApiV3PoolInfoStandardItem

  const baseIn = true
  const inputAmount = '100'
  const res = raydium.liquidity.computePairAmount({
    poolInfo,
    amount: inputAmount,
    baseIn,
    slippage: 0.1,
  })

  const { execute } = await raydium.liquidity.addCpmmLiquidity({
    poolInfo,
    inputAmount: new BN(new Decimal(inputAmount).mul(10 ** poolInfo[baseIn ? 'mintA' : 'mintB'].decimals).toFixed(0)),
    anotherAmount: res.anotherAmount.raw,
    liquidity: res.liquidity,
    baseIn: true,
  })

  const { txId } = await execute()
  console.log('pool deposited', { txId })
}
