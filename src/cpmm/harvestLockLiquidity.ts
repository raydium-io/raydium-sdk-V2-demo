import {
  ApiV3PoolInfoStandardItemCpmm,
  printSimulate,
  DEV_LOCK_CPMM_PROGRAM,
  DEV_LOCK_CPMM_AUTH,
  CpmmKeys,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import { isValidCpmm } from './utils'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

export const harvestLockLiquidity = async () => {
  const raydium = await initSdk()
  const poolId = '2umXxGh6jY63wDHHQ4yDv8BJbjzLNnKgYDwRqas75nnt'

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

  const { execute, transaction } = await raydium.cpmm.harvestLockLp({
    // programId: DEV_LOCK_CPMM_PROGRAM, // devent
    // authProgram: DEV_LOCK_CPMM_AUTH, // devent
    // poolKeys, // devent
    poolInfo,
    nftMint: new PublicKey('CgkdQL6eRN1nxG2AmC8NFG5iboXuKtSjT4pShnspomZy'), // locked nft mint
    lpFeeAmount: new BN(99999999),
    txVersion,

    // closeWsol: false, // default if true, if you want use wsol, you need set false

    // optional: add transfer sol to tip account instruction. e.g sent tip to jito
    // txTipConfig: {
    //   address: new PublicKey('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'),
    //   amount: new BN(10000000), // 0.01 sol
    // },
  })

  const { txId } = await execute({ sendAndConfirm: true })
  console.log('lp locked', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// harvestLockLiquidity()
