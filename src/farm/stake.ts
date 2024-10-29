import { initSdk, txVersion } from '../config'

export const stake = async () => {
  const raydium = await initSdk()
  const targetFarm = 'CHYrUBX2RKX8iBg7gYTkccoGNBzP44LdaazMHCLcdEgS' // RAY-USDC farm

  // note: api doesn't support get devnet farm info
  const farmInfo = (await raydium.api.fetchFarmInfoById({ ids: targetFarm }))[0]

  const amount = raydium.account.tokenAccountRawInfos.find(
    (a) => a.accountInfo.mint.toBase58() === farmInfo.lpMint.address
  )?.accountInfo.amount

  if (!amount || amount.isZero()) throw new Error('user do not have lp amount')

  const { execute } = await raydium.farm.deposit({
    farmInfo,
    amount,
    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 100000000,
    // },
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('farm deposited:', { txId: `https://explorer.solana.com/tx/${txId}` })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// stake()
