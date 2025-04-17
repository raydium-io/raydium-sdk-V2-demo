import axios from 'axios'
import { TRADE_HISTORY_URL } from './url'
import { TradeHistory } from './type'

async function tradeHistoryApi() {
  const poolId = 'pool id'

  const r = await axios.get<{
    id: string
    success: boolean
    msg?: string
    data: {
      rows: TradeHistory[]
    }
  }>(`${TRADE_HISTORY_URL}?poolId=${poolId}&limit=50`)

  console.log(r.data.data.rows)

  process.exit()
}
tradeHistoryApi()
