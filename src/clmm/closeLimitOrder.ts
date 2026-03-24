import { printSimulate, TxVersion } from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { initSdk } from '../config'
const CLMM_PROGRAM_ID = new PublicKey('AWbDSWgBr44rbUKE2VN5tLx3tHWJ5SDZBPLuKg8ucthH')

async function settleLimitOrder() {
  const raydium = await initSdk()

  const { execute, extInfo, transaction } = await raydium.clmm.closeLimitOrder({
    programId: CLMM_PROGRAM_ID,
    limitOrder: new PublicKey('order pda'),
    autoWithdraw: true,
    slippage: 100,
    txVersion: TxVersion.V0,
  })

  printSimulate([transaction])
  console.log((await raydium.connection.simulateTransaction(transaction, { commitment: 'confirmed' })).value.logs)
  // console.log(await execute());

  process.exit()
}

settleLimitOrder()
