import { AmmPool, ClmmPool } from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import jsonfile from 'jsonfile'

const filePath = './src/data/pool_data.json'

export const readCachePoolData = (cacheTime?: number) => {
  let cacheData: { time: number; ammPools: AmmPool[]; clmmPools: ClmmPool[] } = {
    time: 0,
    ammPools: [],
    clmmPools: [],
  }
  try {
    console.log('reading cache pool data')
    const data = jsonfile.readFileSync(filePath) as { time: number; ammPools: AmmPool[]; clmmPools: ClmmPool[] }
    if (Date.now() - data.time > (cacheTime ?? 1000 * 60 * 10)) {
      console.log('cache data expired')
      return cacheData
    }
    cacheData.time = data.time
    cacheData.ammPools = data.ammPools.map((p) => ({
      ...p,
      id: new PublicKey(p.id),
      mintA: new PublicKey(p.mintA),
      mintB: new PublicKey(p.mintB),
    }))
    cacheData.clmmPools = data.clmmPools.map((p) => ({
      ...p,
      id: new PublicKey(p.id),
      mintA: new PublicKey(p.mintA),
      mintB: new PublicKey(p.mintB),
    }))
    console.log('read cache pool data success')
  } catch {
    console.log('cannot read cache pool data')
  }

  return {
    ammPools: cacheData.ammPools,
    clmmPools: cacheData.clmmPools,
  }
}

export const writeCachePoolData = (data: { ammPools: AmmPool[]; clmmPools: ClmmPool[] }) => {
  console.log('caching all pool basic info..')
  jsonfile
    .writeFile(filePath, {
      time: Date.now(),
      ammPools: data.ammPools.map((p) => ({
        id: p.id.toBase58(),
        version: p.version,
        mintA: p.mintA.toBase58(),
        mintB: p.mintB.toBase58(),
      })),
      clmmPools: data.clmmPools.map((p) => ({
        id: p.id.toBase58(),
        version: p.version,
        mintA: p.mintA.toBase58(),
        mintB: p.mintB.toBase58(),
      })),
    })
    .then(() => {
      console.log('cache pool data success')
    })
    .catch((e) => {
      console.log('cache pool data failed', e)
    })
}
