import { CLMM_PROGRAM_ID } from '@raydium-io/raydium-sdk-v2'
import { initSdk } from '../config'
import { fetchPositionInfo } from './fetchPositionInfo'

export const fetchWalletPositionInfo = async () => {
  const raydium = await initSdk()
  const programId = CLMM_PROGRAM_ID // devent: DEVNET_PROGRAM_ID
  const positionInfo = await raydium.clmm.getOwnerPositionInfo({ programId })

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
