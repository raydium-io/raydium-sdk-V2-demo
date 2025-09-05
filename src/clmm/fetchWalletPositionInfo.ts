import {
  CLMM_PROGRAM_ID,
  CLMM_LOCK_PROGRAM_ID,
  getPdaPersonalPositionAddress,
  PositionInfoLayout,
  DEVNET_PROGRAM_ID,
  getPdaLockClPositionIdV2,
  LockClPositionLayoutV2,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk, connection, owner } from '../config'
import { fetchPositionInfo } from './fetchPositionInfo'
import { AccountLayout, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'

export const fetchWalletPositionInfo = async () => {
  const raydium = await initSdk()

  const programId = CLMM_PROGRAM_ID // devnet: DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID
  const positionInfo = await raydium.clmm.getOwnerPositionInfo({ programId })
  const lockPositionInfo = await raydium.clmm.getOwnerLockedPositionInfo({ programId: CLMM_LOCK_PROGRAM_ID }) // devnet:  DEVNET_PROGRAM_ID.CLMM_LOCK_PROGRAM_ID

  /** if you don't want to use sdk fetch owner all position info, try below to fetch by wallet */
  // const wallet = new PublicKey('your wallet')
  // const [ownerTokenAccountResp, ownerToken2022AccountResp] = await Promise.all([
  //   connection.getTokenAccountsByOwner(wallet, { programId: TOKEN_PROGRAM_ID }),
  //   connection.getTokenAccountsByOwner(wallet, { programId: TOKEN_2022_PROGRAM_ID }),
  // ])
  // const possibleMints: PublicKey[] = []
  // for (const { account } of [...ownerTokenAccountResp.value, ...ownerToken2022AccountResp.value]) {
  //   const accountInfo = AccountLayout.decode(account.data)
  //   const { mint, amount } = accountInfo
  //   if (amount.toString() === '1') possibleMints.push(mint)
  // }

  // // devnet: DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID
  // const allPositionKey = possibleMints.map((key) => getPdaPersonalPositionAddress(CLMM_PROGRAM_ID, key).publicKey)
  // const accountInfo = await connection.getMultipleAccountsInfo(allPositionKey)
  // const allPosition: ReturnType<typeof PositionInfoLayout.decode>[] = []
  // accountInfo.forEach((positionRes) => {
  //   if (!positionRes) return
  //   const position = PositionInfoLayout.decode(positionRes.data)
  //   allPosition.push(position)
  // })

  // /** fetch locked info */
  // // devnet: DEVNET_PROGRAM_ID.CLMM_LOCK_PROGRAM_ID
  // const allLockedKey = possibleMints.map((key) => getPdaLockClPositionIdV2(CLMM_LOCK_PROGRAM_ID, key).publicKey)
  // const lockedAccountInfo = await connection.getMultipleAccountsInfo(allLockedKey)
  // const allLocked: ReturnType<typeof LockClPositionLayoutV2.decode>[] = []
  // lockedAccountInfo.forEach((positionRes) => {
  //   if (!positionRes) return
  //   const position = LockClPositionLayoutV2.decode(positionRes.data)
  //   allLocked.push(position)
  // })
  // /** fetch locked Position info */
  // const allLockedPosition: ReturnType<typeof PositionInfoLayout.decode>[] = []
  // const lockedPositionAccountInfo = await connection.getMultipleAccountsInfo(allLocked.map((p) => p.positionId))
  // lockedPositionAccountInfo.forEach((positionRes) => {
  //   if (!positionRes) return
  //   const position = PositionInfoLayout.decode(positionRes.data)
  //   allLockedPosition.push(position)
  // })

  for await (const position of positionInfo) {
    await fetchPositionInfo({
      positionNftMint: position.nftMint,
      positionData: position,
      raydium,
      programId,
      notExit: true,
    })
  }

  for await (const position of lockPositionInfo) {
    await fetchPositionInfo({
      positionNftMint: position.lockInfo.positionId,
      isLock: true,
      positionData: position.position,
      raydium,
      programId: CLMM_LOCK_PROGRAM_ID,
      notExit: true,
    })
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
fetchWalletPositionInfo()
