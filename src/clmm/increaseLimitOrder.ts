import { getOrderTick, TxVersion, printSimulate, LimitOrderLayout } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'
import { PublicKey } from '@solana/web3.js'

async function increaseLimitOrder() {
  const raydium = await initSdk()

  const amount = new BN(10 ** 5)
  const limitOrder = new PublicKey('limit order pda')

  const poolId = new PublicKey('pool id')
  const { poolInfo } = await raydium.clmm.getSimplePoolInfo(poolId)

  const { execute, extInfo, transaction } = await raydium.clmm.increaseLimitOrder({
    poolInfo,
    limitOrder,
    amount,
    txVersion,
  })

  // printSimulate([transaction]);

  const { txId } = await execute({ sendAndConfirm: true })
  console.log('limit order increased:', { txId: `https://explorer.solana.com/tx/${txId}` })

  process.exit()
}

/** uncomment code below to execute */
// increaseLimitOrder()
