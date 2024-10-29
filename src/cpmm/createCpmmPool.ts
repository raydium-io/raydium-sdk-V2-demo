import {
  CREATE_CPMM_POOL_PROGRAM,
  CREATE_CPMM_POOL_FEE_ACC,
  DEVNET_PROGRAM_ID,
  getCpmmPdaAmmConfigId,
} from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import { initSdk, txVersion } from '../config'

export const createPool = async () => {
  const raydium = await initSdk({ loadToken: true })

  // check token list here: https://api-v3.raydium.io/mint/list
  // RAY
  const mintA = await raydium.token.getTokenInfo('4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R')
  // USDC
  const mintB = await raydium.token.getTokenInfo('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

  /**
   * you also can provide mint info directly like below, then don't have to call token info api
   *  {
      address: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      decimals: 6,
    } 
   */

  const feeConfigs = await raydium.api.getCpmmConfigs()

  if (raydium.cluster === 'devnet') {
    feeConfigs.forEach((config) => {
      config.id = getCpmmPdaAmmConfigId(DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, config.index).publicKey.toBase58()
    })
  }

  const { execute, extInfo } = await raydium.cpmm.createPool({
    // poolId: // your custom publicKey, default sdk will automatically calculate pda pool id
    programId: CREATE_CPMM_POOL_PROGRAM, // devnet: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM
    poolFeeAccount: CREATE_CPMM_POOL_FEE_ACC, // devnet:  DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC
    mintA,
    mintB,
    mintAAmount: new BN(100),
    mintBAmount: new BN(100),
    startTime: new BN(0),
    feeConfig: feeConfigs[0],
    associatedOnly: false,
    ownerInfo: {
      useSOLBalance: true,
    },
    txVersion,
    // optional: set up priority fee here
    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 100000000,
    // },
  })

  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const { txId } = await execute({ sendAndConfirm: true })
  console.log('pool created', {
    txId,
    poolKeys: Object.keys(extInfo.address).reduce(
      (acc, cur) => ({
        ...acc,
        [cur]: extInfo.address[cur as keyof typeof extInfo.address].toString(),
      }),
      {}
    ),
  })
  process.exit() // if you don't want to end up node execution, comment this line
}

/** uncomment code below to execute */
// createPool()
