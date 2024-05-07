import { Raydium, DEV_CREATE_POOL_PROGRAM, DEV_CREATE_POOL_FEE_ACC } from 'test-rrr-sdk'
import BN from 'bn.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { initSdk } from './config'

export const create = async () => {
  const raydium = await initSdk()
  raydium.liquidity
    .createCpmmPool({
      programId: DEV_CREATE_POOL_PROGRAM,
      poolFeeAccount: DEV_CREATE_POOL_FEE_ACC,
      mintA: {
        address: 'ovmBQjzQNK2XHwLS5msaRDDkb5E3NPQXxgKLVxWR9wZ',
        chainId: 101,
        programId: TOKEN_PROGRAM_ID.toBase58(),
        logoURI: '',
        symbol: 'testMintB',
        name: 'testMintB',
        decimals: 9,
        tags: [],
        extensions: {},
      },
      mintB: {
        address: '6HwDNdyEypkuPKUvnJEJ4vu9xMj9uvXG37Y3jrhokXhR',
        chainId: 101,
        programId: TOKEN_PROGRAM_ID.toBase58(),
        logoURI: '',
        symbol: 'testMintD',
        name: 'testMintD',
        decimals: 9,
        tags: [],
        extensions: {},
      },
      mintAAmount: new BN(100),
      mintBAmount: new BN(100),
      startTime: new BN(0),
      associatedOnly: false,
      ownerInfo: {
        useSOLBalance: false,
      },
    })
    .then((r) => {
      r.execute().then((r) => {
        console.log(123123444, r.txId)
      })
    })
}
create()
