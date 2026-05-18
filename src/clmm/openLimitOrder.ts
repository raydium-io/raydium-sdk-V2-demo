import {
  getOrderTick,
  printSimulate,
  getPdaExBitmapAccount,
  CLMM_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'
import { PublicKey } from '@solana/web3.js'

async function openLimitOrder() {
  const raydium = await initSdk()

  const amount = new BN(10 ** 5)
  const poolId = new PublicKey('pool id')

  const { poolInfo, rpcData } = await raydium.clmm.getSimplePoolInfo(poolId)
  const inputMint = poolInfo.mintB.address
  const zeroForOne = inputMint === poolInfo.mintA.address

  const openPrice = new Decimal('open price')

  const orderData = getOrderTick({
    baseIn: zeroForOne,
    mintADecimal: poolInfo.mintA.decimals,
    mintBDecimal: poolInfo.mintB.decimals,
    tickSpacing: poolInfo.config.tickSpacing,
    price: openPrice,
  })

  console.log({
    openPrice: openPrice.toString(),
    orderTick: orderData.tick,
    currentPrice: rpcData.currentPrice,
    currentTick: rpcData.tickCurrent,
  })

  if (zeroForOne && orderData.tick < rpcData.tickCurrent) throw new Error('sell price should be gt current price')
  if (!zeroForOne && orderData.tick > rpcData.tickCurrent) throw new Error('buy price should be lt current price')

  const { execute, extInfo, transaction } = await raydium.clmm.openLimitOrder({
    poolInfo,
    baseIn: zeroForOne,
    orderTick: orderData.tick,
    amount,
    // devnet: getPdaExBitmapAccount( DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID, new PublicKey(poolInfo.id)).publicKey,
    tickArrayBitmap: getPdaExBitmapAccount(CLMM_PROGRAM_ID, new PublicKey(poolInfo.id)).publicKey,
    // noneIndex: 0, // optional: default 0
    txVersion,
  })

  // printSimulate([transaction])
  const { txId } = await execute({ sendAndConfirm: true })
  console.log(`limit order opened: ${extInfo.limitOrder.toBase58()}`, {
    txId: `https://explorer.solana.com/tx/${txId}`,
  })

  process.exit()
}

/** uncomment code below to execute */
// openLimitOrder()
