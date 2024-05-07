import { Raydium } from 'test-rrr-sdk'
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js'
import bs58 from 'bs58'

export const owner: Keypair = Keypair.fromSecretKey(bs58.decode('<YOUR_WALLET_SECRET_KEY>'))
export const connection = new Connection(clusterApiUrl('devnet')) //<YOUR_RPC_URL>

let raydium: Raydium | undefined
export const initSdk = async () => {
  if (raydium) return raydium
  raydium = await Raydium.load({
    owner,
    connection,
    cluster: 'devnet',
    disableFeatureCheck: true,
    disableLoadToken: true,
  })
  return raydium
}
