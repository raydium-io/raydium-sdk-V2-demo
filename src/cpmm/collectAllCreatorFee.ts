import {
  ApiV3PoolInfoStandardItemCpmm,
  CpmmKeys,
  CREATE_CPMM_POOL_PROGRAM,
  DEVNET_PROGRAM_ID,
  printSimulate,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import axios from 'axios'
import { poolInfo } from '../launchpad/poolInfo'
import Decimal from 'decimal.js'

export const collectAllCreatorFee = async () => {
  const raydium = await initSdk()

  const isDevnet = raydium.cluster === 'devnet'
  const host = isDevnet ? 'https://temp-api-v1-devnet.raydium.io' : 'https://temp-api-v1.raydium.io'
  const cpmmCreatorFeeRes: {
    id: string
    success: boolean
    data: {
      fee: { amountA: string; amountB: string }
      poolInfo: ApiV3PoolInfoStandardItemCpmm
      poolKey: CpmmKeys
    }[]
  } = (await axios.get(`${host}/cp-creator-fee?wallet=${raydium.ownerPubKey.toBase58()}`)).data

  if (!cpmmCreatorFeeRes.data.length) {
    console.log('wallet do not have any cpmm creaotr fees')
    process.exit()
  }

  console.log('\n')
  cpmmCreatorFeeRes.data.forEach((d) => {
    const [mintA, mintB] = [
      d.poolInfo.mintA.symbol || d.poolInfo.mintA.address,
      d.poolInfo.mintB.symbol || d.poolInfo.mintB.address,
    ]
    console.log(`pool ${d.poolInfo.id}`)
    if (d.fee.amountA === '0' && d.fee.amountB === '0') {
      console.log('no pending creator fees\n')
      return
    }
    console.log(
      `creator fee: ${new Decimal(d.fee.amountA)
        .div(10 ** d.poolInfo.mintA.decimals)
        .toString()} ${mintA}, ${new Decimal(d.fee.amountB).div(10 ** d.poolInfo.mintB.decimals).toString()} ${mintB}\n`
    )
  })

  const { execute, transactions } = await raydium.cpmm.collectMultiCreatorFees({
    poolInfoList: cpmmCreatorFeeRes.data
      .filter((d) => d.fee.amountA !== '0' || d.fee.amountB !== '0')
      .map((d) => d.poolInfo),
    programId: isDevnet ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM : CREATE_CPMM_POOL_PROGRAM,
    txVersion,
  })

  try {
    const sentInfo = await execute({ sequentially: true })
    console.log(sentInfo)
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// collectAllCreatorFee()
