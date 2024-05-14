import { ApiV3PoolInfoStandardItem } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk } from '../config'
import Decimal from 'decimal.js'

export const withdrawCpmm = async () => {
  const raydium = await initSdk()
  const data = await raydium.api.fetchPoolById({ ids: 'ovmBQjzQNK2XHwLS5msaRDDkb5E3NPQXxgKLVxWR9wZ' })
  const poolInfo = data.data[0] as ApiV3PoolInfoStandardItem

  const userLpAccount = raydium.account.tokenAccounts.find((t) => t.mint.toBase58() === poolInfo.lpMint.address)
  if (!userLpAccount) throw new Error('user do not have lp account')

  const lpAmount = userLpAccount.amount
  const slippage = 0.001

  const [mintAmountA, mintAmountB, poolLpAmount] = [
    new Decimal(poolInfo.mintAmountA).mul(10 ** poolInfo.mintA.decimals),
    new Decimal(poolInfo.mintAmountB).mul(10 ** poolInfo.mintB.decimals),
    new Decimal(poolInfo.lpAmount).mul(10 ** poolInfo.lpMint.decimals),
  ]

  const { execute } = await raydium.cpmm.withdrawLiquidity({
    poolInfo,
    lpAmount,
    amountMintA: new BN(
      new Decimal(lpAmount.toString())
        .mul(mintAmountA)
        .div(poolLpAmount)
        .mul(1 - slippage)
        .toFixed(0, Decimal.ROUND_DOWN)
    ),
    amountMintB: new BN(
      new Decimal(lpAmount.toString())
        .mul(mintAmountB)
        .div(poolLpAmount)
        .mul(1 - slippage)
        .toFixed(0, Decimal.ROUND_DOWN)
    ),
  })

  const { txId } = await execute()
  console.log('pool withdraw:', { txId })
}
