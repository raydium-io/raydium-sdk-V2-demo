import { DEV_CREATE_POOL_PROGRAM, DEV_CREATE_POOL_FEE_ACC } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk } from '../config'

export const create = async () => {
  const raydium = await initSdk()
  const mintA = await raydium.token.getTokenInfo('ovmBQjzQNK2XHwLS5msaRDDkb5E3NPQXxgKLVxWR9wZ')
  const mintB = await raydium.token.getTokenInfo('6HwDNdyEypkuPKUvnJEJ4vu9xMj9uvXG37Y3jrhokXhR')

  const { execute, extInfo } = await raydium.liquidity.createCpmmPool({
    programId: DEV_CREATE_POOL_PROGRAM,
    poolFeeAccount: DEV_CREATE_POOL_FEE_ACC,
    mintA,
    mintB,
    mintAAmount: new BN(100),
    mintBAmount: new BN(100),
    startTime: new BN(0),
    associatedOnly: false,
    ownerInfo: {
      useSOLBalance: false,
    },
  })

  const { txId } = await execute()
  console.log('pool created', {
    txId,
    poolKeys: extInfo.address,
  })
}
create()
