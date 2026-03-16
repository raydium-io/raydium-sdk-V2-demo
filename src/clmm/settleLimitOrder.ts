import {
  getPdaLimitOrderAddress,
  getPdaLimitOrderNonceAddress,
  LimitOrderNonceLayout,
  printSimulate,
  TxVersion,
} from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { initSdk } from '../config'
const CLMM_PROGRAM_ID = new PublicKey('AWbDSWgBr44rbUKE2VN5tLx3tHWJ5SDZBPLuKg8ucthH')

async function settleLimitOrder() {
  const raydium = await initSdk()

  const poolId = new PublicKey('pool id')

  const limitOrderNonce = getPdaLimitOrderNonceAddress(CLMM_PROGRAM_ID, raydium.ownerPubKey, 0).publicKey
  const res = await raydium.connection.getAccountInfo(limitOrderNonce)
  const orderNonce = res ? LimitOrderNonceLayout.decode(res.data).orderNonce : new BN(0)

  const limitOrder = getPdaLimitOrderAddress(
    CLMM_PROGRAM_ID,
    raydium.ownerPubKey,
    limitOrderNonce,
    orderNonce,
  ).publicKey

  // const data = await connection.getAccountInfo(limitOrder);
  // if (!data) throw new Error(`limit order ${limitOrder.toBase58()} not exist`);
  // const limitOrderData = LimitOrderLayout.decode(data!.data);

  const { execute, extInfo, transaction } = await raydium.clmm.settleLimitOrder({
    limitOrder,
    txVersion: TxVersion.V0,
  })

  printSimulate([transaction])
  console.log((await raydium.connection.simulateTransaction(transaction, { commitment: 'confirmed' })).value.logs)
  // console.log(await execute());

  process.exit()
}

settleLimitOrder()
