import { API_URLS, DEV_API_URLS } from '@raydium-io/raydium-sdk-v2'
import { owner, cluster } from '../config'
import axios from 'axios'

async function fetchOpenLimitOrders() {
  const host = cluster === 'devnet' ? DEV_API_URLS.TEMP_HOST : API_URLS.TEMP_HOST
  const r = await axios.get(host + `/limit-order/order/list?wallet=${owner.publicKey.toBase58()}`)
  console.log('current open orders:')
  console.log(r.data.data.rows)
}
fetchOpenLimitOrders()
