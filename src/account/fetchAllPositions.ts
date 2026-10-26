import {
  API_URLS,
  DEV_API_URLS,
  getCpLockPda,
  ALL_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { initSdk } from '../config'
import { MintLayout, Mint } from '@solana/spl-token'
import axios from 'axios'
import Decimal from 'decimal.js'
import { BN } from 'bn.js'

// --- Configuration Constants ---
const MINT_ACCOUNT_CHUNK_SIZE = 100
const API_QUERY_CHUNK_SIZE = 20

// Authorities responsible for minting LP tokens in mainnet CPMM/AMM pools.
// Used to filter for accounts that are likely Raydium LP tokens.
const MAINNET_LP_MINT_AUTHORITIES = new Set([
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
  '3uaZBfHPfmpAHW7dsimC1SnyR61X4bJqQZKWmRSCXJxv',
  'GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL',
])

/**
 * Custom type for LP mint data decoded from the chain.
 * Adds the public key of the mint.
 */
type LpMintData = Mint & {
  address: PublicKey
}

/**
 * Fetches and displays all Raydium AMM/CPMM LP positions and locked CPMM positions
 * for the wallet configured in the SDK.
 */
export const fetchAllPositions = async () => {
  const raydium = await initSdk({ loadToken: true })
  await raydium.account.fetchWalletTokenAccounts()

  const isDevnet = raydium.cluster === 'devnet'
  const urlConfigs = !isDevnet ? API_URLS : DEV_API_URLS
  const programId = isDevnet ? DEVNET_PROGRAM_ID : ALL_PROGRAM_ID

  // 1. IDENTIFY POSSIBLE LP MINTS FROM WALLET ACCOUNTS
  // Filter for token accounts with non-zero balance and which are not known SPL tokens (potential LP tokens)
  const nonZeroMintAddresses = raydium.account.tokenAccounts
    .filter((acc) => !acc.isNative && !acc.amount.isZero() && !raydium.token.tokenMap.has(acc.mint.toBase58()))
    .map((acc) => acc.mint)

  // Group addresses into chunks for `getMultipleAccountsInfo` to prevent RPC limits
  const addressGroups: PublicKey[][] = []
  for (let i = 0; i < nonZeroMintAddresses.length; i += MINT_ACCOUNT_CHUNK_SIZE) {
    addressGroups.push(nonZeroMintAddresses.slice(i, i + MINT_ACCOUNT_CHUNK_SIZE))
  }

  // Fetch mint account info for all possible LP mints
  const mintAccountInfos = await Promise.all(
    addressGroups.map((list) => raydium.connection.getMultipleAccountsInfo(list))
  )

  // Decode and filter the fetched account data to identify actual LP mints
  const lpMintDatas = mintAccountInfos
    .flat()
    .map((accountData, idx): LpMintData | undefined => {
      // Check if data length matches standard SPL MintLayout size
      if (accountData?.data.length === MintLayout.span) {
        // Use try-catch to safely decode in case of unexpected data
        try {
          const decoded = MintLayout.decode(accountData.data)
          const mintData: LpMintData = { 
            ...decoded, 
            address: nonZeroMintAddresses[idx] // Attach the original PublicKey
          }

          // In mainnet, only accept mints whose authority matches known Raydium authorities
          if (!isDevnet && !MAINNET_LP_MINT_AUTHORITIES.has(mintData.mintAuthority.toBase58())) {
            return undefined
          }

          return mintData
        } catch (e) {
          // console.error(`Failed to decode mint: ${nonZeroMintAddresses[idx].toBase58()}`, e)
          return undefined
        }
      }
      return undefined
    })
    .filter((d): d is LpMintData => !!d)


  // 2. QUERY POOL INFO VIA RAYDIUM API
  // Group LP mint addresses into chunks for API calls
  const lpAddressGroups: LpMintData[][] = []
  for (let i = 0; i < lpMintDatas.length; i += API_QUERY_CHUNK_SIZE) {
    lpAddressGroups.push(lpMintDatas.slice(i, i + API_QUERY_CHUNK_SIZE))
  }

  // Fetch pool details from Raydium API using the identified LP mint addresses
  const poolResponses = await Promise.all(
    lpAddressGroups.map((list) => {
      const lpAddresses = list.map((d) => d.address.toBase58()).join(',')
      return axios.get<{ data: any[] }>(
        `${urlConfigs.BASE_HOST!}${urlConfigs.POOL_SEARCH_LP!}?lps=${lpAddresses}`
      )
    })
  )

  // Combine and structure pool data into a Map for easy lookup by LP address
  const lpPoolsMap = new Map<string, any>()
  poolResponses
    .flatMap((r) => r.data.data) // Extract pool data from all responses
    .forEach((pool) => {
      // Key the map by the LP mint address
      lpPoolsMap.set(pool.lpMint.address, pool)
    })

  // 3. DISPLAY LP POSITIONS
  console.log('\n--- Found Raydium LP Positions ---')
  lpMintDatas.forEach((lpMintData) => {
    const pool = lpPoolsMap.get(lpMintData.address.toBase58())
    
    if (!pool) return // Skip if no corresponding pool found

    const isCpmm = pool.programId === programId.CREATE_CPMM_POOL_PROGRAM.toBase58()
    const poolType = isCpmm ? 'CPMM' : 'AMM'

    // Find the wallet token account for the specific LP mint
    const walletAccount = raydium.account.tokenAccounts.find((acc) => acc.mint.equals(lpMintData.address))
    const lpBalance = walletAccount?.amount ?? new BN(0)

    const formattedBalance = new Decimal(lpBalance.toString())
      .div(new Decimal(10).pow(pool.lpMint.decimals))
      .toString()

    console.log(
      `${poolType} Pool: ${pool.mintA.symbol}-${pool.mintB.symbol} (ID: ${pool.id})`
    )
    console.log(
      `  LP Mint: ${lpMintData.address.toBase58()}, Balance: ${formattedBalance}\n`
    )
  })


  // 4. IDENTIFY POSSIBLE LOCKED CPMM POSITIONS (NFTs)
  // Look for token accounts with a balance of 1 (potential NFTs used for locks)
  const possibleLockNFTs = raydium.account.tokenAccounts.filter(
    (acc) => acc.amount.eq(new BN(1)) && !raydium.token.tokenMap.has(acc.mint.toBase58())
  )

  // Calculate the PDA for the lock account corresponding to each potential NFT
  const allPossibleLockPdas = possibleLockNFTs.map(
    (acc) => getCpLockPda(programId.LOCK_CPMM_PROGRAM, acc.mint).publicKey
  )

  // Chunk the PDAs for RPC call
  const pdaCheckGroups: PublicKey[][] = []
  for (let i = 0; i < allPossibleLockPdas.length; i += MINT_ACCOUNT_CHUNK_SIZE) {
    pdaCheckGroups.push(allPossibleLockPdas.slice(i, i + MINT_ACCOUNT_CHUNK_SIZE))
  }

  // Check the chain for accounts at these PDAs (a non-null response means a lock exists)
  const pdaCheckResponses = await Promise.all(
    pdaCheckGroups.map((list) => raydium.connection.getMultipleAccountsInfo(list))
  )

  // Filter for PDAs where an account was actually found
  const existingLockPdas = pdaCheckResponses
    .flat()
    .map((data, idx) => data ? allPossibleLockPdas[idx] : undefined)
    .filter((d): d is PublicKey => !!d) // Filter out undefined values

  // 5. QUERY LOCK POSITION INFO VIA RAYDIUM API
  console.log('\n--- Found Locked CPMM Positions ---')
  if (existingLockPdas.length === 0) {
    console.log('No locked CPMM positions found.')
    return
  }
  
  // Fetch details for the existing lock positions
  const lockPosResponses = await Promise.all(
    existingLockPdas.map((pda) => 
      axios.get(`${urlConfigs.CPMM_LOCK!}?id=${pda.toBase58()}`)
    )
  )

  // Display lock position details
  lockPosResponses.forEach((res) => {
    const data = res.data
    console.log(`Pool: ${data.poolInfo.mintA.symbol}-${data.poolInfo.mintB.symbol}`)
    console.log(`Lock Name: ${data.name} (Lock ID: ${data.id})`)
    console.log('Position Info:', data.positionInfo)
    console.log('\n')
  })
}

/** uncomment code below to execute */
// fetchAllPositions()
