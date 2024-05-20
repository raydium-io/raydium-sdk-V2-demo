import { initSdk, txVersion } from '../config'
import BN from 'bn.js'

export const harvest = async () => {
  const raydium = await initSdk()
  const targetFarm = 'CHYrUBX2RKX8iBg7gYTkccoGNBzP44LdaazMHCLcdEgS' // RAY-USDC farm

  const farmInfo = (await raydium.api.fetchFarmInfoById({ ids: targetFarm }))[0]

  const { execute } = await raydium.farm.withdraw({
    farmInfo,
    amount: new BN(0),
    txVersion,
  })

  const { txId } = await execute()
  console.log('farm harvested:', { txId })
}

/** uncomment code below to execute */
// harvest()
