import {
  API_URLS,
  LAUNCHPAD_PROGRAM,
  LaunchpadConfig,
  LaunchpadConfigInfo,
  LaunchpadPool,
  printSimulate,
  TxVersion,
  DEVNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk-v2'
import { NATIVE_MINT } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import Decimal from 'decimal.js'
import { initSdk } from '../config'

export const claimPlatformFeeAll = async () => {
  const raydium = await initSdk()

  if (raydium.owner === undefined) {
    console.log('please config owner info')
    return
  }
  const platformId = new PublicKey(' platform id ')

  const allPlatformPool = await raydium.connection.getProgramAccounts(LAUNCHPAD_PROGRAM, {
    filters: [
      { dataSize: LaunchpadPool.span },
      { memcmp: { offset: LaunchpadPool.offsetOf('platformId'), bytes: platformId.toString() } },
    ],
  })
  console.log('allPlatformPool', allPlatformPool.length)

  const minClaimVault = 10
  const itemRunClaimPool = 100

  const cacheMintPriceB: { [mint: string]: number } = {}
  const cacheConfigInfo: { [configId: string]: LaunchpadConfigInfo } = {}

  for (let i = 0; i < allPlatformPool.length; i += itemRunClaimPool) {
    console.log('item start', i)
    const itemPools = allPlatformPool.slice(i, i + itemRunClaimPool)

    await Promise.all(
      itemPools.map(async (itemPool) => {
        const poolInfo = LaunchpadPool.decode(itemPool.account.data)
        const configId = poolInfo.configId.toString()
        if (cacheConfigInfo[configId] === undefined) {
          const configInfo = await raydium.connection.getAccountInfo(poolInfo.configId)

          if (configInfo === null) {
            console.log('fetch config info error: ' + JSON.stringify({ poolId: itemPool.pubkey.toString(), configId }))
            return
          }

          cacheConfigInfo[configId] = LaunchpadConfig.decode(configInfo.data)
        }

        const mintB = cacheConfigInfo[configId].mintB
        const mintBStr = mintB.toString()

        if (cacheMintPriceB[mintBStr] === undefined) {
          const apiPriceUrl = `${API_URLS.BASE_HOST}${API_URLS.MINT_PRICE}` + `?mints=${mintBStr}`
          const apiData = await (await fetch(apiPriceUrl)).json()
          cacheMintPriceB[mintBStr] = apiData?.data[mintBStr] ?? 0
        }

        const mintPriceB = cacheMintPriceB[mintBStr]

        const pendingClaim = new Decimal(poolInfo.platformFee.toString()).div(
          new Decimal(10).pow(poolInfo.mintDecimalsB)
        )
        const pendingClaimU = pendingClaim.mul(mintPriceB)

        if (pendingClaimU.lt(minClaimVault)) return

        const { execute, transaction, extInfo, builder } = await raydium.launchpad.claimPlatformFee({
          programId: LAUNCHPAD_PROGRAM, // devnet:  DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM
          platformId,
          platformClaimFeeWallet: raydium.ownerPubKey,
          poolId: itemPool.pubkey,

          mintB: NATIVE_MINT,
          vaultB: poolInfo.vaultB,

          txVersion: TxVersion.V0,
          // computeBudgetConfig: {
          //   units: 600000,
          //   microLamports: 600000,
          // },
        })

        printSimulate([transaction])

        // try {
        //   const sentInfo = await execute({ sendAndConfirm: true })
        //   console.log(sentInfo)
        // } catch (e: any) {
        //   console.log(e)
        // }
      })
    )
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// claimPlatformFeeAll()
