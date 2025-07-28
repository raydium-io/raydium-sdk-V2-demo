import {
  TxVersion,
  LaunchpadConfig,
  LAUNCHPAD_PROGRAM,
  LaunchpadPoolInitParam,
  ApiV3Token,
  txToBase64,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import BN from 'bn.js'
import { PublicKey, VersionedTransaction } from '@solana/web3.js'
import axios from 'axios'
import fs from 'fs'

interface ConfigInfo {
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

const mintHost = 'https://launch-mint-v1.raydium.io'

export const createBonkMintApi = async () => {
  const raydium = await initSdk()
  const owner = raydium.ownerPubKey

  const programId = LAUNCHPAD_PROGRAM

  const configRes: {
    data: {
      data: {
        data: {
          key: ConfigInfo
          mintInfoB: ApiV3Token
        }[]
      }
    }
  } = await axios.get(`${mintHost}/main/configs`)

  const configs = configRes.data.data.data[0].key
  const configInfo: ReturnType<typeof LaunchpadConfig.decode> = {
    index: configs.index,
    mintB: new PublicKey(configs.mintB),
    tradeFeeRate: new BN(configs.tradeFeeRate),
    epoch: new BN(configs.epoch),
    curveType: configs.curveType,
    migrateFee: new BN(configs.migrateFee),
    maxShareFeeRate: new BN(configs.maxShareFeeRate),
    minSupplyA: new BN(configs.minSupplyA),
    maxLockRate: new BN(configs.maxLockRate),
    minSellRateA: new BN(configs.minSellRateA),
    minMigrateRateA: new BN(configs.minMigrateRateA),
    minFundRaisingB: new BN(configs.minFundRaisingB),
    protocolFeeOwner: new PublicKey(configs.protocolFeeOwner),
    migrateFeeOwner: new PublicKey(configs.migrateFeeOwner),
    migrateToAmmWallet: new PublicKey(configs.migrateToAmmWallet),
    migrateToCpmmWallet: new PublicKey(configs.migrateToCpmmWallet),
  }

  const configId = new PublicKey(configRes.data.data.data[0].key.pubKey)
  const mintBInfo = configRes.data.data.data[0].mintInfoB

  /** fetch config info from rpc */
  // const configData = await raydium.connection.getAccountInfo(configId)
  // if (!configData) throw new Error('config not found')
  // const configInfo = LaunchpadConfig.decode(configData.data)
  // const mintBInfo = await raydium.token.getTokenInfo(configInfo.mintB)

  const file = fs.readFileSync('./src/launchpad/testPic.png')

  const newMintData = {
    wallet: owner.toBase58(),
    name: 'testname',
    symbol: 'test',
    // website: '',
    // twitter: '',
    // telegram: '',
    configId: configId.toString(),
    decimals: LaunchpadPoolInitParam.decimals,
    supply: LaunchpadPoolInitParam.supply, // or custom set up supply
    totalSellA: LaunchpadPoolInitParam.totalSellA, // or custom set up totalSellA
    totalFundRaisingB: LaunchpadPoolInitParam.totalFundRaisingB,
    totalLockedAmount: LaunchpadPoolInitParam.totalLockedAmount,
    cliffPeriod: LaunchpadPoolInitParam.cliffPeriod,
    unlockPeriod: LaunchpadPoolInitParam.unlockPeriod,
    // set your platform id, current platform: bonk
    platformId: new PublicKey('8pCtbn9iatQ8493mDQax4xfEUjhoVBpUWYVQoRU18333'),
    migrateType: 'amm', // or cpmm
    description: 'description',
  }

  const form = new FormData()
  Object.keys(newMintData).forEach((key) => {
    // @ts-ignore
    form.append(key, newMintData[key])
  })

  // @ts-ignore
  form.append('file', new Blob([file]), 'testPic.png')

  const r: {
    data: {
      id: string
      success: boolean
      data: { mint: string; metadataLink: string }
    }
  } = await axios.post(`${mintHost}/create/get-random-mint`, form, {
    headers: { 'Content-Type': 'multipart/form-data', 'ray-token': `token-${Date.now()}` },
  })

  const mintA = new PublicKey(r.data.data.mint)

  const { transactions } = await raydium.launchpad.createLaunchpad({
    programId,
    mintA,
    decimals: newMintData.decimals,
    name: newMintData.name,
    symbol: newMintData.symbol,
    uri: r.data.data.metadataLink,
    configId,
    configInfo, // optional, sdk will get data by configId if not provided
    migrateType: newMintData.migrateType as 'amm' | 'cpmm',
    mintBDecimals: mintBInfo.decimals, // default 9

    platformId: newMintData.platformId,
    txVersion: TxVersion.V0,
    slippage: new BN(100), // means 1%
    buyAmount: new BN(0),
    createOnly: true, // true means create mint only, false will "create and buy together"

    supply: newMintData.supply, // lauchpad mint supply amount, default: LaunchpadPoolInitParam.supply
    totalSellA: newMintData.totalSellA, // lauchpad mint sell amount, default: LaunchpadPoolInitParam.totalSellA
    totalFundRaisingB: newMintData.totalFundRaisingB, // if mintB = SOL, means 85 SOL, default: LaunchpadPoolInitParam.totalFundRaisingB
    totalLockedAmount: newMintData.totalLockedAmount, // total locked amount, default 0
    cliffPeriod: newMintData.cliffPeriod, // unit: seconds, default 0
    unlockPeriod: newMintData.unlockPeriod, // unit: seconds, default 0
  })

  const transaction = transactions[0]

  // !!! note: this api will send tx on chain too
  const { data } = await axios.post(`${mintHost}/create/sendTransaction`, {
    txs: [txToBase64(transaction)],
  })

  console.log('simulate tx:\n', data.data.tx)

  const txBuf = Buffer.from(data.data.tx, 'base64')
  const bothSignedTx = VersionedTransaction.deserialize(txBuf as any)

  const txId = await raydium.connection.sendTransaction(bothSignedTx as VersionedTransaction, { skipPreflight: true })
  console.log('transaction sent:', txId)

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// createBonkMintApi()
