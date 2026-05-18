import { PublicKey } from '@solana/web3.js'
import { initSdk, txVersion } from '../config'

async function settleAllLimitOrder() {
  const raydium = await initSdk()

  const { execute, transactions } = await raydium.clmm.settleAllLimitOrder({
    limitOrders: [new PublicKey('limit order pda')],
    txVersion,
  })

  // printSimulate([transaction]);

  const { txIds } = await execute({ sequentially: true })
  console.log('limit orders settled', { txIds })

  process.exit()
}

/** uncomment code below to execute */
// settleAllLimitOrder()
