import {
  DEVNET_PROGRAM_ID,
  printSimulate,
  LAUNCHPAD_PROGRAM,
  getPdaCreatorVault,
  splAccountLayout,
  ApiV3Token,
} from '@raydium-io/raydium-sdk-v2'
import { initSdk, txVersion } from '../config'
import { PublicKey } from '@solana/web3.js'
import axios from 'axios'
import { MintInfo } from './type'
import Decimal from 'decimal.js'

export const collectAllCreatorFees = async () => {
  const raydium = await initSdk()

  const isDevnet = raydium.cluster === 'devnet'
  const host = isDevnet ? 'https://launch-mint-v1-devnet.raydium.io' : 'https://launch-mint-v1.raydium.io'

  const ownerCreatedMintRes: { id: string; success: boolean; data: { rows: MintInfo[]; nextPageId?: string } } = (
    await axios.get(`${host}/get/by/user?wallet=${raydium.ownerPubKey.toBase58()}&size=100`)
  ).data

  if (!ownerCreatedMintRes.data || !ownerCreatedMintRes.data.rows.length) {
    console.log('owner did not have any created mints')
    process.exit()
  }

  const allMintB: Record<string, ApiV3Token> = {}
  ownerCreatedMintRes.data.rows.forEach((d) => {
    allMintB[d.mintB.address] = d.mintB
  })
  const allMintBArray = Object.values(allMintB)

  // code below is to show how many pending fees, for display only

  //   const program = isDevnet ? DEVNET_PROGRAM_ID.LAUNCHPAD_PROGRAM : LAUNCHPAD_PROGRAM
  //   const allMintBVault = allMintBArray.map(
  //     (mint) => getPdaCreatorVault(program, raydium.ownerPubKey, new PublicKey(mint.address)).publicKey
  //   )
  //   const vaultRes = await raydium.connection.getMultipleAccountsInfo(allMintBVault)
  //   const allPendingFees: Map<string, Decimal> = new Map()
  //   res.data.rows.forEach((d) => {
  //     allMintB[d.mintB.address] = d.mintB
  //   })
  //   vaultRes.forEach((data, idx) => {
  //     if (!data) return
  //     const mint = allMintBArray[idx]
  //     const feeAmount = new Decimal(splAccountLayout.decode(data.data).amount.toString()).div(10 ** mint.decimals)
  //     if (allPendingFees.has(mint.address))
  //       allPendingFees.set(mint.address, allPendingFees.get(mint.address)!.add(feeAmount))
  //     else allPendingFees.set(mint.address, feeAmount)
  //   })
  //   Array.from(allPendingFees.entries()).forEach((feeData) => {
  //     console.log(`== ${allMintB[feeData[0]].symbol} pending fees: ${feeData[1].toString()} ==`)
  //   })

  const { transactions, execute } = await raydium.launchpad.claimMultipleCreatorFee({
    // currently we only have SOL as mintB, so this array should only have 1 item
    mintBList: allMintBArray.map((mint) => ({
      pubKey: new PublicKey(mint.address),
      programId: new PublicKey(mint.programId),
    })),
    txVersion,
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 600000,
    // },
  })

  printSimulate(transactions)

  try {
    const sentInfo = await execute({ sequentially: true })
    console.log(sentInfo)
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// collectAllCreatorFees()
