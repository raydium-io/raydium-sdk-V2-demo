import { ApiV3Token, CpmmCreatorFeeOn } from '@raydium-io/raydium-sdk-v2'

export interface ConfigInfo {
  name: string
  pubKey: string
  epoch: number
  curveType: number
  index: number
  migrateFee: string
  tradeFeeRate: string
  maxShareFeeRate: string
  minSupplyA: string
  maxLockRate: string
  minSellRateA: string
  minMigrateRateA: string
  minFundRaisingB: string
  protocolFeeOwner: string
  migrateFeeOwner: string
  migrateToAmmWallet: string
  migrateToCpmmWallet: string
  mintB: string
}

export interface PlatformCurveAPI {
  epoch: number
  index: number
  configId: string
  bondingCurveParam: {
    migrateType: number | null
    migrateCpmmFeeOn: number | null
    supply: string | null
    totalSellA: string | null
    totalFundRaisingB: string | null
    totalLockedAmount: string | null
    cliffPeriod: string | null
    unlockPeriod: string | null
  }
}

export interface PlatformConfig {
  pubKey: string
  platformClaimFeeWallet: string
  platformLockNftWallet: string
  transferFeeExtensionAuth: string
  cpConfigId: string
  platformScale: string
  creatorScale: string
  burnScale: string
  feeRate: string
  creatorFeeRate: string
  name: string
  web: string
  img: string
  platformCurve: PlatformCurveAPI[]
}

export interface MintInfo {
  creator: string
  decimals: string
  description: string
  imgUrl: string
  marketCap: number
  metadataUrl: string
  mint: string
  mintB: ApiV3Token
  name: string
  origin: { name: string; icon: string }
  poolId: string
  supply: number
  symbol: string
  createAt: number
  website?: string
  twitter?: string
  telegram?: string
  finishingRate: number
  initPrice: string
  endPrice: string
  migrateAmmId?: string

  migrateCreatorNftMint?: string
  migratePlatformNftMint?: string

  priceStageTime1?: number
  priceStageTime2?: number
  priceFinalTime?: number

  volumeA: number
  volumeB: number
  volumeU: number

  configId: string
  configInfo: ConfigInfo

  platformInfo: PlatformConfig

  cliffPeriod: string
  unlockPeriod: string
  totalAllocatedShare: number
  totalLockedAmount: number

  defaultCurve?: boolean

  totalSellA: string
  totalFundRaisingB: string

  migrateType: 'cpmm' | 'amm'
  mintProgramA: string

  transferFeeBasePoints?: number
  maxinumFee?: string

  cpmmCreatorFeeOn: CpmmCreatorFeeOn
}

export interface TradeHistory {
  txid: string
  owner: string
  blockTime: number
  poolId: string
  side: 'buy' | 'sell'
  amountA: number
  amountB: number
}

export interface KlinePoint {
  poolId: string
  t: number
  o: number
  c: number
  h: number
  l: number
}
