import { ApiV3PoolInfoStandardItemCpmm, Percent } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import BN from 'bn.js'

export const withdraw = async () => {
  const raydium = await initSdk()
  // SOL - USDC pool
  const data = await raydium.api.fetchPoolById({ ids: '7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny' })
  const poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm

  const slippage = new Percent(1, 100) // 1%
  const lpAmount = new BN(100)

  const { execute } = await raydium.cpmm.withdrawLiquidity({
    poolInfo,
    lpAmount,
    txVersion,
    slippage,
  })

  const { txId } = await execute()
  console.log('pool withdraw:', { txId })
}

/** uncomment code below to execute */
// withdraw()
