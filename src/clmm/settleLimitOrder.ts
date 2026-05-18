import { printSimulate } from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { initSdk, txVersion } from '../config'

async function settleLimitOrder() {
  const raydium = await initSdk()

  const { execute, extInfo, transaction } = await raydium.clmm.settleLimitOrder({
    limitOrder: new PublicKey('limit order pda'),
    txVersion,
  })

  const { txId } = await execute({ sendAndConfirm: true })
  console.log('settled limit order:', { txId: `https://explorer.solana.com/tx/${txId}` })

  process.exit()
}

/** uncomment code below to execute */
// settleLimitOrder()
