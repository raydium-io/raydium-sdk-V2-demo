import { getOrderTick, TxVersion, printSimulate } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk } from '../config'
import Decimal from 'decimal.js'
import { PublicKey } from '@solana/web3.js'

async function openLimitOrder() {
  const raydium = await initSdk()

  const amount = new BN(10 ** 5)
  const poolId = new PublicKey('pool id')

  const { poolInfo, rpcData } = await raydium.clmm.getSimplePoolInfo(poolId)
  const inputMint = poolInfo.mintB.address
  const zeroForOne = inputMint === poolInfo.mintA.address

  const openPrice = new Decimal(1).div(4 / 3)

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
    noneIndex: 0, // optional: default 0
    // orderTick, // optional
    amount,
    txVersion: TxVersion.V0,
  })

  printSimulate([transaction])
  console.log((await raydium.connection.simulateTransaction(transaction, { commitment: 'confirmed' })).value.logs)
  // console.log(await execute());

  process.exit()
}

openLimitOrder()
