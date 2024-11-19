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
    //   microLamports: 46591500,
    // },
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('farm staked:', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// unstake()
