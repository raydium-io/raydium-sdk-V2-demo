import { getOrderTick, TxVersion, printSimulate, LimitOrderLayout } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk } from '../config'
import Decimal from 'decimal.js'
import { PublicKey } from '@solana/web3.js'

async function increaseLimitOrder() {
  const raydium = await initSdk()

  const amount = new BN(10 ** 5)
  // const limitOrder = new PublicKey('xxxx')

  const poolId = new PublicKey('pool id')
  const { poolInfo } = await raydium.clmm.getSimplePoolInfo(poolId)
  const inputMint = poolInfo.mintA.address
  const zeroForOne = inputMint.toString() === poolInfo.mintA.address.toString()
  const openPrice = new Decimal(1.2)
  const orderData = getOrderTick({
    baseIn: zeroForOne,
    mintADecimal: poolInfo.mintA.decimals,
    mintBDecimal: poolInfo.mintB.decimals,
    tickSpacing: poolInfo.config.tickSpacing,
    price: openPrice,
  })

  // const limitOrder = getPdaLimitOrderAddress(
  //   CLMM_PROGRAM_ID,
  //   raydium.ownerPubKey,
  //   poolId,
  //   orderData.tick,
  //   zeroForOne,
  // ).publicKey;

  const limitOrder = new PublicKey('FvAdTxbqdiv5wnvQHsjtTycWTDCUYLS6XReJfrpAuvAw')
  const data = await raydium.connection.getAccountInfo(limitOrder)
  if (!data) throw new Error(`limit order ${limitOrder.toBase58()} not exist`)
  const limitOrderData = LimitOrderLayout.decode(data!.data)

  const { execute, extInfo, transaction } = await raydium.clmm.increaseLimitOrder({
    poolInfo,
    limitOrder,
    amount,
    txVersion: TxVersion.V0,
  })

  // printSimulate([transaction]);
  console.log((await raydium.connection.simulateTransaction(transaction, { commitment: 'confirmed' })).value.logs)
  // console.log(await execute());

  process.exit()
}

increaseLimitOrder()
