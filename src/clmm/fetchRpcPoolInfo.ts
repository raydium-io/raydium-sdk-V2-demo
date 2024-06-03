import { initSdk } from '../config'

export const fetchRpcPoolInfo = async () => {
  const raydium = await initSdk()
  // RAY-USDC
  const pool1 = '61R1ndXxvsWXXkWSyNkCxnzwd3zUNB8Q2ibmkiLPC8ht'
  // SOL-USDC
  const pool2 = '8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj'

  const res = await raydium.clmm.getRpcClmmPoolInfos({
    poolIds: [pool1, pool2],
  })

  const pool1Info = res[pool1]
  const pool2Info = res[pool2]

  console.log('RAY-USDC pool price:', pool1Info.currentPrice)
  console.log('SOL-USDC pool price:', pool2Info.currentPrice)
  console.log('clmm pool infos:', res)
}

/** uncomment code below to execute */
fetchRpcPoolInfo()
