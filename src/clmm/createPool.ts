import { CLMM_PROGRAM_ID } from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { initSdk, txVersion } from '../config'
import Decimal from 'decimal.js'
import BN from 'bn.js'

export const createPool = async () => {
  const raydium = await initSdk({ loadToken: true })

  const mint1 = await raydium.token.getTokenInfo('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R')
  const mint2 = await raydium.token.getTokenInfo('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB')
  const clmmConfigs = await raydium.api.getClmmConfigs()

  const { execute } = await raydium.clmm.createPool({
    programId: CLMM_PROGRAM_ID,
    mint1,
    mint2,
    ammConfig: { ...clmmConfigs[0], id: new PublicKey(clmmConfigs[0].id), fundOwner: '' },
    initialPrice: new Decimal(1),
    startTime: new BN(0),
    txVersion,
  })
  const { txId } = await execute()
  console.log('clmm pool created:', { txId })
}

/** uncomment code below to execute */
// createPool()
