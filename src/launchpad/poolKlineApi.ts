import axios from 'axios'
import { LAUNCH_KLINE_URL } from './url'
import { KlinePoint } from './type'

async function poolKlineApi() {
  const poolId = 'pool Id'
  const interval = '5' // available for 1 / 5 / 15

  const r = await axios.get<{
    id: string
    success: boolean
    msg?: string
    data: {
      rows: KlinePoint[]
    }
  }>(`${LAUNCH_KLINE_URL}?poolId=${poolId}&interval=${interval}m&limit=300`)

  console.log(r.data.data.rows)

  process.exit()
}
poolKlineApi()
