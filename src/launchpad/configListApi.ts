import axios from 'axios'
import { ApiV3Token } from '@raydium-io/raydium-sdk-v2'
import { ConfigInfo } from './type'
import { CONFIG_LIST_URL } from './url'

async function configListApi() {
  const r = await axios.get<{
    id: string
    success: boolean
    msg?: string
    data: {
      data: { key: ConfigInfo; mintInfoB: ApiV3Token }[]
    }
  }>(CONFIG_LIST_URL)

  console.log(
    r.data.data.data.map((d) => ({
      configInfo: d.key,
      mintBInfo: d.mintInfoB,
    }))
  )

  process.exit()
}
configListApi()
