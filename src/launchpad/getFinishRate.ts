import { LaunchpadPoolInfo, Curve } from '@raydium-io/raydium-sdk-v2'
import { MintInfo } from './type'

// poolInfo demo code: poolInfo.ts
// mintInfo demo code: mintInfoApi.ts

const getFinishRate = async (poolInfo: LaunchpadPoolInfo, mintInfo: MintInfo) => {
  const poolPrice = Curve.getPrice({
    poolInfo,
    curveType: mintInfo.configInfo.curveType,
    decimalA: poolInfo.mintDecimalsA,
    decimalB: poolInfo.mintDecimalsB,
  }).toNumber()
  const endPrice = Curve.getPoolEndPriceReal({
    poolInfo,
    curveType: mintInfo.configInfo.curveType,
    decimalA: poolInfo.mintDecimalsA,
    decimalB: poolInfo.mintDecimalsB,
  }).toNumber()

  const initPrice = Number(
    mintInfo.initPrice ||
      Curve.getPoolInitPriceByPool({
        poolInfo,
        decimalA: poolInfo.mintDecimalsA,
        decimalB: poolInfo.mintDecimalsB,
        curveType: mintInfo.configInfo.curveType,
      }).toNumber()
  )
  const _n = poolPrice - initPrice
  const _d = endPrice - initPrice
  const finishingRate = Math.min(_d === 0 ? 0 : _n / _d, 1)

  return finishingRate
}
