import {
  API_URLS,
  DEV_API_URLS,
  getCpLockPda,
  LOCK_CPMM_PROGRAM,
  ALL_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
  CREATE_CPMM_POOL_PROGRAM,
  CpmmKeys,
  ClmmPositionLayout,
  CLMM_PROGRAM_ID,
  TxVersion,
  LockClPositionLayoutV2,
  printSimulate,
} from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { initSdk } from '../config'
import { BN } from 'bn.js'

interface ClmmLockData {
  [poolId: string]: { [nftMint: string]: ReturnType<typeof LockClPositionLayoutV2.decode> }
}

export const fetchAllPositionsV2 = async () => {
  const raydium = await initSdk({})
  await raydium.account.fetchWalletTokenAccounts()

  const lpBalances = await raydium.liquidity.fetchPoolBalances()

  lpBalances.forEach((l) => {
    if (
      l.poolInfo.programId === CREATE_CPMM_POOL_PROGRAM.toBase58() ||
      l.poolInfo.programId === DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM.toBase58()
    )
      console.log('cpmm pool')
    else console.log('amm pool')
  })
  const lockedCpmmBalances = await raydium.cpmm.fetchCpmmLockBalances()

  // const k = await raydium.api.fetchPoolKeysById({ idList: lock.map((l) => l.poolInfo.id) })
  // const { transactions } = await raydium.cpmm.harvestMultiLockLp({
  //   lockInfo: lock.map((l, idx) => ({
  //     poolInfo: l.poolInfo,
  //     poolKeys: k[idx] as CpmmKeys,
  //     nftMint: l.nftMint,
  //     lpFeeAmount: new BN(l.positionInfo.unclaimedFee.lp * 10 ** l.poolInfo.lpMint.decimals),
  //     // devnet need to pass these program
  //     // programId: DEVNET_PROGRAM_ID.LOCK_CPMM_PROGRAM,
  //     // authProgram: DEVNET_PROGRAM_ID.LOCK_CPMM_AUTH,
  //     // cpmmProgram: {
  //     //   programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
  //     //   authProgram: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_AUTH,
  //     // },
  //   })),
  // })

  const farmBalance = await raydium.farm.fetchFarmBalances()

  // const { transactions } = await raydium.farm.harvestAllRewards({
  //   farmInfoList: farmBalance
  //     .filter((f) => !!f && f.pendingRewards.some((r) => r.amount !== "0"))
  //     .map((f) => f.farmInfo)
  //     .reduce(
  //       (acc, cur) => ({
  //         ...acc,
  //         [cur.id]: cur,
  //       }),
  //       {},
  //     ),
  //   txVersion: TxVersion.V0,
  // });

  const clmmPos = await raydium.clmm.getOwnerPositionInfo({})
  const clmmPools = await raydium.api.fetchPoolById({ ids: clmmPos.map((l) => l.poolId.toString()).join(',') })

  const allPositions = clmmPos.reduce(
    (acc, cur) => ({
      ...acc,
      [cur.poolId.toBase58()]: acc[cur.poolId.toBase58()] ? acc[cur.poolId.toBase58()].concat(cur) : [cur],
    }),
    {} as Record<string, ClmmPositionLayout[]>,
  )

  const lockData: ClmmLockData = {}
  const lockedClmmPos = await raydium.clmm.getOwnerLockedPositionInfo({})
  lockedClmmPos.forEach((pos) => {
    lockData[pos.position.poolId.toBase58()] = {
      ...(lockData[pos.position.poolId.toBase58()] || {}),
      [pos.position.nftMint.toBase58()]: pos.lockInfo,
    }
  })

  // const { transactions } = await raydium.clmm.harvestAllRewards({
  //   allPoolInfo: clmmPools.reduce(
  //     (acc, cur) => ({
  //       ...acc,
  //       [cur.id]: cur,
  //     }),
  //     {},
  //   ),
  //   allPositions,
  //   lockInfo: lockData,
  //   ownerInfo: {
  //     useSOLBalance: true,
  //   },
  //   programId: CLMM_PROGRAM_ID, // devnet: DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID
  //   txVersion: TxVersion.V0,
  //   // optional: set up priority fee here
  //   // computeBudgetConfig: {
  //   //   units: 600000,
  //   //   microLamports: 46591500,
  //   // },
  // })

  console.log({
    lpBalances,
    lockedCpmmBalances,
    farmBalance,
    clmmPos,
    lockedClmmPos,
  })
}

/** uncomment code below to execute */
fetchAllPositionsV2()
