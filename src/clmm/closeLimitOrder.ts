import { DEVNET_PROGRAM_ID, printSimulate } from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { initSdk, txVersion } from '../config'

async function closeLimitOrder() {
  const raydium = await initSdk()

  const { execute, extInfo, transaction } = await raydium.clmm.closeLimitOrder({
    // programId: DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID, / /devnet
    limitOrder: new PublicKey('order pda'),
    autoWithdraw: true,
    slippage: 100,
    txVersion,
  })

  printSimulate([transaction])

  const { txId } = await execute({ sendAndConfirm: true })
  console.log('limit order closed:', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit()
}

/** uncomment code below to execute */
// closeLimitOrder()
