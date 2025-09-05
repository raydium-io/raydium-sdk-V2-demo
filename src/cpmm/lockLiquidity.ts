import { ApiV3PoolInfoStandardItemCpmm, DEVNET_PROGRAM_ID, CpmmKeys } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import { isValidCpmm } from './utils'

export const lockLiquidity = async () => {
  const raydium = await initSdk()
  const poolId = '2umXxGh6jY63wDHHQ4yDv8BJbjzLNnKgYDwRqas75nnt'

  let poolInfo: ApiV3PoolInfoStandardItemCpmm
  let poolKeys: CpmmKeys | undefined
  if (raydium.cluster === 'mainnet') {
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
    if (!isValidCpmm(poolInfo.programId)) throw new Error('target pool is not CPMM pool')
  } else {
    const data = await raydium.cpmm.getPoolInfoFromRpc(poolId)
    poolInfo = data.poolInfo
    poolKeys = data.poolKeys
  }

  /** if you know about how much liquidity amount can lock, you can skip code below to fetch account balance */
  await raydium.account.fetchWalletTokenAccounts()
  const lpBalance = raydium.account.tokenAccounts.find((a) => a.mint.toBase58() === poolInfo.lpMint.address)
  if (!lpBalance) throw new Error(`you do not have balance in pool: ${poolId}`)

  const { execute, extInfo } = await raydium.cpmm.lockLp({
    // programId: EVNET_PROGRAM_ID.LOCK_CPMM_PROGRAM, // devnet
    // authProgram: DEVNET_PROGRAM_ID.LOCK_CPMM_AUTH, // devnet
    // poolKeys, // devnet
    poolInfo,
    lpAmount: lpBalance.amount,
    withMetadata: true,
    txVersion,
  })

  const { txId } = await execute({ sendAndConfirm: true })
  console.log('lp locked', { txId: `https://explorer.solana.com/tx/${txId}`, extInfo })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// lockLiquidity()
