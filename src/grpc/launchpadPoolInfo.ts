import { LAUNCHPAD_PROGRAM, LaunchpadConfig, LaunchpadPool } from '@raydium-io/raydium-sdk-v2'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import Client from '@triton-one/yellowstone-grpc'
import base58 from 'bs58'
import { connection, grpcToken, grpcUrl } from '../config'

/** devnet: DEV_LAUNCHPAD_PROGRAM */
const programId = LAUNCHPAD_PROGRAM

/**
 * Seed the caches from the accounts that already exist on chain, so that a pubkey arriving on the
 * stream for the first time really is a new account and not just the first trade we happened to
 * catch. Pools are fetched as bare addresses (dataSlice length 0) to keep the response small, but
 * it is still a full getProgramAccounts scan — set this to false if your rpc node rejects those,
 * and read every "create" as "first seen on this stream" instead.
 */
const seedExistingAccounts = true

type ConfigInfo = ReturnType<typeof LaunchpadConfig.decode>

/**
 * A pool's `mintProgramFlag` is a bitfield, not a boolean: bit0 describes mintA and bit1 describes
 * mintB, each holding 0 for the legacy Token program and 1 for Token-2022. Quote mints could only
 * be legacy mints until token2022 quote support shipped, so bit1 is the bit a token2022 quote pool
 * sets — code that tests the whole byte against 0 will read such a pool as a token2022 base mint.
 */
const MINT_A_BIT = 0
const MINT_B_BIT = 1

/** configs are cached because a pool alone does not tell you which quote mint its config allows */
const configCache: Map<string, ConfigInfo> = new Map()
const seenPools: Set<string> = new Set()
/** a config carries no token program flag for its mintB, so the owner is read once per mint */
const mintProgramCache: Map<string, PublicKey> = new Map()

async function launchpadPoolInfo() {
  if (seedExistingAccounts) await seedCaches()

  const client = new Client(grpcUrl, grpcToken, undefined)
  const rpcConnInfo = await client.subscribe()

  rpcConnInfo.on('data', (data) => {
    callback(data).catch((e) => console.error('handle account update failed:', e))
  })

  await new Promise<void>((resolve, reject) => {
    if (rpcConnInfo === undefined) throw Error('rpc conn error')
    rpcConnInfo.write(
      {
        slots: {},
        accounts: {
          configUpdate: {
            owner: [programId.toBase58()],
            account: [],
            filters: [{ datasize: `${LaunchpadConfig.span}` }],
            nonemptyTxnSignature: true,
          },
          poolUpdate: {
            owner: [programId.toBase58()],
            account: [],
            filters: [{ datasize: `${LaunchpadPool.span}` }],
            nonemptyTxnSignature: true,
          },
        },
        transactions: {},
        transactionsStatus: {},
        blocks: {},
        blocksMeta: {},
        accountsDataSlice: [],
        entry: {},
        commitment: 1,
      },
      (err: Error) => {
        if (err === null || err === undefined) {
          resolve()
        } else {
          reject(err)
        }
      }
    )
  }).catch((reason) => {
    console.error(reason)
    throw reason
  })

  console.log(`subscribed to launchpad ${programId.toBase58()}, waiting for config/pool updates`)
}

async function callback(_data: any) {
  if (_data.filters.includes('configUpdate')) await onConfig(_data.account)
  else if (_data.filters.includes('poolUpdate')) await onPool(_data.account)
}

async function onConfig(data: any) {
  const configId = base58.encode(data.account.pubkey)
  const configInfo = LaunchpadConfig.decode(data.account.data)

  const action = configCache.has(configId) ? 'update' : 'create'
  configCache.set(configId, configInfo)

  const mintBProgram = await getMintProgram(configInfo.mintB)

  console.log(
    `[config ${action}]`,
    configId,
    `slot=${data.slot}`,
    `index=${configInfo.index}`,
    `curveType=${configInfo.curveType}`,
    `tradeFeeRate=${configInfo.tradeFeeRate.toString()}`,
    `mintB=${configInfo.mintB.toBase58()}`,
    `mintB program=${mintBProgram ? tokenProgramName(mintBProgram) : 'unknown, mint account not found'}`
  )
}

