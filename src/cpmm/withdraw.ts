import { ApiV3PoolInfoStandardItemCpmm, CpmmKeys, Percent, getPdaPoolAuthority } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import BN from 'bn.js'
import { isValidCpmm } from './utils'

export const withdraw = async () => {
  const raydium = await initSdk()
  // SOL - USDC pool
  const poolId = '7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny'
  let poolInfo: ApiV3PoolInfoStandardItemCpmm
  let poolKeys: CpmmKeys | undefined

  if (raydium.cluster === 'mainnet') {
    // note: api doesn't support get devnet pool info, so in devnet else we go rpc method
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
    if (!isValidCpmm(poolInfo.programId)) throw new Error('target pool is not CPMM pool')
  } else {
    const data = await raydium.cpmm.getPoolInfoFromRpc(poolId)
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
  }

  const slippage = new Percent(1, 100) // 1%
  const lpAmount = new BN(100)

  const { execute } = await raydium.cpmm.withdrawLiquidity({
    poolInfo,
    poolKeys,
    lpAmount,
    txVersion,
    slippage,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 100000000,
    // },
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('pool withdraw:', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// withdraw()
