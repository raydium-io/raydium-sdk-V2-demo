import { PublicKey } from '@solana/web3.js'
import {
  LaunchpadPool,
  LaunchpadConfig,
  getPdaLaunchpadPoolId,
  DEV_LAUNCHPAD_PROGRAM,
  LAUNCHPAD_PROGRAM,
  Curve,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import BN from 'bn.js'

export const poolInfo = async () => {
  const raydium = await initSdk()
  const poolId = new PublicKey('pool id')
  // or you can get pool id from mintA/B  getPdaLaunchpadPoolId(LAUNCHPAD_PROGRAM, mintA, mintB).publicKey

  const r = await raydium.connection.getAccountInfo(poolId)
  const info = LaunchpadPool.decode(r!.data)

  const configData = await raydium.connection.getAccountInfo(info.configId)
  const configInfo = LaunchpadConfig.decode(configData!.data)

  const poolPrice = Curve.getPrice({
    poolInfo: info,
    curveType: configInfo.curveType,
    decimalA: info.mintDecimalsA,
    decimalB: info.mintDecimalsB,
  }).toNumber()

  console.log(
    `pool price: ${poolPrice.toFixed(20)}`,
    Object.keys(info).reduce(
      (acc, cur) => ({
        ...acc,
        [cur]:
          cur === 'vestingSchedule'
            ? Object.keys(info[cur]).reduce(
                (acc1, cur1) => ({
                  ...acc1,
                  // @ts-ignore
                  [cur1]: info[cur][cur1].toString(),
                }),
                {}
              )
            : // @ts-ignore
              info[cur].toString(),
      }),
      {}
    )
  )
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
poolInfo()
