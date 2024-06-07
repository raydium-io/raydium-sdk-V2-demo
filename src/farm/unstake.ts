import { initSdk, txVersion } from '../config'
import BN from 'bn.js'

export const unstake = async () => {
  const raydium = await initSdk()
  const targetFarm = 'CHYrUBX2RKX8iBg7gYTkccoGNBzP44LdaazMHCLcdEgS' // RAY-USDC farm

  // note: api doesn't support get devnet farm info
  const farmInfo = (await raydium.api.fetchFarmInfoById({ ids: targetFarm }))[0]

  const readyUnStakeAmount = new BN(100)

  const { execute } = await raydium.farm.withdraw({
    farmInfo,
    amount: readyUnStakeAmount,
    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 100000000,
    // },
  })

  const { txId } = await execute()
  console.log('farm staked:', { txId })
}

/** uncomment code below to execute */
// unstake()
