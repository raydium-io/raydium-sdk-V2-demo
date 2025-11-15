import {
  API_URLS,
  DEV_API_URLS,
  getCpLockPda,
  LOCK_CPMM_PROGRAM,
  ALL_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { initSdk } from '../config'
import { MintLayout } from '@solana/spl-token'
import axios from 'axios'
import Decimal from 'decimal.js'
import { BN } from 'bn.js'

const poolLpAuthority = new Set([
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  '3uaZBfHPfmpAHW7dsimC1SnyR61X4bJqQZKWmRSCXJxv',
  'GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL',
])

export const fetchAllPositions = async () => {
  const raydium = await initSdk({ loadToken: true })
  await raydium.account.fetchWalletTokenAccounts()

  const isDevnet = raydium.cluster === 'devnet'
  const urlConfigs = !isDevnet ? API_URLS : DEV_API_URLS
  const programId = isDevnet ? DEVNET_PROGRAM_ID : ALL_PROGRAM_ID

  const nonZeroMints = raydium.account.tokenAccounts
    .filter((acc) => !acc.isNative && !acc.amount.isZero() && !raydium.token.tokenMap.has(acc.mint.toBase58()))
    .map((acc) => acc.mint)

  const chunkSize = 100
  const keyGroup = []
  for (let i = 0; i < nonZeroMints.length; i += chunkSize) keyGroup.push(nonZeroMints.slice(i, i + chunkSize))

  const res = await Promise.all(
    keyGroup.map((list) =>
      raydium.connection.getMultipleAccountsInfo(list.map((publicKey) => new PublicKey(publicKey)))
    )
  )

  const lpData = res
    .flat()
    .map((accountData, idx) => {
      if (accountData?.data.length === MintLayout.span) {
        const r = MintLayout.decode(accountData.data as any)
        const mintData = { ...r, address: nonZeroMints[idx] }
        return mintData
      }
      return undefined
    })
    .filter((d) => !!d && (isDevnet || poolLpAuthority.has(d.mintAuthority.toBase58())))

  const apiChunkSize = 20
  const lpGroup = []
  for (let i = 0; i < lpData.length; i += apiChunkSize) lpGroup.push(lpData.slice(i, i + apiChunkSize))

  const poolRes = await Promise.all(
    lpGroup.map((list) =>
      axios.get(
        `${urlConfigs.BASE_HOST!}${urlConfigs.POOL_SEARCH_LP!}?lps=${list.map((d) => d!.address.toBase58()).join(',')}`
      )
    )
  )

  console.log('\n')
  const lpPools = poolRes
    .flat()
    .map((r) => r.data.data)
    .flat()
  lpPools.forEach((pool, idx) => {
    const lpMint = lpData[idx]
    if (!pool || !lpMint) return
    console.log(
      `${pool.programId === programId.CREATE_CPMM_POOL_PROGRAM.toBase58() ? 'CPMM' : 'AMM'} pool: ${
        pool.mintA.symbol
      }-${pool.mintB.symbol} (${pool.id})`
    )
    console.log(
      `lp mint: ${lpMint!.address.toBase58()}, balance: ${new Decimal(
        raydium.account.tokenAccounts.find((acc) => acc.mint.equals(lpMint.address))?.amount.toString() || 0
      )
        .div(10 ** pool.lpMint.decimals)
        .toString()}\n`
    )
  })

  const possibleNFTs = raydium.account.tokenAccounts.filter(
    (acc) => acc.amount.eq(new BN(1)) && !raydium.token.tokenMap.has(acc.mint.toBase58())
  )
  const allPossibleLockMints = possibleNFTs.map(
    (mint) => getCpLockPda(programId.LOCK_CPMM_PROGRAM, mint.mint).publicKey
  )
  const checkGroup = []
  for (let i = 0; i < allPossibleLockMints.length; i += chunkSize)
    checkGroup.push(allPossibleLockMints.slice(i, i + chunkSize))

  const checkRes = await Promise.all(
    checkGroup.map((list) =>
      raydium.connection.getMultipleAccountsInfo(list.map((publicKey) => new PublicKey(publicKey)))
    )
  )
  const possibleLockMintsWithData = checkRes
    .flat()
    .map((data, idx) => {
      if (!data) return undefined
      return allPossibleLockMints[idx]
    })
    .filter(Boolean)

  const lockPosRes = await Promise.all(
    possibleLockMintsWithData.map((mint) => axios.get(`${urlConfigs.CPMM_LOCK!}?id=${mint!.toBase58()}`))
  )

  lockPosRes.forEach((pos) => {
    console.log(`${pos.data.poolInfo.mintA.symbol}-${pos.data.poolInfo.mintB.symbol} ${pos.data.name}(pool Lock info)`)
    console.log(pos.data.positionInfo)
    console.log('\n')
  })
}

/** uncomment code below to execute */
fetchAllPositions()
