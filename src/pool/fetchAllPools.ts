import { Connection, PublicKey } from '@solana/web3.js'
import {
  ALL_PROGRAM_ID,
  liquidityStateV4Layout,
  PoolInfoLayout,
  CpmmPoolInfoLayout,
  struct,
  publicKey,
} from '@raydium-io/raydium-sdk-v2'

const connection = new Connection('rpc url')

const getAmmPoolInfo = async (poolId: PublicKey) => {
  const data = await connection.getAccountInfo(poolId)
  if (!data) throw new Error(`pool not found: ${poolId.toBase58()}`)
  return liquidityStateV4Layout.decode(data.data)
}

const getMultipleAmmPoolInfo = async (poolIdList: PublicKey[]) => {
  const data = await connection.getMultipleAccountsInfo(poolIdList)

  return data.map((d, idx) => {
    if (!d) return null
    return {
      poolId: poolIdList[idx],
      ...liquidityStateV4Layout.decode(d.data),
    }
  })
}

async function fetchAllPools() {
  // since amm pool data at least > 1GB might cause error
  // let's limit data size and get poolId/baseMint/quoteMint first
  const layoutAmm = struct([publicKey('baseMint'), publicKey('quoteMint')])
  const ammPools: (ReturnType<typeof layoutAmm.decode> & { poolId: PublicKey })[] = []

  console.log('amm fetching...')
  const ammPoolsData = await connection.getProgramAccounts(ALL_PROGRAM_ID.AMM_V4, {
    filters: [{ dataSize: liquidityStateV4Layout.span }],
    dataSlice: { offset: liquidityStateV4Layout.offsetOf('baseMint'), length: 64 },
    encoding: 'base64' as any,
  })
  console.log('amm fetch done')
  ammPoolsData.forEach((a) => {
    ammPools.push({
      poolId: a.pubkey,
      ...layoutAmm.decode(a.account.data),
    })
  })

  // after get all amm pools id, we can fetch amm pool info one by one or by group separately

  // e.g. 1:1  ammPools.forEach((a) => getAmmPoolInfo(a.poolId))
  // e.g. 200 per group  getMultipleAmmPoolInfo(ammPools.slice(0, 100).map((a) => a.poolId))

  const clmmPools: (ReturnType<typeof PoolInfoLayout.decode> & { poolId: PublicKey })[] = []
  console.log('clmm fetching...')
  const clmmPoolsData = await connection.getProgramAccounts(ALL_PROGRAM_ID.CLMM_PROGRAM_ID, {
    filters: [{ dataSize: PoolInfoLayout.span }],
  })

  console.log('clmm fetch done')
  clmmPoolsData.forEach((c) => {
    clmmPools.push({
      poolId: c.pubkey,
      ...PoolInfoLayout.decode(c.account.data),
    })
  })

  const cpmmPools: (ReturnType<typeof CpmmPoolInfoLayout.decode> & { poolId: PublicKey })[] = []
  console.log('cpmm fetching...')
  const cpmmPoolsData = await connection.getProgramAccounts(ALL_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, {
    filters: [{ dataSize: CpmmPoolInfoLayout.span }],
  })
  cpmmPoolsData.forEach((c) => {
    cpmmPools.push({
      poolId: c.pubkey,
      ...CpmmPoolInfoLayout.decode(c.account.data),
    })
  })
  console.log('cpmm fetch done')

  console.log(ammPools.length, {
    amm: ammPools,
    clmmPools: clmmPools,
    cpmmPools,
  })
}

fetchAllPools()
