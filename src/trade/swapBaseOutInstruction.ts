import { Transaction, PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'
import axios, { AxiosResponse } from 'axios'
import { connection, owner } from '../config'
import {
  API_URLS,
  ApiSwapV1Out,
  USDCMint,
  PoolKeys,
  getATAAddress,
  swapBaseOutAutoAccount,
  ALL_PROGRAM_ID,
  printSimulate,
  addComputeBudget,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'

export const swapBaseOutInstruction = async () => {
  const inputMint = USDCMint.toBase58()
  const outputMint = NATIVE_MINT.toBase58()
  const amount = 1000000
  const slippage = 0.5 // in percent, for this example, 0.5 means 0.5%
  const txVersion: 'LEGACY' | 'VO' = 'LEGACY'

  const { data: swapResponse } = await axios.get<ApiSwapV1Out>(
    `${
      API_URLS.SWAP_HOST
    }/compute/swap-base-out?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${
      slippage * 100
    }&txVersion=${txVersion}`
  )

  if (!swapResponse.success) {
    throw new Error(swapResponse.msg)
  }

  const res = await axios.get<AxiosResponse<PoolKeys[]>>(
    API_URLS.BASE_HOST + API_URLS.POOL_KEY_BY_ID + `?ids=${swapResponse.data.routePlan.map((r) => r.poolId).join(',')}`
  )

  const allMints = res.data.data.map((r) => [r.mintA, r.mintB]).flat()
  const [mintAProgram, mintBProgram] = [
    allMints.find((m) => m.address === inputMint)!.programId,
    allMints.find((m) => m.address === outputMint)!.programId,
  ]

  // get input/output token account ata
  const inputAccount = getATAAddress(owner.publicKey, new PublicKey(inputMint), new PublicKey(mintAProgram)).publicKey
  const outputAccount = getATAAddress(owner.publicKey, new PublicKey(outputMint), new PublicKey(mintBProgram)).publicKey

  const ins = swapBaseOutAutoAccount({
    programId: ALL_PROGRAM_ID.Router,
    wallet: owner.publicKey,
    inputAccount,
    outputAccount,
    routeInfo: swapResponse,
    poolKeys: res.data.data,
  })

  const { instructions } = addComputeBudget({
    units: 600000,
    microLamports: 6000000,
  })
  const recentBlockhash = (await connection.getLatestBlockhash()).blockhash
  const tx = new Transaction()
  instructions.forEach((ins) => tx.add(ins))
  tx.add(ins)
  tx.feePayer = owner.publicKey
  tx.recentBlockhash = recentBlockhash
  tx.sign(owner)

  printSimulate([tx])
}
swapBaseOutInstruction()
