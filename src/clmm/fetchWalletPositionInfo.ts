import { CLMM_PROGRAM_ID, getPdaPersonalPositionAddress, PositionInfoLayout } from '@raydium-io/raydium-sdk-v2'
import { initSdk, connection, owner } from '../config'
import { fetchPositionInfo } from './fetchPositionInfo'
import { AccountLayout, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'

export const fetchWalletPositionInfo = async () => {
  const raydium = await initSdk()
  const programId = CLMM_PROGRAM_ID // devent: DEVNET_PROGRAM_ID
  const positionInfo = await raydium.clmm.getOwnerPositionInfo({ programId })

  /** if you don't want to use sdk fetch owner all position info, try below to fetch by wallet */
  //   const wallet = new PublicKey('your wallet')
  //   const [ownerTokenAccountResp, ownerToken2022AccountResp] = await Promise.all([
  //     connection.getTokenAccountsByOwner(wallet, { programId: TOKEN_PROGRAM_ID }),
  //     connection.getTokenAccountsByOwner(wallet, { programId: TOKEN_2022_PROGRAM_ID }),
  //   ])
  //   const possibleMints: PublicKey[] = []
  //   for (const { account } of [...ownerTokenAccountResp.value, ...ownerToken2022AccountResp.value]) {
  //     const accountInfo = AccountLayout.decode(account.data)
  //     const { mint, amount } = accountInfo
  //     if (amount.toString() === '1') possibleMints.push(mint)
  //   }
  //   // devent: DEVNET_PROGRAM_ID
  //   const allPositionKey = possibleMints.map((key) => getPdaPersonalPositionAddress(CLMM_PROGRAM_ID, key).publicKey)
  //   const accountInfo = await connection.getMultipleAccountsInfo(allPositionKey)
  //   const allPosition: ReturnType<typeof PositionInfoLayout.decode>[] = []
  //   accountInfo.forEach((positionRes) => {
  //     if (!positionRes) return
  //     const position = PositionInfoLayout.decode(positionRes.data)
  //     allPosition.push(position)
  //   })

  for await (const position of positionInfo) {
    await fetchPositionInfo({
      positionNftMint: position.nftMint,
      positionData: position,
      raydium,
      programId,
      notExit: true,
    })
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
fetchWalletPositionInfo()
