import {
  ApiV3PoolInfoConcentratedItem,
  CLMM_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
  PositionInfoLayout,
  printSimulate,
  getPdaLockClPositionIdV2,
  CLMM_LOCK_PROGRAM_ID,
  LockClPositionLayoutV2,
} from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { initSdk, txVersion } from '../config'
import { BN } from 'bn.js'

export const harvestLockedPosition = async () => {
  const raydium = await initSdk({ loadToken: true })

  const lockNftMint = new PublicKey('your locked position nft mint')
  const lockPositionId = getPdaLockClPositionIdV2(CLMM_LOCK_PROGRAM_ID, lockNftMint).publicKey
  const res = await raydium.connection.getAccountInfo(lockPositionId)
  const lockData = LockClPositionLayoutV2.decode(res!.data)

  /** code below can fetch all your locked clmm positions */
  //   await raydium.account.fetchWalletTokenAccounts()
  //   const possibleLockMints = raydium.account.tokenAccountRawInfos
  //     .filter((a) => a.accountInfo.amount.eq(new BN(1)) && !raydium.token.tokenMap.has(a.accountInfo.mint.toBase58()))
  //     .map((a) => a.accountInfo.mint)

  //   const possibleLockPositionId = possibleLockMints.map(
  //     (m) => getPdaLockClPositionIdV2(CLMM_LOCK_PROGRAM_ID, m).publicKey
  //   )
  //   const res = await raydium.connection.getMultipleAccountsInfo(possibleLockPositionId)
  //   const allLockPositions = res
  //     .map((r, idx) =>
  //       r
  //         ? {
  //             ...LockClPositionLayoutV2.decode(r.data),
  //             lockPositionId: possibleLockPositionId[idx],
  //           }
  //         : undefined
  //     )
  //     .filter(Boolean) as (ReturnType<typeof LockClPositionLayoutV2.decode> & { lockPositionId: PublicKey })[]
  //   if (!allLockPositions.length) throw new Error('you do not have any lock positions')
  //   const lockData = allLockPositions[0] // find out which lock position you want to harvest

  const { execute, transaction } = await raydium.clmm.harvestLockPosition({
    lockData,
    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //     units: 60000,
    //     microLamports: 100000,
    //   },
  })

  const { txId } = await execute({})
  console.log('harvested locked position :', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// harvestLockedPosition()