async function onPool(data: any) {
  const poolId = base58.encode(data.account.pubkey)
  const poolInfo = LaunchpadPool.decode(data.account.data)

  const action = seenPools.has(poolId) ? 'update' : 'create'
  seenPools.add(poolId)

  // both token programs come straight out of the pool, no mint account fetch needed
  const mintAProgram = poolMintProgram(poolInfo.mintProgramFlag, MINT_A_BIT)
  const mintBProgram = poolMintProgram(poolInfo.mintProgramFlag, MINT_B_BIT)

  console.log(
    `[pool ${action}]`,
    poolId,
    `slot=${data.slot}`,
    `status=${poolInfo.status}`,
    `mintA=${poolInfo.mintA.toBase58()} (${tokenProgramName(mintAProgram)})`,
    `mintB=${poolInfo.mintB.toBase58()} (${tokenProgramName(mintBProgram)})`,
    `realA=${poolInfo.realA.toString()}`,
    `realB=${poolInfo.realB.toString()}`
  )

  const configInfo = configCache.get(poolInfo.configId.toBase58())
  if (!configInfo) {
    console.log(`  config ${poolInfo.configId.toBase58()} not cached yet`)
    return
  }

  // the config is the other half of the story: it is what fixes the quote mint for its pools, so
  // any disagreement here means one of the two reads is stale
  if (!configInfo.mintB.equals(poolInfo.mintB))
    console.warn(`  pool mintB != config mintB (${configInfo.mintB.toBase58()})`)

  const configMintBProgram = await getMintProgram(configInfo.mintB)
  if (configMintBProgram && !configMintBProgram.equals(mintBProgram))
    console.warn(
      `  pool flag says mintB is ${tokenProgramName(mintBProgram)},`,
      `but the mint account is owned by ${tokenProgramName(configMintBProgram)}`
    )
}

async function seedCaches() {
  const configs = await connection.getProgramAccounts(programId, {
    filters: [{ dataSize: LaunchpadConfig.span }],
  })
  for (const { pubkey, account } of configs) configCache.set(pubkey.toBase58(), LaunchpadConfig.decode(account.data))

  const pools = await connection.getProgramAccounts(programId, {
    dataSlice: { offset: 0, length: 0 },
    filters: [{ dataSize: LaunchpadPool.span }],
  })
  for (const { pubkey } of pools) seenPools.add(pubkey.toBase58())

  console.log(`seeded ${configCache.size} existing config(s) and ${seenPools.size} existing pool(s)`)
  for (const [configId, configInfo] of configCache) {
    const mintBProgram = await getMintProgram(configInfo.mintB)
    console.log(
      `  config ${configId}`,
      `index=${configInfo.index}`,
      `mintB=${configInfo.mintB.toBase58()}`,
      `mintB program=${mintBProgram ? tokenProgramName(mintBProgram) : 'unknown, mint account not found'}`
    )
  }
}

async function getMintProgram(mint: PublicKey): Promise<PublicKey | undefined> {
  const key = mint.toBase58()
  const cached = mintProgramCache.get(key)
  if (cached) return cached

  const mintAccount = await connection.getAccountInfo(mint)
  if (!mintAccount) return undefined

  mintProgramCache.set(key, mintAccount.owner)
  return mintAccount.owner
}

function poolMintProgram(mintProgramFlag: number, bit: number): PublicKey {
  return (mintProgramFlag >> bit) & 1 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
}

function tokenProgramName(programId: PublicKey): string {
  if (programId.equals(TOKEN_PROGRAM_ID)) return 'Token'
  if (programId.equals(TOKEN_2022_PROGRAM_ID)) return 'Token-2022'
  return `unknown program ${programId.toBase58()}`
}

launchpadPoolInfo()
