import axios from 'axios'
import { MintInfo } from './type'
import { MINT_LIST_URL } from './url'

export enum MintSortField {
  MarketCap = 'marketCap',
  New = 'new',
  LastTrade = 'lastTrade',
}
async function mintListApi() {
  // change platformId to your platform Id
  const platformId = 'PlatformWhiteList' // this is default list with all platforms
  const sort = 'lastTrade' // marketCap / new / lastTrade
  const nextPageId = '' // this can be got from list api response r.data.data.nextPageId

  const r = await axios.get<{
    id: string
    success: boolean
    msg?: string
    data: {
      rows: MintInfo[]
      nextPageId?: string
    }
  }>(
    `${MINT_LIST_URL}?platformId=${platformId}&sort=${sort}&size=100&&mintType=default&includeNsfw=false${
      nextPageId ? `&nextPageId=${nextPageId}` : ''
    }`
  )

  console.log(r.data.data)

  process.exit()
}
mintListApi()
