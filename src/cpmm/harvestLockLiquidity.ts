import { ApiV3PoolInfoStandardItemCpmm, printSimulate } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import { isValidCpmm } from './utils'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

export const harvestLockLiquidity = async () => {
  const raydium = await initSdk()
  const poolId = '2umXxGh6jY63wDHHQ4yDv8BJbjzLNnKgYDwRqas75nnt'

  let poolInfo: ApiV3PoolInfoStandardItemCpmm
  if (raydium.cluster === 'mainnet') {
    // note: api doesn't support get devnet pool info, so in devnet else we go rpc method
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId })
    poolInfo = data[0] as ApiV3PoolInfoStandardItemCpmm
    if (!isValidCpmm(poolInfo.programId)) throw new Error('target pool is not CPMM pool')
  } else {
    const data = await raydium.cpmm.getPoolInfoFromRpc(poolId)
    poolInfo = data.poolInfo
  }

  const { execute, transaction } = await raydium.cpmm.harvestLockLp({
    poolInfo,
    nftMint: new PublicKey('CgkdQL6eRN1nxG2AmC8NFG5iboXuKtSjT4pShnspomZy'), // locked nft mint
    lpFeeAmount: new BN(99999999),
    txVersion,
  })

  const { txId } = await execute({ sendAndConfirm: true })
  console.log('lp locked', { txId: `https://explorer.solana.com/tx/${txId}` })
}

/** uncomment code below to execute */
// harvestLockLiquidity()
