import { printSimulate, LimitOrderLayout } from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import { PublicKey } from '@solana/web3.js'

async function decreaseLimitOrder() {
  const raydium = await initSdk()

  const limitOrder = new PublicKey('order pda')

  const data = await raydium.connection.getAccountInfo(limitOrder, 'confirmed')
  if (!data) throw new Error(`limit order ${limitOrder.toBase58()} not exist`)
  const limitOrderData = LimitOrderLayout.decode(data!.data)

  const poolId = limitOrderData.poolId
  const { poolInfo } = await raydium.clmm.getSimplePoolInfo(poolId)

  const decreaseAmount = limitOrderData.totalAmount.sub(limitOrderData.filledAmount).divn(2)
  const { execute, extInfo, transaction } = await raydium.clmm.decreaseLimitOrder({
    poolInfo,
    limitOrder,
    amount: decreaseAmount,
    slippage: 100,
    txVersion,
  })

  printSimulate([transaction])
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('limit order decreased:', { txId: `https://explorer.solana.com/tx/${txId}` })

  process.exit()
}

/** uncomment code below to execute */
// decreaseLimitOrder()
