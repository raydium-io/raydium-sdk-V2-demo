import { ApiV3PoolInfoStandardItemCpmm, CpmmKeys, TxVersion } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk } from '../config'
import { isValidCpmm } from './utils'

export const collectCreatorFee = async () => {
  const raydium = await initSdk()

  // SOL - USDC pool
  const poolId = '7JuwJuNU88gurFnyWeiyGKbFmExMWcmRZntn9imEzdny'
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

  const { transaction, extInfo, execute, builder } = await raydium.cpmm.collectCreatorFees({
    // programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, // devnet
    poolInfo,
    poolKeys,
    txVersion: TxVersion.V0,
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('pool deposited', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// collectCreatorFee()
